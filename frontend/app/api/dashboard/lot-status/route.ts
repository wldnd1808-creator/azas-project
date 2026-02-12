import { NextResponse } from 'next/server';
import {
  getConnection,
  getProcessDataTable,
  getProcessColumnMap,
  getColumns,
  getDashboardDateStrings,
  escapeSqlId,
  isSafeColumnName,
} from '@/lib/dashboard-db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_LOTS = 30;

/** 컬럼명에서 온도/습도/압력·공정시간 등 추출용 (공백/언더스코어 무시) */
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
  /** 합불여부: prediction 0=합격, 1=불합격 */
  passFailResult: string | null;
  /** 리튬 투입량 (lithium_input LOT별 평균) */
  lithiumInput: number | null;
  /** 첨가제 비율 (addictive_ratio LOT별 평균) */
  addictiveRatio: number | null;
  /** 공정 시간 (process_time LOT별 평균) */
  processTime: number | null;
  /** 습도 (humidity LOT별 평균) */
  humidity: number | null;
  /** 탱크 압력 (tank_pressure LOT별 평균) */
  tankPressure: number | null;
  recordCount: number;
  latestDate: string | null;
  /** 기타 수치 파라미터 (LOT별 평균) */
  params: Record<string, number>;
};

/** period: day=오늘, week=이번 주, month=이번 달. 없으면 기존 365일 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const debug = searchParams.get('debug') === '1';
  const noDateFilter = searchParams.get('noDate') === '1'; // 날짜 조건 제외 시도 (데이터 없을 때 원인 확인)
  const showAll = searchParams.get('all') === '1'; // 합격+불합격 전부 반환 (기본은 불합격만)
  const period = searchParams.get('period') || ''; // 'day' | 'week' | 'month'

  let conn;
  try {
    conn = await getConnection();
    const tableName = await getProcessDataTable(conn);
    const map = await getProcessColumnMap(conn, tableName);
    const { lotCol, dateCol, resultCol: rawResultCol, defectCol, numericCols } = map;
    // 합불 컬럼: prediction 우선, 없으면 quality_defect/y_defect, 없으면 defect(0/1형, rate 제외) 사용
    const resultCol =
      rawResultCol ||
      (defectCol && !/rate|percent|pct/i.test(defectCol) ? defectCol : null);

    if (!lotCol) {
      await conn.end();
      return NextResponse.json({
        success: true,
        lots: [],
        message: 'NO_LOT_COLUMN',
        _hint: `테이블 "${tableName}"에서 lot_id/lot/batch 컬럼을 찾지 못함. Vercel 환경변수 DB_NAME=project, DB_HOST 확인.`,
      });
    }

    const selectParts: string[] = [
      `${escapeSqlId(lotCol)} as lot_id`,
      'COUNT(*) as record_count',
    ];
    if (dateCol) selectParts.push(`MAX(${escapeSqlId(dateCol)}) as latest_date`);
    if (resultCol && dateCol) {
      selectParts.push(`SUBSTRING_INDEX(GROUP_CONCAT(CAST(${escapeSqlId(resultCol)} AS CHAR) ORDER BY ${escapeSqlId(dateCol)} DESC), ',', 1) as latest_result`);
    } else if (resultCol) {
      selectParts.push(`MAX(${escapeSqlId(resultCol)}) as latest_result`);
    }

    // LOT별 수치 파라미터 평균 (온도·습도·압력·공정시간 등). process_time 등 알려진 파라미터는 타입 무관 포함
    const excludeFromParams = new Set([lotCol, dateCol, resultCol].filter(Boolean));
    const knownParamNames = ['process_time', 'process time', 'ProcessTime', 'processing_time', 'humidity', 'tank_pressure', 'lithium_input', 'additive_ratio'];
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
    // 따옴표/백틱이 들어간 컬럼명은 동적 SQL에서 제외 (MariaDB 구문 오류 방지)
    const paramCols = [...Array.from(numericSet), ...extraCols].filter(isSafeColumnName);
    for (const col of paramCols) {
      const alias = col.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '_').replace(/^$/, 'p');
      if (numericSet.has(col)) {
        selectParts.push(`AVG(${escapeSqlId(col)}) as ${escapeSqlId('param_' + alias)}`);
      } else {
        selectParts.push(`AVG(CAST(${escapeSqlId(col)} AS DECIMAL(20,6))) as ${escapeSqlId('param_' + alias)}`);
      }
    }

    // 기간 조건: day=오늘(KST), week=이번 주, month=이번 달. BACKEND_DATE_TZ=Asia/Seoul 권장
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
    // LOT ID 작은 수부터 오름차순 (숫자로 해석 가능하면 숫자 순, 아니면 문자열 순)
    const orderBy = 'ORDER BY CAST(lot_id AS UNSIGNED) ASC, lot_id ASC';
    // 불합격(prediction=1) LOT만 조회. debug=1 또는 all=1이면 HAVING 생략해 합격+불합격 전부 반환
    const havingClause =
      debug || showAll || !resultCol
        ? ''
        : `HAVING (CONVERT(latest_result, SIGNED) = 1 OR TRIM(CONVERT(latest_result, CHAR)) = '1')`;

    // 일/주/월 선택 시에는 불합격 LOT 전부 표시, 그 외·debug는 제한
    const limitClause =
      period === 'day' || period === 'week' || period === 'month'
        ? ''
        : `LIMIT ${debug ? 100 : MAX_LOTS}`;

    let dateConditionUsed = dateCondition;
    const mainQuery = `SELECT ${selectParts.join(', ')}
       FROM ${escapeSqlId(tableName)}
       ${dateCondition}
       GROUP BY ${escapeSqlId(lotCol)}
       ${havingClause}
       ${orderBy}
       ${limitClause}`.trim();
    let [rows]: any = dateParams.length > 0
      ? await conn.query(mainQuery, dateParams)
      : await conn.query(mainQuery);

    // 불합격만 조회했는데 0건이면, 기간이 365일일 때만 날짜 조건 제거하고 재시도 (일/주/월 선택 시에는 재시도 안 함)
    if (!debug && resultCol && (!rows || rows.length === 0) && dateCol && period !== 'day' && period !== 'week' && period !== 'month') {
      const noDateCondition = '';
      const [retryRows]: any = await conn.query(
        `SELECT ${selectParts.join(', ')}
         FROM ${escapeSqlId(tableName)}
         ${noDateCondition}
         GROUP BY ${escapeSqlId(lotCol)}
         HAVING (CONVERT(latest_result, SIGNED) = 1 OR TRIM(CONVERT(latest_result, CHAR)) = '1')
         ${orderBy}
         LIMIT ${MAX_LOTS}`
      );
      if (retryRows && retryRows.length > 0) {
        rows = retryRows;
        dateConditionUsed = noDateCondition;
      }
    }

    const lots: LotStatus[] = (rows || []).map((r: Record<string, unknown>) => {
      const params: Record<string, number> = {};
      const rowKeys = Object.keys(r);
      for (const col of paramCols) {
        const paramAlias = col.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '_').replace(/^$/, 'p');
        const key = rowKeys.find((k) => k.toLowerCase() === `param_${paramAlias}`.toLowerCase()) ?? `param_${paramAlias}`;
        const val = r[key];
        if (val != null && !Number.isNaN(Number(val))) {
          params[col] = Number(val);
        }
      }

      // prediction: 0=합격, 1=불합격
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
    const firstRowParamKeys = firstRow
      ? Object.keys(firstRow).filter((k) => k.startsWith('param_'))
      : [];
    const debugInfo =
      debug || process.env.NODE_ENV === 'development' || (rows || []).length === 0
        ? {
            tableName,
            todayStr,
            weekStartStr,
            weekEndStr,
            firstOfMonth,
            lastOfMonthStr,
            lotCol,
            dateCol,
            resultCol,
            hasDateFilter: !!dateCol && !noDateFilter,
            period,
            dateParams,
            totalReturned: (rows || []).length,
            hint: (rows || []).length === 0 ? 'DB 연결·DB_NAME·BACKEND_DATE_TZ=Asia/Seoul·simulation_results 테이블 확인' : undefined,
          }
        : undefined;

    await conn.end();

    // 배포 확인용: Vercel Network 탭 Response에 이 값이 있으면 최신 코드가 적용된 것
    const apiVersion = 'escapeSqlId-2025-02';

    // 불량 LOT 레포트 자동 생성 (비동기, 응답 블로킹 안 함) - MariaDB + ChromaDB에 저장
    const defectiveLots = lots.filter((l) => l.passFailResult === '불합격');
    // 불량 LOT 레포트 생성은 백엔드 API로 전환됨 (프론트엔드에서는 제거)

    return NextResponse.json({
      success: true,
      lots,
      totalLots: lots.length,
      _apiVersion: apiVersion,
      _debug: debugInfo,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('Lot status API error:', msg);
    if (conn) try { await conn.end(); } catch {}
    return NextResponse.json(
      {
        success: false,
        error: msg,
        lots: [],
      },
      { status: 500 }
    );
  }
}
