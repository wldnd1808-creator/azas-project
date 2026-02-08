import type { FastifyInstance } from 'fastify';
import { getConnection, getProcessDataTable, getProcessColumnMap, getColumns } from '../../lib/dashboard-db.js';
import { requireAuth } from '../../middlewares/auth.js';

const MAX_ROWS = 1000;

function pearson(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;
  const sum = (a: number[]) => a.reduce((s, v) => s + v, 0);
  const meanX = sum(x) / n;
  const meanY = sum(y) / n;
  let num = 0;
  let denX = 0;
  let denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = (x[i] ?? meanX) - meanX;
    const dy = (y[i] ?? meanY) - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const den = Math.sqrt(denX * denY);
  return den === 0 ? 0 : num / den;
}

function toNumericMatrix(rows: Record<string, unknown>[], columns: string[]): number[][] {
  return columns.map((col) =>
    rows.map((r) => {
      const v = (r as any)[col];
      if (typeof v === 'number' && !Number.isNaN(v)) return v;
      if (typeof v === 'string') return parseFloat(v) || 0;
      return 0;
    })
  );
}

export async function registerDashboardAnalytics(app: FastifyInstance) {
  app.get('/api/dashboard/analytics', async (request, reply) => {
    const user = await requireAuth(request as any);
    if (!user) return reply.code(401).send({ success: false, error: 'Unauthorized' });

    let conn: any;
    try {
      conn = await getConnection();
      const processTable = await getProcessDataTable(conn);
      const map = await getProcessColumnMap(conn, processTable);
      const cols = await getColumns(conn, processTable);
      const numericCols = cols
        .filter((c) => /int|decimal|float|double/i.test(c.type))
        .map((c) => c.name);

      if (numericCols.length === 0) {
        await conn.end();
        return reply.send({
          success: true,
          correlation: { columns: [], matrix: [] },
          importance: [],
          confusionMatrix: null,
          error: 'NO_NUMERIC',
        });
      }

      const colList = numericCols.map((c) => `\`${c}\``).join(', ');
      const [rows]: any = await conn.query(`SELECT ${colList} FROM \`${processTable}\` LIMIT ${MAX_ROWS}`);
      const data = rows || [];

      if (data.length < 2) {
        await conn.end();
        return reply.send({
          success: true,
          correlation: { columns: numericCols, matrix: numericCols.map(() => numericCols.map(() => 0)) },
          importance: numericCols.map((name) => ({ name, importance: 0 })),
          confusionMatrix: null,
        });
      }

      const matrix = toNumericMatrix(data, numericCols);
      const n = numericCols.length;
      const corrMatrix: number[][] = [];
      for (let i = 0; i < n; i++) {
        corrMatrix[i] = [];
        for (let j = 0; j < n; j++) {
          corrMatrix[i][j] = i === j ? 1 : pearson(matrix[i], matrix[j]);
        }
      }

      const targetCol = map.passRateCol || map.quantityCol || numericCols[0];
      const targetIdx = numericCols.indexOf(targetCol);
      const targetVec = targetIdx >= 0 ? matrix[targetIdx] : matrix[0];
      const importance = numericCols.map((name, i) => ({
        name,
        importance: Math.abs(pearson(matrix[i], targetVec)),
      }));
      importance.sort((a, b) => b.importance - a.importance);

      let confusionMatrix: {
        labels: { actual: string[]; predicted: string[] };
        matrix: number[][];
        summary: { tp: number; fp: number; tn: number; fn: number; accuracy: number };
      } | null = null;

      const outcomeCol =
        map.passRateCol ||
        map.defectCol ||
        numericCols.find((n) => /pass|defect|quality|rate/i.test(n)) ||
        numericCols[0];
      const outcomeIdx = numericCols.indexOf(outcomeCol);
      if (outcomeIdx >= 0) {
        const values = matrix[outcomeIdx];
        const median = values.slice().sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? 0;
        const thresholdActual = median;
        const thresholdPred = median * 0.98;
        let tp = 0, fp = 0, tn = 0, fn = 0;
        for (let i = 0; i < values.length; i++) {
          const actualPos = values[i] >= thresholdActual;
          const predPos = values[i] >= thresholdPred;
          if (actualPos && predPos) tp++;
          else if (!actualPos && predPos) fp++;
          else if (actualPos && !predPos) fn++;
          else tn++;
        }
        const total = tp + fp + tn + fn;
        confusionMatrix = {
          labels: { actual: ['Negative', 'Positive'], predicted: ['Negative', 'Positive'] },
          matrix: [
            [tn, fp],
            [fn, tp],
          ],
          summary: {
            tp, fp, tn, fn,
            accuracy: total > 0 ? (tp + tn) / total : 0,
          },
        };
      }

      // 불량 LOT 분석
      let defectLots: { lot: string; defectRate: number; variables: Record<string, number> }[] = [];
      const defectCol = map.defectCol || map.passRateCol;
      const lotCol = cols.find((c) => /lot|batch/i.test(c.name))?.name;

      if (defectCol && lotCol) {
        const [defectRows]: any = await conn.query(
          `SELECT \`${lotCol}\` as lot, \`${defectCol}\` as defect_rate, ${colList}
           FROM \`${processTable}\`
           WHERE \`${defectCol}\` IS NOT NULL
           ORDER BY \`${defectCol}\` DESC
           LIMIT 10`
        );
        defectLots = (defectRows || []).map((r: any) => ({
          lot: String(r.lot ?? ''),
          defectRate: Number(r.defect_rate ?? 0),
          variables: Object.fromEntries(numericCols.map((col) => [col, Number(r[col] ?? 0)])),
        }));
      }

      // 불량률 추이(시계열)
      let defectTrend: { time: string; defectRate: number; passRate: number }[] = [];
      if (defectCol && map.dateCol) {
        const isDefectCol = defectCol === map.defectCol;
        const [trendRows]: any = await conn.query(
          `SELECT 
            DATE_FORMAT(\`${map.dateCol}\`, '%Y-%m-%d %H:00:00') as time_hour,
            AVG(\`${defectCol}\`) as avg_rate
           FROM \`${processTable}\`
           WHERE \`${defectCol}\` IS NOT NULL
             AND \`${map.dateCol}\` >= DATE_SUB(NOW(), INTERVAL 7 DAY)
           GROUP BY DATE_FORMAT(\`${map.dateCol}\`, '%Y-%m-%d %H:00:00')
           ORDER BY time_hour ASC
           LIMIT 100`
        );

        defectTrend = (trendRows || []).map((r: any) => {
          const avgRate = Number(r.avg_rate ?? 0);
          return {
            time: String(r.time_hour ?? ''),
            defectRate: isDefectCol ? avgRate : 100 - avgRate,
            passRate: isDefectCol ? 100 - avgRate : avgRate,
          };
        });
      }

      await conn.end();
      return reply.send({
        success: true,
        correlation: { columns: numericCols, matrix: corrMatrix },
        importance,
        confusionMatrix,
        defectLots,
        defectTrend,
      });
    } catch (e: unknown) {
      const err = e as { sql?: string; sqlMessage?: string; code?: string };
      console.error('[dashboard/analytics] DB error:', e);
      if (err?.sql) console.error('[dashboard/analytics] SQL:', err.sql);
      if (err?.sqlMessage) console.error('[dashboard/analytics] sqlMessage:', err.sqlMessage);
      const msg = e instanceof Error ? e.message : String(e);
      request.log.error({ err: e }, 'Analytics API error');
      if (conn) try { await conn.end(); } catch {}
      return reply.code(500).send({
        success: false,
        error: msg,
        correlation: { columns: [], matrix: [] },
        importance: [],
        confusionMatrix: null,
      });
    }
  });
}

