import type { FastifyInstance } from 'fastify';
import { getConnection, getProcessDataTable, getProcessColumnMap, getColumns, getDashboardDateStrings, escapeSqlId, isSafeColumnName } from '../../lib/dashboard-db.js';
import { requireAuth } from '../../middlewares/auth.js';

const MAX_LOTS = 30;

function pickParam(params: Record<string, number>, ...candidates: string[]): number | null {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '_');
  for (const cand of candidates) {
    const key = Object.keys(params).find(
      (k) => norm(k) === norm(cand) || norm(k).includes(norm(cand)) || norm(cand).includes(norm(k))
    );
    if (key != null) return params[key];
  }
  return null;
}

type LotStatus = {
  lotId: string;
  passFailResult: string | null;
  lithiumInput: number | null;
  addictiveRatio: number | null;
  processTime: number | null;
  humidity: number | null;
  tankPressure: number | null;
  recordCount: number;
  latestDate: string | null;
  params: Record<string, number>;
};

export async function registerDashboardLotStatus(app: FastifyInstance) {
  app.get('/api/dashboard/lot-status', async (request, reply) => {
    const user = await requireAuth(request as any);
    if (!user) return reply.code(401).send({ success: false, error: 'Unauthorized', lots: [] });

    const q = (request.query || {}) as any;
    const debug = String(q.debug) === '1';
    const noDateFilter = String(q.noDate) === '1';
    const showAll = String(q.all) === '1';
    const period = q.period ? String(q.period) : '';

    let conn: any;
    try {
      conn = await getConnection();
      const tableName = await getProcessDataTable(conn);
      const map = await getProcessColumnMap(conn, tableName);
      const { lotCol, dateCol, resultCol: rawResultCol, defectCol, numericCols } = map;
      const resultCol =
        rawResultCol || (defectCol && !/rate|percent|pct/i.test(defectCol) ? defectCol : null);

      if (!lotCol) {
        await conn.end();
        return reply.send({ success: true, lots: [], message: 'NO_LOT_COLUMN' });
      }

      const selectParts: string[] = [`${escapeSqlId(lotCol)} as lot_id`, 'COUNT(*) as record_count'];
      if (dateCol) selectParts.push(`MAX(${escapeSqlId(dateCol)}) as latest_date`);
      if (resultCol && dateCol) {
        selectParts.push(
          `SUBSTRING_INDEX(GROUP_CONCAT(CAST(${escapeSqlId(resultCol)} AS CHAR) ORDER BY ${escapeSqlId(dateCol)} DESC), ',', 1) as latest_result`
        );
      } else if (resultCol) {
        selectParts.push(`MAX(${escapeSqlId(resultCol)}) as latest_result`);
      }

      const excludeFromParams = new Set([lotCol, dateCol, resultCol].filter(Boolean) as string[]);
      const knownParamNames = [
        'process_time',
        'process time',
        'ProcessTime',
        'processing_time',
        'humidity',
        'tank_pressure',
        'lithium_input',
        'additive_ratio',
      ];
      const normCol = (c: string) => c.toLowerCase().replace(/\s+/g, '_');
      const normColNoUnderscore = (c: string) => normCol(c).replace(/_/g, '');
      const allColumns = await getColumns(conn, tableName);
      const numericSet = new Set((numericCols || []).filter((c) => !excludeFromParams.has(c)));
      const extraCols = allColumns
        .map((c) => c.name)
        .filter(
          (name) =>
            !excludeFromParams.has(name) &&
            !numericSet.has(name) &&
            knownParamNames.some(
              (known) =>
                normCol(name) === normCol(known) ||
                normCol(name).includes(normCol(known)) ||
                normCol(known).includes(normCol(name)) ||
                normColNoUnderscore(name) === normColNoUnderscore(known)
            )
        );
      const paramCols = [...Array.from(numericSet), ...extraCols].filter(isSafeColumnName);
      for (const col of paramCols) {
        const alias = col.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '_').replace(/^$/, 'p');
        if (numericSet.has(col)) {
          selectParts.push(`AVG(${escapeSqlId(col)}) as ${escapeSqlId('param_' + alias)}`);
        } else {
          selectParts.push(`AVG(CAST(${escapeSqlId(col)} AS DECIMAL(20,6))) as ${escapeSqlId('param_' + alias)}`);
        }
      }

      const { todayStr, weekStartStr, weekEndStr, firstOfMonth, lastOfMonthStr } = getDashboardDateStrings();

      let dateCondition = '';
      let dateParams: string[] = [];
      if (dateCol && !noDateFilter) {
        if (period === 'day') {
          dateCondition = `WHERE DATE(${escapeSqlId(dateCol)}) = ?`;
          dateParams = [todayStr];
        } else if (period === 'week') {
          dateCondition = `WHERE DATE(${escapeSqlId(dateCol)}) >= ? AND DATE(${escapeSqlId(dateCol)}) <= ?`;
          dateParams = [weekStartStr, weekEndStr];
        } else if (period === 'month') {
          dateCondition = `WHERE DATE(${escapeSqlId(dateCol)}) >= ? AND DATE(${escapeSqlId(dateCol)}) <= ?`;
          dateParams = [firstOfMonth, lastOfMonthStr];
        } else {
          dateCondition = `WHERE ${escapeSqlId(dateCol)} >= DATE_SUB(NOW(), INTERVAL 365 DAY)`;
        }
      }

      const orderBy = 'ORDER BY CAST(lot_id AS UNSIGNED) ASC, lot_id ASC';
      const havingClause =
        debug || showAll || !resultCol
          ? ''
          : `HAVING (CONVERT(latest_result, SIGNED) = 1 OR TRIM(CONVERT(latest_result, CHAR)) = '1')`;
      const limitClause =
        period === 'day' || period === 'week' || period === 'month' ? '' : `LIMIT ${debug ? 100 : MAX_LOTS}`;

      const mainQuery = `SELECT ${selectParts.join(', ')}
       FROM ${escapeSqlId(tableName)}
       ${dateCondition}
       GROUP BY ${escapeSqlId(lotCol)}
       ${havingClause}
       ${orderBy}
       ${limitClause}`.trim();
      const [rows]: any = dateParams.length > 0 ? await conn.query(mainQuery, dateParams) : await conn.query(mainQuery);

      const lots: LotStatus[] = (rows || []).map((r: any) => {
        const params: Record<string, number> = {};
        const rowKeys = Object.keys(r);
        for (const col of paramCols) {
          const paramAlias = col.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '_').replace(/^$/, 'p');
          const alias = `param_${paramAlias}`;
          const key = rowKeys.find((k) => k.toLowerCase() === alias.toLowerCase()) ?? alias;
          const val = r[key];
          if (val != null && !Number.isNaN(Number(val))) {
            params[col] = Number(val);
          }
        }

        let passFailResult: string | null = null;
        if (r.latest_result != null) {
          const v = String(r.latest_result).trim();
          if (v === '0') passFailResult = '합격';
          else if (v === '1') passFailResult = '불합격';
          else passFailResult = v;
        }

        return {
          lotId: String(r.lot_id ?? ''),
          passFailResult,
          lithiumInput: pickParam(params, 'lithium_input'),
          addictiveRatio: pickParam(params, 'addictive_ratio', 'additive_ratio'),
          processTime: pickParam(params, 'process_time', 'process time', 'ProcessTime', 'processing_time', 'processtime'),
          humidity: pickParam(params, 'humidity'),
          tankPressure: pickParam(params, 'tank_pressure'),
          recordCount: Number(r.record_count ?? 0),
          latestDate: r.latest_date != null ? String(r.latest_date) : null,
          params,
        };
      });

      const firstRow = Array.isArray(rows) && rows.length > 0 ? (rows as Record<string, unknown>[])[0] : null;
      const firstRowParamKeys = firstRow ? Object.keys(firstRow).filter((k) => k.startsWith('param_')) : [];
      const debugInfo =
        debug || process.env.NODE_ENV === 'development'
          ? {
              tableName,
              lotCol,
              dateCol,
              resultCol,
              paramCols,
              firstRowParamKeys,
              hasDateFilter: !!dateCol && !noDateFilter,
              noDateFilterUsed: noDateFilter,
              totalReturned: (rows || []).length,
            }
          : undefined;

      await conn.end();
      return reply.send({ success: true, lots, totalLots: lots.length, _debug: debugInfo });
    } catch (e: unknown) {
      const err = e as { sql?: string; sqlMessage?: string; code?: string };
      console.error('[dashboard/lot-status] DB error:', e);
      if (err?.sql) console.error('[dashboard/lot-status] SQL:', err.sql);
      if (err?.sqlMessage) console.error('[dashboard/lot-status] sqlMessage:', err.sqlMessage);
      const msg = e instanceof Error ? e.message : String(e);
      request.log.error({ err: e }, 'Lot status API error');
      if (conn) try { await conn.end(); } catch {}
      return reply.code(500).send({ success: false, error: msg, lots: [] });
    }
  });
}

