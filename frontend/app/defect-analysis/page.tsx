'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import Card from '@/components/Card';
import { useLanguage } from '@/contexts/LanguageContext';
import { authHeader, dashboardApiUrl } from '@/lib/api-client';

type LotStatus = {
  lotId: string;
  passFailResult: string | null;
  recordCount: number;
  latestDate: string | null;
  lithiumInput?: number | null;
  processTime?: number | null;
  humidity?: number | null;
  tankPressure?: number | null;
};

type ImportanceItem = { name: string; importance: number };
type AlertItem = {
  column: string;
  columnKorean: string;
  currentValue: number;
  mean: number;
  upperLimit: number;
  lowerLimit: number;
  deviation: number;
  severity: 'warning' | 'critical';
};

type IntervalBin = { label: string; min: number; max: number; defectRate: number; count: number };
type IntervalSeries = { paramName: string; bins: IntervalBin[]; averageDefectRate: number };

/** DB 데이터 없을 때 표시할 데모 구간별 불량률 (이미지와 동일한 형식) */
const DEMO_INTERVAL_DATA: IntervalSeries[] = [
  {
    paramName: 'd50',
    averageDefectRate: 0.085,
    bins: [
      { label: '3.4990 - 3.8930', min: 3.499, max: 3.893, defectRate: 0.175, count: 100 },
      { label: '3.8930 - 4.2900', min: 3.893, max: 4.29, defectRate: 0.03, count: 120 },
      { label: '4.2900 - 4.6800', min: 4.29, max: 4.68, defectRate: 0.035, count: 110 },
      { label: '4.6800 - 5.0910', min: 4.68, max: 5.091, defectRate: 0.037, count: 115 },
      { label: '5.0910 - 5.4990', min: 5.091, max: 5.499, defectRate: 0.148, count: 105 },
    ],
  },
  {
    paramName: 'metal_impurity',
    averageDefectRate: 0.085,
    bins: [
      { label: '0.0090 - 0.0153', min: 0.009, max: 0.0153, defectRate: 0.083, count: 95 },
      { label: '0.0153 - 0.0203', min: 0.0153, max: 0.0203, defectRate: 0.065, count: 100 },
      { label: '0.0203 - 0.0257', min: 0.0203, max: 0.0257, defectRate: 0.082, count: 98 },
      { label: '0.0257 - 0.0308', min: 0.0257, max: 0.0308, defectRate: 0.068, count: 102 },
      { label: '0.0308 - 0.0599', min: 0.0308, max: 0.0599, defectRate: 0.118, count: 90 },
    ],
  },
  {
    paramName: 'sintering_temp',
    averageDefectRate: 0.085,
    bins: [
      { label: '700.47 - 768.80', min: 700.47, max: 768.8, defectRate: 0.107, count: 88 },
      { label: '768.80 - 789.14', min: 768.8, max: 789.14, defectRate: 0.07, count: 105 },
      { label: '789.14 - 810.06', min: 789.14, max: 810.06, defectRate: 0.087, count: 98 },
      { label: '810.06 - 831.19', min: 810.06, max: 831.19, defectRate: 0.072, count: 102 },
      { label: '831.19 - 899.64', min: 831.19, max: 899.64, defectRate: 0.091, count: 92 },
    ],
  },
];

/** 구간별 불량률 막대 차트 1개 (그라데이션 막대 + 평균선) */
function DefectRateIntervalChart({
  series,
  language,
}: {
  series: IntervalSeries;
  language: string;
}) {
  const { paramName, bins, averageDefectRate } = series;
  if (bins.length === 0) {
    return (
      <p className="text-slate-500 text-sm py-6 text-center">
        {language === 'ko' ? '구간 데이터가 없습니다.' : 'No interval data.'}
      </p>
    );
  }
  const maxRate = Math.max(...bins.map((b) => b.defectRate), averageDefectRate, 0.01);
  const yMax = Math.ceil(maxRate * 20) / 20 || 0.1;
  const yTicks = [0, yMax * 0.25, yMax * 0.5, yMax * 0.75, yMax].map((v) => Number(v.toFixed(3)));

  return (
    <div className="flex flex-col h-full min-h-[260px]">
      <h3 className="text-sm font-semibold text-slate-800 mb-2">
        [{paramName}] {language === 'ko' ? '구간별 불량률' : 'Defect Rate by Section'}
      </h3>
      <div className="flex-1 flex gap-2 min-h-0">
        <div className="flex flex-col justify-between text-xs text-slate-500 py-1 pr-1">
          <span>{language === 'ko' ? '불량률' : 'Defect Rate'}</span>
          {yTicks.map((t) => (
            <span key={t}>{t.toFixed(3)}</span>
          ))}
        </div>
        <div className="flex-1 relative border-l border-b border-slate-200" style={{ minHeight: '200px' }}>
          {/* 평균선 (dashed blue) */}
          <div
            className="absolute left-0 right-0 border-t-2 border-dashed border-blue-500 z-10"
            style={{
              top: `${Math.max(0, 100 - (averageDefectRate / yMax) * 100)}%`,
            }}
            title={`${language === 'ko' ? '평균' : 'Average'}: ${averageDefectRate.toFixed(4)}`}
          >
            <span className="absolute -top-5 left-0 text-xs text-blue-600 font-medium">
              {language === 'ko' ? '평균' : 'Average'}
            </span>
          </div>
          {/* 막대 */}
          <div className="absolute inset-0 flex items-end justify-around gap-0.5 px-1 pb-6 pt-2">
            {bins.map((bin, i) => {
              const pct = (bin.defectRate / yMax) * 100;
              const intensity = Math.min(1, bin.defectRate / yMax);
              const color = intensity < 0.33 ? '#fdba74' : intensity < 0.66 ? '#ea580c' : '#b91c1c';
              return (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center justify-end min-w-0"
                  style={{ height: '100%' }}
                >
                  <div
                    className="w-full rounded-t transition-all"
                    style={{
                      height: `${Math.min(100, pct)}%`,
                      minHeight: bin.defectRate > 0 ? '4px' : 0,
                      backgroundColor: color,
                    }}
                    title={`${bin.label}: ${(bin.defectRate * 100).toFixed(2)}%`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="flex justify-around gap-0.5 mt-1 px-1 pt-2 border-t border-slate-100">
        {bins.map((bin, i) => (
          <div
            key={i}
            className="flex-1 text-[10px] text-slate-600 text-center transform -rotate-[35deg] origin-top-left whitespace-nowrap min-w-0 truncate max-w-[80px]"
            title={bin.label}
          >
            {bin.label}
          </div>
        ))}
      </div>
      <p className="text-[10px] text-slate-400 mt-0.5 px-1">
        {language === 'ko' ? '값 구간' : 'Value Ranges'}
      </p>
    </div>
  );
}

export default function DefectAnalysisPage() {
  const { t, language } = useLanguage();
  const [failedLots, setFailedLots] = useState<LotStatus[]>([]);
  const [importance, setImportance] = useState<ImportanceItem[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [intervalData, setIntervalData] = useState<IntervalSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      fetch(dashboardApiUrl('/api/dashboard/lot-status?period=month'), { headers: authHeader() }).then((r) =>
        r.ok ? r.json() : r.json().then((b) => ({ success: false, error: b?.error || r.statusText })).catch(() => null)
      ),
      fetch(dashboardApiUrl('/api/dashboard/analytics'), { headers: authHeader() }).then((r) =>
        r.ok ? r.json() : r.json().then((b) => ({ success: false, error: b?.error || r.statusText })).catch(() => null)
      ),
      fetch(dashboardApiUrl('/api/dashboard/alerts'), { headers: authHeader() }).then((r) =>
        r.ok ? r.json() : r.json().then((b) => ({ success: false, error: b?.error || r.statusText })).catch(() => null)
      ),
      fetch(dashboardApiUrl('/api/dashboard/defect-by-intervals?bins=5'), { headers: authHeader() }).then((r) =>
        r.ok ? r.json() : r.json().then((b) => ({ success: false, intervals: [] })).catch(() => ({ success: false, intervals: [] }))
      ),
    ])
      .then(([lotRes, analyticsRes, alertsRes, intervalRes]) => {
        const errMsg =
          (lotRes && !lotRes.success && lotRes.error) ||
          (analyticsRes && !analyticsRes.success && analyticsRes.error) ||
          (alertsRes && !alertsRes.success && alertsRes.error);
        if (intervalRes?.success && Array.isArray(intervalRes.intervals)) {
          setIntervalData(intervalRes.intervals);
        } else {
          setIntervalData([]);
        }
        if (errMsg) {
          const msg = String(errMsg);
          const isConnectionError = /ETIMEDOUT|ECONNREFUSED|ENOTFOUND|connect\s+.*timeout/i.test(msg);
          setError(
            isConnectionError
              ? (language === 'ko'
                  ? '공정 DB에 연결할 수 없습니다. 네트워크(VPN, 사내망), DB 서버 상태를 확인해 주세요.'
                  : 'Cannot connect to process DB. Check network (VPN, intranet) and DB server status.')
              : msg
          );
          setFailedLots([]);
          setImportance([]);
          setAlerts([]);
          return;
        }
        if (lotRes?.success && Array.isArray(lotRes.lots)) {
          setFailedLots(
            lotRes.lots.map((l: LotStatus) => ({
              lotId: l.lotId,
              passFailResult: l.passFailResult,
              recordCount: l.recordCount,
              latestDate: l.latestDate,
              lithiumInput: l.lithiumInput,
              processTime: l.processTime,
              humidity: l.humidity,
              tankPressure: l.tankPressure,
            }))
          );
        } else {
          setFailedLots([]);
        }
        if (analyticsRes?.success && Array.isArray(analyticsRes.importance)) {
          setImportance(analyticsRes.importance.slice(0, 10));
        } else {
          setImportance([]);
        }
        if (alertsRes?.success && Array.isArray(alertsRes.alerts)) {
          setAlerts(alertsRes.alerts);
        } else {
          setAlerts([]);
        }
      })
      .catch((err) => {
        const msg = String(err?.message || err);
        const isConnectionError = /ETIMEDOUT|ECONNREFUSED|ENOTFOUND|Failed to fetch|network/i.test(msg);
        setError(
          isConnectionError
            ? (language === 'ko'
                ? '공정 DB에 연결할 수 없습니다. 네트워크(VPN, 사내망), DB 서버 상태를 확인해 주세요.'
                : 'Cannot connect to process DB. Check network (VPN, intranet) and DB server status.')
            : msg
        );
        setFailedLots([]);
        setImportance([]);
        setAlerts([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const titleKo = '최근 품질 불량이 발생한 품목 분석';
  const titleEn = 'Recent Quality Defect Analysis';
  const subtitleKo = '불합격 LOT 목록, 불량 영향 변수, FDC 알림을 한 화면에서 확인합니다.';
  const subtitleEn = 'View failed LOTs, defect-influencing variables, and FDC alerts in one place.';

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <Navbar />

      <main className="ml-64 mr-80 mt-16 bg-slate-100 min-h-[calc(100vh-4rem)] p-6">
        <div className="max-w-full mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">
              {language === 'ko' ? titleKo : titleEn}
            </h2>
            <p className="text-slate-600 mt-1">
              {language === 'ko' ? subtitleKo : subtitleEn}
            </p>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-500">
              {language === 'ko' ? '로딩 중...' : 'Loading...'}
            </div>
          ) : error ? (
            <div className="py-6 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
              {error}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 최근 불합격 LOT */}
              <Card
                title={
                  language === 'ko'
                    ? `최근 불합격 LOT (${failedLots.length}건)`
                    : `Recent Failed LOTs (${failedLots.length})`
                }
                className="lg:col-span-2"
              >
                {failedLots.length === 0 ? (
                  <p className="text-slate-500 text-sm py-4">
                    {language === 'ko'
                      ? '이번 달 기준 불합격 LOT가 없습니다.'
                      : 'No failed LOTs for this month.'}
                  </p>
                ) : (
                  <div className="overflow-x-auto max-h-[40vh] overflow-y-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 z-10">
                        <tr>
                          <th className="text-left py-2 px-3 font-medium text-slate-700 whitespace-nowrap">
                            LOT
                          </th>
                          <th className="text-left py-2 px-3 font-medium text-slate-700 whitespace-nowrap">
                            {language === 'ko' ? '기록 수' : 'Records'}
                          </th>
                          <th className="text-left py-2 px-3 font-medium text-slate-700 whitespace-nowrap">
                            {language === 'ko' ? '최근 시각' : 'Latest'}
                          </th>
                          <th className="text-left py-2 px-3 font-medium text-slate-700 whitespace-nowrap">
                            {language === 'ko' ? '리튬 투입량 (kg)' : 'Lithium (kg)'}
                          </th>
                          <th className="text-left py-2 px-3 font-medium text-slate-700 whitespace-nowrap">
                            process_time
                          </th>
                          <th className="text-left py-2 px-3 font-medium text-slate-700 whitespace-nowrap">
                            {language === 'ko' ? '습도 (%)' : 'Humidity (%)'}
                          </th>
                          <th className="text-left py-2 px-3 font-medium text-slate-700 whitespace-nowrap">
                            {language === 'ko' ? '탱크 압력 (kPa)' : 'Tank (kPa)'}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {failedLots.map((lot, idx) => (
                          <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="py-2 px-3 font-mono text-slate-900">{lot.lotId}</td>
                            <td className="py-2 px-3 text-slate-600">{lot.recordCount}</td>
                            <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                              {lot.latestDate
                                ? new Date(lot.latestDate).toLocaleString(
                                    language === 'ko' ? 'ko-KR' : 'en-US',
                                    { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }
                                  )
                                : '-'}
                            </td>
                            <td className="py-2 px-3 text-slate-600">
                              {lot.lithiumInput != null ? Number(lot.lithiumInput).toFixed(2) : '-'}
                            </td>
                            <td className="py-2 px-3 text-slate-600">
                              {lot.processTime != null ? Number(lot.processTime).toFixed(1) : '-'}
                            </td>
                            <td className="py-2 px-3 text-slate-600">
                              {lot.humidity != null ? Number(lot.humidity).toFixed(1) : '-'}
                            </td>
                            <td className="py-2 px-3 text-slate-600">
                              {lot.tankPressure != null ? Number(lot.tankPressure).toFixed(1) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

              {/* 구간별 분석 (데이터 없으면 데모 표시) */}
              <Card
                title={
                  intervalData.length === 0
                    ? (language === 'ko' ? '구간별 분석 (데모)' : 'Interval Analysis (Demo)')
                    : (language === 'ko' ? '구간별 분석' : 'Interval Analysis')
                }
                className="lg:col-span-2"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {(intervalData.length > 0 ? intervalData : DEMO_INTERVAL_DATA).map((series) => (
                    <div key={series.paramName} className="bg-white rounded-lg p-4 border border-slate-200">
                      <DefectRateIntervalChart series={series} language={language} />
                    </div>
                  ))}
                </div>
                {intervalData.length === 0 && (
                  <p className="text-slate-500 text-xs mt-3">
                    {language === 'ko'
                      ? '※ 공정 DB에 불량률·수치 컬럼이 연결되면 실제 데이터로 차트가 표시됩니다.'
                      : '※ Charts will show real data when process DB (defect rate + numeric columns) is connected.'}
                  </p>
                )}
              </Card>

              {/* 불량 영향 변수 Top 10 */}
              <Card
                title={
                  language === 'ko'
                    ? '불량 영향 변수 Top 10'
                    : 'Defect-Influencing Variables (Top 10)'
                }
              >
                {importance.length === 0 ? (
                  <p className="text-slate-500 text-sm py-4">
                    {language === 'ko' ? '표시할 데이터가 없습니다.' : 'No data to display.'}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {importance.map((item, idx) => (
                      <li key={item.name} className="flex items-center gap-2">
                        <span className="flex-shrink-0 w-6 h-6 rounded bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                          {idx + 1}
                        </span>
                        <span className="flex-1 min-w-0 font-mono text-sm text-slate-800 truncate">
                          {item.name}
                        </span>
                        <span className="text-slate-600 text-sm">
                          {(item.importance * 100).toFixed(1)}%
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              {/* FDC 알림 요약 */}
              <Card
                title={
                  language === 'ko'
                    ? `FDC 알림 (${alerts.length}건)`
                    : `FDC Alerts (${alerts.length})`
                }
              >
                {alerts.length === 0 ? (
                  <p className="text-slate-500 text-sm py-4">
                    {language === 'ko' ? '현재 관리선 이탈 알림이 없습니다.' : 'No out-of-control alerts.'}
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                    {alerts.slice(0, 20).map((a, idx) => (
                      <div
                        key={idx}
                        className={`p-2 rounded text-sm ${
                          a.severity === 'critical'
                            ? 'bg-red-50 border border-red-200 text-red-800'
                            : 'bg-amber-50 border border-amber-200 text-amber-800'
                        }`}
                      >
                        <span className="font-medium">
                          {language === 'ko' ? a.columnKorean : a.column}
                        </span>
                        {' '}
                        {language === 'ko' ? '현재' : 'current'}{' '}
                        {a.currentValue.toFixed(2)} (
                        {language === 'ko' ? '평균' : 'mean'}{' '}
                        {a.mean.toFixed(2)}, σ {a.deviation.toFixed(1)})
                      </div>
                    ))}
                    {alerts.length > 20 && (
                      <p className="text-slate-500 text-xs">
                        {language === 'ko' ? '외 ' : '+ '}
                        {alerts.length - 20}
                        {language === 'ko' ? '건' : ' more'}
                      </p>
                    )}
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
