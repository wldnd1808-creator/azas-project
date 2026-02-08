import { NextRequest, NextResponse } from 'next/server';
import {
  getConnection,
  getProcessDataTable,
  getProcessColumnMap,
  getColumns,
  escapeSqlId,
} from '@/lib/dashboard-db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_ROWS = 5000;
const DEFAULT_BINS = 5;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const paramsParam = searchParams.get('params');
  const params = paramsParam ? paramsParam.split(',').map((p) => p.trim()).filter(Boolean) : null;
  const numBins = Math.min(10, Math.max(2, parseInt(searchParams.get('bins') || '', 10) || DEFAULT_BINS));

  let conn;
  try {
    conn = await getConnection();
    const processTable = await getProcessDataTable(conn);
    const map = await getProcessColumnMap(conn, processTable);
    const cols = await getColumns(conn, processTable);
    const numericCols = cols
      .filter((c) => /int|decimal|float|double/i.test(c.type))
      .map((c) => c.name);

    const defectCol = map.defectCol || map.passRateCol;
    const skipCols = new Set(
      [
        map.dateCol,
        map.lotCol,
        defectCol,
        map.resultCol,
        map.passRateCol,
        map.quantityCol,
      ].filter(Boolean).map((c) => c!.toLowerCase())
    );

    const paramCandidates = numericCols.filter(
      (name) =>
        !skipCols.has(name.toLowerCase()) &&
        !/pass|rate|quality|defect|result|lot|date|id/i.test(name)
    );

    const requestedParams =
      params && params.length > 0
        ? params.filter((p: string) => numericCols.includes(p))
        : paramCandidates.slice(0, 6);

    if (requestedParams.length === 0 || !defectCol) {
      await conn.end();
      return NextResponse.json({
        success: true,
        intervals: [],
        error: !defectCol ? 'NO_DEFECT_COL' : 'NO_PARAMS',
      });
    }

    const colList = [...new Set([...requestedParams, defectCol])].map((c) => escapeSqlId(c)).join(', ');
    const resultColSel = map.resultCol ? `, ${escapeSqlId(map.resultCol)}` : '';
    const [rows]: any = await conn.query(
      `SELECT ${colList}${resultColSel} FROM ${escapeSqlId(processTable)} WHERE ${escapeSqlId(defectCol)} IS NOT NULL LIMIT ${MAX_ROWS}`
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
      const totalDefectRate = points.reduce((s, p) => s + p.y, 0) / points.length;
      const binSize = Math.floor(points.length / numBins);
      const bins: { label: string; min: number; max: number; defectRate: number; count: number }[] = [];

      for (let i = 0; i < numBins; i++) {
        const start = i * binSize;
        const end = i === numBins - 1 ? points.length : (i + 1) * binSize;
        const slice = points.slice(start, end);
        const min = slice[0]?.x ?? 0;
        const max = slice[slice.length - 1]?.x ?? min;
        const defectRate = slice.length > 0 ? slice.reduce((s, p) => s + p.y, 0) / slice.length : 0;
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
    return NextResponse.json({ success: true, intervals });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[defect-by-intervals] error:', msg);
    if (conn) try { await conn.end(); } catch {}
    return NextResponse.json({ success: false, error: msg, intervals: [] }, { status: 500 });
  }
}
