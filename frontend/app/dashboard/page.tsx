'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import Card from '@/components/Card';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDashboardRefresh } from '@/contexts/DashboardRefreshContext';
import { authHeader, dashboardApiUrl } from '@/lib/api-client';

type SummaryData = {
  productionToday?: number;
  equipmentRate?: number;
  qualityRate?: number;
  energyToday?: number;
  workers?: number;
  orders?: number;
};

type SummaryState = {
  data: SummaryData | null;
  fromDb: boolean;
  tables: string[];
  usedTables: string[];
  error: string | null;
};

type Alert = {
  column: string;
  columnKorean: string;
  currentValue: number;
  mean: number;
  upperLimit: number;
  lowerLimit: number;
  deviation: number;
  severity: 'warning' | 'critical';
};

type SensorData = {
  name: string;
  nameKorean: string;
  currentValue: number;
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
  unit: string;
};

export default function DashboardPage() {
  const { t, language } = useLanguage();
  const { setLastUpdate, setNotificationEnabled, autoRefresh, notificationEnabled, registerRefresh } = useDashboardRefresh();
  const [summaryState, setSummaryState] = useState<SummaryState>({
    data: null,
    fromDb: false,
    tables: [],
    usedTables: [],
    error: null,
  });
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [sensors, setSensors] = useState<SensorData[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [loadingSensors, setLoadingSensors] = useState(true);
  const [previousAlertCount, setPreviousAlertCount] = useState(0);
  const [selectedSensor, setSelectedSensor] = useState<string | null>(null);
  const [sensorHistory, setSensorHistory] = useState<{ time: string; [key: string]: string | number }[]>([]);

  type CalendarDay = { day: number; production: number; defectRate: number };
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [loadingCalendar, setLoadingCalendar] = useState(true);
  const [productionUnit, setProductionUnit] = useState({ ko: '개', en: 'ea' });

  /** 캘린더만 따로 갱신할 때 사용 (overview에는 포함되므로 평소에는 fetchDashboardData로 한 번에 로드) */
  const fetchCalendar = () => {
    setLoadingCalendar(true);
    const now = new Date();
    fetch(dashboardApiUrl(`/api/dashboard/calendar-month?year=${now.getFullYear()}&month=${now.getMonth() + 1}`), {
      headers: authHeader(),
    })
      .then((res) => res.ok ? res.json() : null)
      .then((json) => {
        if (json?.success && Array.isArray(json.days)) {
          setCalendarDays(json.days);
          setProductionUnit({
            ko: json.productionUnit ?? '개',
            en: json.productionUnitEn ?? 'ea',
          });
        }
      })
      .catch((err) => console.error('Calendar fetch error:', err))
      .finally(() => setLoadingCalendar(false));
  };

  /** 대시보드 데이터 1회 요청으로 한 번에 로드 (summary, alerts, realtime, calendar) */
  const fetchDashboardData = () => {
    setLoadingAlerts(true);
    setLoadingSensors(true);
    setLoadingCalendar(true);

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    // 10초 후에도 응답 없으면 캘린더 로딩 해제 + placeholder 표시 (Vercel 등 지연 환경 대비)
    let calendarFallbackTimer: ReturnType<typeof setTimeout> | undefined = setTimeout(() => {
      setLoadingCalendar(false);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      setCalendarDays(Array.from({ length: lastDay }, (_, i) => ({ day: i + 1, production: 0, defectRate: 0 })));
    }, 10000);

    Promise.all([
      fetch(dashboardApiUrl('/api/dashboard/summary'), { headers: authHeader(), cache: 'no-store' as any }),
      fetch(dashboardApiUrl('/api/dashboard/alerts'), { headers: authHeader(), cache: 'no-store' as any }),
      fetch(dashboardApiUrl('/api/dashboard/realtime'), { headers: authHeader(), cache: 'no-store' as any }),
      fetch(dashboardApiUrl(`/api/dashboard/calendar-month?year=${year}&month=${month}`), { headers: authHeader(), cache: 'no-store' as any }),
    ])
      .then(async ([summaryRes, alertsRes, realtimeRes, calendarRes]) => {
        const [summary, alertsPayload, realtimePayload, calendarPayload] = await Promise.all([
          summaryRes.ok ? summaryRes.json() : { success: false, error: summaryRes.statusText },
          alertsRes.ok ? alertsRes.json() : { success: false, alerts: [], error: alertsRes.statusText },
          realtimeRes.ok ? realtimeRes.json() : { success: false, sensors: [], error: realtimeRes.statusText },
          calendarRes.ok ? calendarRes.json() : { success: false, days: [], error: calendarRes.statusText },
        ]);

        if (!summary?.success) {
          clearTimeout(calendarFallbackTimer);
          setSummaryState((s) => ({ ...s, data: null, fromDb: false, error: summary?.error ?? 'Request failed' }));
          setLoadingAlerts(false);
          setLoadingSensors(false);
          setLoadingCalendar(false);
          // summary 실패해도 캘린더 칸은 표시 (해당 월 1~말일 빈 데이터)
          const lastDay = new Date(year, month, 0).getDate();
          setCalendarDays(Array.from({ length: lastDay }, (_, i) => ({ day: i + 1, production: 0, defectRate: 0 })));
          return;
        }

        if (summary.success) {
          setSummaryState({
            data: summary.data ?? null,
            fromDb: Boolean(summary.fromDb),
            tables: Array.isArray(summary.tables) ? summary.tables : [],
            usedTables: Array.isArray(summary.usedTables) ? summary.usedTables : [],
            error: null,
          });
          setLastUpdate(new Date());
        } else {
          setSummaryState((s) => ({ ...s, data: null, fromDb: false, error: summary.error ?? null }));
        }

        if (alertsPayload.success && Array.isArray(alertsPayload.alerts)) {
          const newAlerts = alertsPayload.alerts as Alert[];
          const criticalCount = newAlerts.filter((a) => a.severity === 'critical').length;
          if (notificationEnabled && criticalCount > 0 && criticalCount > previousAlertCount) {
            const newCritical = criticalCount - previousAlertCount;
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('FDC 이상감지 알림', {
                body: `${newCritical}개의 새로운 위험 항목이 감지되었습니다.`,
                icon: '/favicon.ico',
                tag: 'fdc-alert',
              });
            }
          }
          setAlerts(newAlerts);
          setPreviousAlertCount(criticalCount);
        }

        if (realtimePayload.success && Array.isArray(realtimePayload.sensors)) {
          setSensors(realtimePayload.sensors as SensorData[]);
        }

        if (calendarPayload.success && Array.isArray(calendarPayload.days) && calendarPayload.days.length > 0) {
          setCalendarDays(calendarPayload.days as { day: number; production: number; defectRate: number }[]);
          setProductionUnit({
            ko: calendarPayload.productionUnit ?? '개',
            en: calendarPayload.productionUnitEn ?? 'ea',
          });
        } else {
          // API 실패 또는 빈 데이터 시 해당 월 1~말일까지 빈 칸으로 채워서 요일 아래가 항상 표시되도록
          const lastDay = new Date(year, month, 0).getDate();
          setCalendarDays(
            Array.from({ length: lastDay }, (_, i) => ({ day: i + 1, production: 0, defectRate: 0 }))
          );
        }

        clearTimeout(calendarFallbackTimer);
        setLoadingAlerts(false);
        setLoadingSensors(false);
        setLoadingCalendar(false);
      })
      .catch((err) => {
        clearTimeout(calendarFallbackTimer);
        setSummaryState((s) => ({ ...s, data: null, fromDb: false, error: String(err?.message || err) }));
        setLoadingAlerts(false);
        setLoadingSensors(false);
        setLoadingCalendar(false);
        const now = new Date();
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        setCalendarDays(Array.from({ length: lastDay }, (_, i) => ({ day: i + 1, production: 0, defectRate: 0 })));
      });
  };

  useEffect(() => {
    registerRefresh(fetchDashboardData);
    return () => registerRefresh(null);
  }, []);

  useEffect(() => {
    fetchDashboardData();
    
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          setNotificationEnabled(true);
        }
      });
    } else if ('Notification' in window && Notification.permission === 'granted') {
      setNotificationEnabled(true);
    }
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => fetchDashboardData(), 10000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1).getDay();
  const lastDayOfMonth = new Date(currentYear, currentMonth, 0).getDate();
  // Vercel 등에서 API 실패/지연 시에도 칸이 보이도록: 비어 있으면 해당 월 1~말일로 채움
  const calendarDaysToShow =
    Array.isArray(calendarDays) && calendarDays.length > 0
      ? calendarDays
      : Array.from({ length: lastDayOfMonth }, (_, i) => ({ day: i + 1, production: 0, defectRate: 0 }));

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <Navbar />
      
      <main className="ml-64 mr-80 mt-16 bg-slate-100 min-h-[calc(100vh-4rem)] p-6">
        <div className="max-w-full mx-auto">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{t('dashboard.title')}</h2>
              <p className="text-slate-600 mt-1">{t('dashboard.subtitle')}</p>
              {summaryState.error && (
                <div className="mt-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
                  {language === 'ko' ? '공정 DB 연결 실패: ' : 'Process DB connection failed: '}{summaryState.error}
                </div>
              )}
            </div>
            {/* 실시간 센서 모니터링 (오른쪽 상단 간략) */}
            {!loadingSensors && sensors.length > 0 && (
              <div className="shrink-0 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                <div className="text-xs font-medium text-slate-500 mb-2">
                  {language === 'ko' ? '실시간 센서' : 'Real-time sensors'}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {[
                    sensors.find((s) => /humidity/i.test(s.name)),
                    sensors.find((s) => /tank_pressure|tank.?pressure/i.test(s.name)),
                    sensors.find((s) => /temperature|temp/i.test(s.name) && !/pressure/i.test(s.name)),
                  ]
                    .filter((s): s is SensorData => s != null)
                    .map((sensor, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSelectedSensor(sensor.name);
                        fetch(dashboardApiUrl('/api/dashboard/realtime?history=true'), { headers: authHeader() })
                          .then((res) => res.ok ? res.json() : null)
                          .then((json) => {
                            if (json?.success && Array.isArray(json.history)) setSensorHistory(json.history);
                          })
                          .catch(() => {});
                      }}
                      className="text-left hover:bg-slate-50 rounded px-1 -mx-1"
                    >
                      <span className="text-xs text-slate-600">{sensor.nameKorean}</span>
                      <span className="ml-1 text-sm font-semibold text-slate-900">{sensor.currentValue.toFixed(1)}{sensor.unit}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* FDC 이상감지 ALERT */}
          {!loadingAlerts && alerts.length > 0 && (
            <div className="mb-6 p-4 rounded-lg bg-red-50 border-2 border-red-300">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h3 className="text-lg font-bold text-red-900">
                  {language === 'ko' ? 'FDC 이상감지 알림' : 'FDC Anomaly Detection Alert'}
                </h3>
                <span className="ml-auto text-sm text-red-700">
                  {language === 'ko' ? `${alerts.length}개 항목 이상` : `${alerts.length} anomalies detected`}
                </span>
              </div>
              <div className="space-y-2">
                {alerts.slice(0, 5).map((alert, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-white rounded border border-red-200">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          alert.severity === 'critical' ? 'bg-red-600 text-white' : 'bg-yellow-500 text-white'
                        }`}>
                          {alert.severity === 'critical' ? (language === 'ko' ? '위험' : 'CRITICAL') : (language === 'ko' ? '경고' : 'WARNING')}
                        </span>
                        <span className="font-medium text-slate-900">{alert.columnKorean}</span>
                      </div>
                      <div className="text-xs text-slate-600 mt-1">
                        {language === 'ko' ? '현재값' : 'Current'}: <span className="font-mono font-bold text-red-700">{alert.currentValue.toFixed(2)}</span>
                        {' | '}
                        {language === 'ko' ? '관리선' : 'Control limits'}: {alert.lowerLimit.toFixed(2)} ~ {alert.upperLimit.toFixed(2)}
                        {' | '}
                        {language === 'ko' ? '이탈' : 'Deviation'}: {alert.deviation.toFixed(1)}σ
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 센서 추이 모달 */}
          {selectedSensor && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
              onClick={() => setSelectedSensor(null)}
            >
              <div 
                className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-slate-900">
                    {sensors.find((s) => s.name === selectedSensor)?.nameKorean || selectedSensor}
                    {' '}
                    {language === 'ko' ? '추이' : 'Trend'}
                  </h3>
                  <button
                    onClick={() => setSelectedSensor(null)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="space-y-2">
                  {sensorHistory.length > 0 ? (
                    <>
                      <div className="h-64 relative">
                        <svg className="w-full h-full" viewBox="0 0 800 300">
                          <defs>
                            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                            </linearGradient>
                          </defs>
                          {/* 차트 그리기 */}
                          {(() => {
                            const values = sensorHistory.map((h) => Number(h[selectedSensor] ?? 0));
                            const maxVal = Math.max(...values);
                            const minVal = Math.min(...values);
                            const range = maxVal - minVal || 1;
                            const points = values.map((v, i) => {
                              const x = 50 + (i / (values.length - 1)) * 700;
                              const y = 250 - ((v - minVal) / range) * 200;
                              return `${x},${y}`;
                            }).join(' ');
                            const areaPoints = `50,250 ${points} ${50 + 700},250`;
                            return (
                              <>
                                <polyline
                                  points={areaPoints}
                                  fill="url(#lineGradient)"
                                  stroke="none"
                                />
                                <polyline
                                  points={points}
                                  fill="none"
                                  stroke="#3b82f6"
                                  strokeWidth="2"
                                />
                                {values.map((v, i) => {
                                  const x = 50 + (i / (values.length - 1)) * 700;
                                  const y = 250 - ((v - minVal) / range) * 200;
                                  return (
                                    <circle
                                      key={i}
                                      cx={x}
                                      cy={y}
                                      r="3"
                                      fill="#3b82f6"
                                    />
                                  );
                                })}
                                <text x="10" y="30" fontSize="12" fill="#64748b">{maxVal.toFixed(1)}</text>
                                <text x="10" y="260" fontSize="12" fill="#64748b">{minVal.toFixed(1)}</text>
                              </>
                            );
                          })()}
                        </svg>
                      </div>
                      <div className="text-xs text-slate-500 text-center">
                        {language === 'ko' ? '최근 50개 데이터' : 'Recent 50 data points'}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-12 text-slate-500">
                      {language === 'ko' ? '데이터를 불러오는 중...' : 'Loading data...'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 금월 캘린더: 일별 생산량·불량률 */}
          <Card title={language === 'ko' ? `${currentYear}년 ${currentMonth}월` : `${currentMonth}/${currentYear}`}>
            {loadingCalendar ? (
              <div className="py-12 text-center text-slate-500 text-sm">
                {language === 'ko' ? '캘린더 데이터를 불러오는 중...' : 'Loading calendar...'}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-lg overflow-hidden border border-slate-200">
                  {(language === 'ko' ? ['일', '월', '화', '수', '목', '금', '토'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']).map((d) => (
                    <div key={d} className="bg-slate-100 py-2 text-center text-xs font-medium text-slate-600">
                      {d}
                    </div>
                  ))}
                  {Array.from({ length: firstDayOfMonth }, (_, i) => (
                    <div key={`empty-${i}`} className="bg-slate-50 min-h-[80px]" />
                  ))}
                  {calendarDaysToShow.map((item) => {
                    const prod = Number(item?.production ?? 0);
                    const rate = Number(item?.defectRate ?? 0);
                    return (
                      <div
                        key={item.day}
                        className="bg-white p-2 min-h-[80px] flex flex-col"
                      >
                        <div className="text-sm font-semibold text-slate-800">{item.day}</div>
                        <div className="mt-1 text-xs text-slate-600">
                          <div>{language === 'ko' ? '생산량' : 'Production'}: {prod.toLocaleString()} {language === 'ko' ? productionUnit.ko : productionUnit.en}</div>
                          <div className={rate <= 5 ? 'text-green-600' : 'text-red-600'}>
                            {language === 'ko' ? '불량률' : 'Defect'}: {rate.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
