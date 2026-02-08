import type { FastifyInstance } from 'fastify';
import { getConnection, getProcessDataTable, getProcessColumnMap, getColumns } from '../../lib/dashboard-db.js';
import { requireAuth } from '../../middlewares/auth.js';

const MAX_ROWS = 5000;
const DEFAULT_BINS = 5;

/** 구간별 불량률: 파라미터별로 값 구간을 나누고 각 구간의 평균 불량률 반환 */
export async function registerDashboardDefectByIntervals(app: FastifyInstance) {
  app.get('/api/dashboard/defect-by-intervals', async (request, reply) => {
    const user = await requireAuth(request as any);
    if (!user) return reply.code(401).send({ success: false, error: 'Unauthorized' });

    const q = (request.query || {}) as any;
    const params = q.params ? (Array.isArray(q.params) ? q.params : String(q.params).split(',')).map((p: string) => p.trim()).filter(Boolean) : null;
    const numBins = Math.min(10, Math.max(2, parseInt(String(q.bins), 10) || DEFAULT_BINS));

    let conn: any;
    try {
      conn = await getConnection();
      const processTable = await getProcessDataTable(conn);
      const map = await getProcessColumnMap(conn, processTable);
      const cols = await getColumns(conn, processTable);
      const numericCols = cols
        .filter((c) => /int|decimal|float|double/i.test(c.type))
        .map((c) => c.name);

      const defectCol = map.defectCol || map.passRateCol;
      const resultCol = map.resultCol;
      const skipCols = new Set([
        map.dateCol,
        map.lotCol,
        defectCol,
        resultCol,
        map.passRateCol,
        map.quantityCol,
      ].filter(Boolean).map((c) => c!.toLowerCase()));

      const paramCandidates = numericCols.filter(
        (name) => !skipCols.has(name.toLowerCase()) && !/pass|rate|quality|defect|result|lot|date|id/i.test(name)
      );

      const requestedParams = params && params.length > 0
        ? params.filter((p: string) => numericCols.includes(p))
        : paramCandidates.slice(0, 6);

      if (requestedParams.length === 0 || !defectCol) {
        await conn.end();
        return reply.send({
          success: true,
          intervals: [],
          error: !defectCol ? 'NO_DEFECT_COL' : 'NO_PARAMS',
        });
      }

      const colList = [...new Set([...requestedParams, defectCol])].map((c) => `\`${c}\``).join(', ');
      const resultColSel = resultCol ? `, \`${resultCol}\`` : '';
      const [rows]: any = await conn.query(
        `SELECT ${colList}${resultColSel} FROM \`${processTable}\` WHERE \`${defectCol}\` IS NOT NULL LIMIT ${MAX_ROWS}`
      );
      const data = rows || [];

      const isDefectRate = /rate|percent|pct|ratio/i.test(defectCol);
      const toDefectRate = (r: any): number => {
        const v = r[defectCol];
        if (v == null) return NaN;
        const n = typeof v === 'number' ? v : parseFloat(v);
        if (Number.isNaN(n)) return NaN;
        return isDefectRate && n > 1 ? n / 100 : n;
      };

      const intervals: {
        paramName: string;
        bins: { label: string; min: number; max: number; defectRate: number; count: number }[];
        averageDefectRate: number;
      }[] = [];

      for (const paramName of requestedParams) {
        const points = data
          .map((r: any) => {
            const x = r[paramName] != null ? Number(r[paramName]) : NaN;
            const y = toDefectRate(r);
            return { x, y };
          })
          .filter((p: { x: number; y: number }) => !Number.isNaN(p.x) && !Number.isNaN(p.y));

        if (points.length < numBins) {
          intervals.push({ paramName, bins: [], averageDefectRate: 0 });
          continue;
        }

        points.sort((a: { x: number }, b: { x: number }) => a.x - b.x);
        const totalDefectRate = points.reduce((s: number, p: { x: number; y: number }) => s + p.y, 0) / points.length;
        const binSize = Math.floor(points.length / numBins);
        const bins: { label: string; min: number; max: number; defectRate: number; count: number }[] = [];

        for (let i = 0; i < numBins; i++) {
          const start = i * binSize;
          const end = i === numBins - 1 ? points.length : (i + 1) * binSize;
          const slice = points.slice(start, end);
          const min = slice[0]?.x ?? 0;
          const max = slice[slice.length - 1]?.x ?? min;
          const defectRate = slice.length > 0 ? slice.reduce((s: number, p: { x: number; y: number }) => s + p.y, 0) / slice.length : 0;
          const label = `${Number(min).toFixed(4)} - ${Number(max).toFixed(4)}`;
          bins.push({ label, min, max, defectRate, count: slice.length });
        }

        intervals.push({
          paramName,
          bins,
          averageDefectRate: totalDefectRate,
        });
      }

      await conn.end();
      return reply.send({ success: true, intervals });
    } catch (e: unknown) {
      const err = e as { sql?: string; sqlMessage?: string };
      console.error('[dashboard/defect-by-intervals] error:', e);
      if (conn) try { await conn.end(); } catch {}
      const msg = e instanceof Error ? e.message : String(e);
      return reply.code(500).send({ success: false, error: msg, intervals: [] });
    }
  });
}
