import { NextRequest, NextResponse } from 'next/server';
import {
  getConnection,
  getProcessDataTable,
  getColumns,
} from '@/lib/dashboard-db';
import {
  matchColumns,
  extractNumber,
  isLotQuery,
  columnToKorean,
  describeColumns,
} from '@/lib/column-matcher';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Period = 'day' | 'week' | 'month';

/** 사용자 질문에서 기간 추론 (기본: week) */
function inferPeriod(q: string): Period {
  const s = (q || '').toLowerCase().replace(/\s/g, '');
  if (/\b(오늘|금일|today)\b/.test(s)) return 'day';
  if (
    /\b(최근\s*한\s*달|최근\s*한달|지난\s*30일|최근\s*30일|최근\s*1개월|지난\s*1개월|월간|한달|last\s*30|past\s*month|last\s*month)\b/i.test(q) ||
    /한\s*달|한달|1개월|30일/.test(s)
  )
    return 'month';
  if (
    /\b(최근\s*일주일|최근\s*1주|지난\s*7일|최근\s*7일|지난\s*1주|주간|일주일|last\s*7|past\s*week|last\s*week)\b/i.test(q) ||
    /일주일|7일|1주|주간/.test(s)
  )
    return 'week';
  return 'week';
}

/** 특정 변수/컬럼에 대한 질의인지 확인 */
function isSpecificColumnQuery(q: string): boolean {
  const s = (q || '').toLowerCase();
  // "~은?", "~는?", "~이?", "~가?", "얼마", "몇", "알려줘", "보여줘", "데이터", "값"
  return /투입|소비|온도|압력|습도|농도|속도|무게|두께|전압|전류|input|output|rate|temp|pressure/.test(s) ||
    /(\w+)\s*(은|는|이|가)\s*(\?|얼마|몇)/.test(s) ||
    /알려|보여|데이터|값|수치/.test(s);
}

/** 품질/불량 관련 의도 여부 */
function wantsQuality(q: string): boolean {
  const s = (q || '').toLowerCase();
  return /불량|품질|합격|defect|quality|pass\s*rate|불량품|합격률|불량률/.test(s);
}

/** 생산 관련 의도 여부 */
function wantsProduction(q: string): boolean {
  const s = (q || '').toLowerCase();
  return /생산|생산량|production|quantity|생산현황|출고/.test(s);
}

/** 에너지 관련 의도 여부 */
function wantsEnergy(q: string): boolean {
  const s = (q || '').toLowerCase();
  return /에너지|energy|소비|consumption|전력|kwh/.test(s);
}

/** 효율 관련 의도 여부 */
function wantsEfficiency(q: string): boolean {
  const s = (q || '').toLowerCase();
  return /효율|efficiency|가동률|설비|oee|uptime/.test(s);
}

/** 대시보드/공정 현황 등 일반 문의 → 품질+생산 최소 포함 */
function wantsAnyDashboard(q: string): boolean {
  const s = (q || '').toLowerCase();
  return (
    /현황|알려|알려줘|보여|몇\s*개|얼마|대시보드|공정\s*데이터|factory|공정\s*현황|지표|데이터/.test(s) &&
    !wantsQuality(s) &&
    !wantsProduction(s) &&
    !wantsEnergy(s) &&
    !wantsEfficiency(s)
  );
}

/** FDC 알림/경고 관련 의도 */
function wantsAlerts(q: string): boolean {
  const s = (q || '').toLowerCase();
  return /경고|알람|알림|이상|fdc|관리선|이탈|anomaly|alert/.test(s);
}

/** 실시간 센서(습도·압력 등) 관련 의도 */
function wantsRealtime(q: string): boolean {
  const s = (q || '').toLowerCase();
  return /실시간|현재\s*습도|현재\s*압력|습도\s*얼마|압력\s*얼마|센서|humidity|pressure|tank/.test(s);
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const q = url.searchParams.get('q') || '';

  const period = inferPeriod(q);
  const fetchQuality = wantsQuality(q) || wantsAnyDashboard(q);
  const fetchProduction = wantsProduction(q) || wantsAnyDashboard(q);
  const fetchEnergy = wantsEnergy(q);
  const fetchEfficiency = wantsEfficiency(q);
  const fetchAlerts = wantsAlerts(q) || wantsAnyDashboard(q);
  const fetchRealtime = wantsRealtime(q) || wantsAnyDashboard(q);

  const base = request.nextUrl.origin;

  type Summary = { data?: Record<string, unknown>; fromDb?: boolean };
  type Detail = { success?: boolean; period?: string; data?: unknown[]; byLine?: unknown[] };
  type AlertItem = { column: string; columnKorean: string; currentValue: number; mean: number; upperLimit: number; lowerLimit: number; deviation: number; severity: string };
  type SensorItem = { name: string; nameKorean: string; currentValue: number; unit: string };

  let summary: Summary = {};
  let quality: Detail | null = null;
  let production: Detail | null = null;
  let energy: Detail | null = null;
  let efficiency: Detail | null = null;
  let alerts: AlertItem[] = [];
  let sensors: SensorItem[] = [];

  // 특정 컬럼 동적 쿼리 결과
  let columnQueryResult: {
    matched: boolean;
    columns: { name: string; korean: string; reason: string }[];
    data: Record<string, unknown>[];
    stats?: Record<string, { avg?: number; min?: number; max?: number; sum?: number; count?: number }>;
    limit?: number;
    availableColumns?: string;
  } | null = null;

  // 1) 특정 변수/컬럼 쿼리인지 확인 → DB에서 직접 조회
  const isColumnQuery = isSpecificColumnQuery(q) || isLotQuery(q);
  if (isColumnQuery) {
    let conn;
    try {
      conn = await getConnection();
      const tableName = await getProcessDataTable(conn);
      if (tableName) {
        const columns = await getColumns(conn, tableName);
        const numericColumns = columns.filter((c) =>
          /int|decimal|float|double/i.test(c.type)
        );

        // 질문과 컬럼 매칭
        const matches = matchColumns(q, numericColumns);
        const topMatches = matches.filter((m) => m.score >= 30).slice(0, 5);

        // LOT 수 또는 기본 limit
        const limit = extractNumber(q) || 100;

        if (topMatches.length > 0) {
          // 매칭된 컬럼만 SELECT
          const selectCols = topMatches.map((m) => `\`${m.column}\``).join(', ');
          
          // LOT/id 컬럼 찾기 (있으면 함께 조회)
          const lotCol = columns.find((c) =>
            /lot|batch|id|no|번호/i.test(c.name)
          )?.name;
          const dateCol = columns.find((c) =>
            /date|time|created|recorded/i.test(c.name) || /date|time/i.test(c.type)
          )?.name;

          const orderBy = dateCol ? `ORDER BY \`${dateCol}\` DESC` : lotCol ? `ORDER BY \`${lotCol}\` DESC` : '';
          const extraCols = [lotCol, dateCol].filter(Boolean).map((c) => `\`${c}\``).join(', ');
          const fullSelect = extraCols ? `${extraCols}, ${selectCols}` : selectCols;

          const [rows]: any = await conn.query(
            `SELECT ${fullSelect} FROM \`${tableName}\` ${orderBy} LIMIT ${limit}`
          );

          // 통계 계산
          const stats: Record<string, { avg?: number; min?: number; max?: number; sum?: number; count?: number }> = {};
          for (const m of topMatches) {
            const values = (rows || [])
              .map((r: any) => r[m.column])
              .filter((v: any) => v != null && !Number.isNaN(Number(v)))
              .map((v: any) => Number(v));
            if (values.length > 0) {
              stats[m.column] = {
                count: values.length,
                sum: values.reduce((a: number, b: number) => a + b, 0),
                avg: values.reduce((a: number, b: number) => a + b, 0) / values.length,
                min: Math.min(...values),
                max: Math.max(...values),
              };
            }
          }

          columnQueryResult = {
            matched: true,
            columns: topMatches.map((m) => ({
              name: m.column,
              korean: columnToKorean(m.column),
              reason: m.reason,
            })),
            data: (rows || []).slice(0, 20), // 샘플 20개만
            stats,
            limit,
            availableColumns: describeColumns(numericColumns.slice(0, 30)),
          };

          console.log(`[Chat-context] Column query: matched ${topMatches.map((m) => m.column).join(', ')}, limit=${limit}`);
        } else {
          // 매칭 실패 → 사용 가능한 컬럼 목록 제공
          columnQueryResult = {
            matched: false,
            columns: [],
            data: [],
            availableColumns: describeColumns(numericColumns.slice(0, 30)),
          };
          console.log('[Chat-context] Column query: no match found');
        }
      }
      await conn.end();
    } catch (e) {
      console.warn('Column query error:', e);
      if (conn) try { await conn.end(); } catch {}
    }
  }

  // 2) 기존 대시보드 API 호출 (품질/생산/에너지/효율)
  // 금일 생산량·불량률은 캘린더(calendar-month)와 동일한 값 사용
  let calendarTodayProduction: { production: number; unitKo: string; unitEn: string; defectRate?: number } | null = null;
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const todayDay = now.getDate();

    const [summaryRes, qualityRes, productionRes, energyRes, efficiencyRes, calendarRes, alertsRes, realtimeRes] = await Promise.all([
      fetch(`${base}/api/dashboard/summary`),
      fetchQuality ? fetch(`${base}/api/dashboard/quality?period=${period}`) : Promise.resolve(null),
      fetchProduction ? fetch(`${base}/api/dashboard/production?period=${period}`) : Promise.resolve(null),
      fetchEnergy ? fetch(`${base}/api/dashboard/energy?period=${period}`) : Promise.resolve(null),
      fetchEfficiency ? fetch(`${base}/api/dashboard/efficiency?period=${period}`) : Promise.resolve(null),
      fetchProduction || fetchQuality || wantsProduction(q) ? fetch(`${base}/api/dashboard/calendar-month?year=${year}&month=${month}`) : Promise.resolve(null),
      fetchAlerts ? fetch(`${base}/api/dashboard/alerts`) : Promise.resolve(null),
      fetchRealtime ? fetch(`${base}/api/dashboard/realtime`) : Promise.resolve(null),
    ]);

    if (summaryRes.ok) summary = (await summaryRes.json()) as Summary;
    if (qualityRes?.ok) quality = (await qualityRes.json()) as Detail;
    if (productionRes?.ok) production = (await productionRes.json()) as Detail;
    if (energyRes?.ok) energy = (await energyRes.json()) as Detail;
    if (efficiencyRes?.ok) efficiency = (await efficiencyRes.json()) as Detail;
    if (alertsRes?.ok) {
      const a = (await alertsRes.json()) as { success?: boolean; alerts?: AlertItem[] };
      if (a.success && Array.isArray(a.alerts)) alerts = a.alerts;
    }
    if (realtimeRes?.ok) {
      const r = (await realtimeRes.json()) as { success?: boolean; sensors?: SensorItem[] };
      if (r.success && Array.isArray(r.sensors)) sensors = r.sensors;
    }

    if (calendarRes?.ok) {
      const cal = (await calendarRes.json()) as { success?: boolean; days?: { day: number; production: number; defectRate?: number }[]; productionUnit?: string; productionUnitEn?: string };
      if (cal.success && Array.isArray(cal.days)) {
        const todayRow = cal.days.find((d) => d.day === todayDay);
        if (todayRow != null) {
          calendarTodayProduction = {
            production: Number(todayRow.production ?? 0),
            unitKo: cal.productionUnit ?? '개',
            unitEn: cal.productionUnitEn ?? 'ea',
          };
          if (todayRow.defectRate != null) (calendarTodayProduction as Record<string, unknown>).defectRate = Number(todayRow.defectRate);
        }
      }
    }
  } catch (e) {
    console.warn('Chat-context fetch error:', e);
  }

  const fromDb =
    !!summary.fromDb ||
    !!columnQueryResult?.matched ||
    !!(quality?.success && (quality.data?.length || quality.byLine?.length)) ||
    !!(production?.success && (production.data?.length || production.byLine?.length)) ||
    !!(energy?.success && energy.data?.length) ||
    !!(efficiency?.success && (efficiency.data?.length || efficiency.byLine?.length)) ||
    alerts.length > 0 ||
    sensors.length > 0;

  const summaryData = summary.data ?? summary;
  if (calendarTodayProduction != null && typeof summaryData === 'object' && summaryData !== null) {
    const s = summaryData as Record<string, unknown>;
    s.productionToday = calendarTodayProduction.production;
    s.productionTodayUnitKo = calendarTodayProduction.unitKo;
    s.productionTodayUnitEn = calendarTodayProduction.unitEn;
    s.productionTodaySource = 'calendar';
    if (calendarTodayProduction.defectRate != null) {
      s.defectRateToday = calendarTodayProduction.defectRate;
      s.defectRateTodaySource = 'calendar';
    }
  }

  return NextResponse.json({
    success: true,
    period,
    summary: summaryData,
    calendarTodayProduction: calendarTodayProduction ?? undefined,
    quality: fetchQuality ? quality : undefined,
    production: fetchProduction ? production : undefined,
    energy: fetchEnergy ? energy : undefined,
    efficiency: fetchEfficiency ? efficiency : undefined,
    alerts: fetchAlerts ? alerts : undefined,
    sensors: fetchRealtime ? sensors : undefined,
    columnQuery: columnQueryResult,
    fromDb,
  });
}
