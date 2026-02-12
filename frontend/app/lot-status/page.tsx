'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import Card from '@/components/Card';
import { useLanguage } from '@/contexts/LanguageContext';
import { authHeader, dashboardApiUrl } from '@/lib/api-client';

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

type Period = 'day' | 'week' | 'month';

type SortKey = 'lotId' | 'lithiumInput' | 'addictiveRatio' | 'processTime' | 'humidity' | 'tankPressure';
type SortDir = 'asc' | 'desc';

function getSortValue(lot: LotStatus, key: SortKey): number | string {
  switch (key) {
    case 'lotId':
      return lot.lotId;
    case 'lithiumInput':
      return lot.lithiumInput ?? -Infinity;
    case 'addictiveRatio':
      return lot.addictiveRatio ?? -Infinity;
    case 'processTime':
      return lot.processTime ?? -Infinity;
    case 'humidity':
      return lot.humidity ?? -Infinity;
    case 'tankPressure':
      return lot.tankPressure ?? -Infinity;
    default:
      return '';
  }
}

/** 오늘 날짜 기준 일/주/월 라벨. 일별: 1/30, 주별: 1/26~2/1(일주일), 월별: 1/1~1/31(해당 월 전체) */
function getPeriodLabels(language: string) {
  const today = new Date();
  const dayLabel = `${today.getMonth() + 1}/${today.getDate()}`;
  const dayOfWeek = (today.getDay() + 6) % 7; // 0=월요일
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - dayOfWeek);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const weekLabel = `${weekStart.getMonth() + 1}/${weekStart.getDate()}~${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`;
  const monthNum = today.getMonth() + 1;
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const monthLabel = `${monthNum}/1~${monthNum}/${lastDayOfMonth}`;
  return { dayLabel, weekLabel, monthLabel };
}

export default function LotStatusPage() {
  const { t, language } = useLanguage();
  const [lotStatusList, setLotStatusList] = useState<LotStatus[]>([]);
  const [loadingLotStatus, setLoadingLotStatus] = useState(true);
  const [period, setPeriod] = useState<Period>('day');
  const [selectedLot, setSelectedLot] = useState<LotStatus | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportContent, setReportContent] = useState<string>('');
  const [reportError, setReportError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const { dayLabel, weekLabel, monthLabel } = getPeriodLabels(language);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortedList = useMemo(() => {
    if (!sortKey) return lotStatusList;
    const isNum = sortKey !== 'lotId';
    return [...lotStatusList].sort((a, b) => {
      const va = getSortValue(a, sortKey);
      const vb = getSortValue(b, sortKey);
      const aNull = isNum && (va === -Infinity || va == null);
      const bNull = isNum && (vb === -Infinity || vb == null);
      if (aNull && bNull) return 0;
      if (aNull) return 1;
      if (bNull) return -1;
      let cmp = 0;
      if (typeof va === 'number' && typeof vb === 'number') {
        cmp = va - vb;
      } else {
        cmp = String(va).localeCompare(String(vb));
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [lotStatusList, sortKey, sortDir]);

  const [lotStatusError, setLotStatusError] = useState<string | null>(null);
  const [lotStatusDebug, setLotStatusDebug] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    setLoadingLotStatus(true);
    setLotStatusError(null);
    setLotStatusDebug(null);
    fetch(dashboardApiUrl(`/api/dashboard/lot-status?period=${period}&t=${Date.now()}`), { cache: 'no-store', headers: authHeader() })
      .then((res) => res.json().catch(() => null))
      .then((json) => {
        if (json?.success && Array.isArray(json.lots)) {
          setLotStatusList(json.lots);
          setLotStatusError(null);
          setLotStatusDebug(json?._debug ?? null);
          
          // 불량 LOT 자동 레포트 생성 (백그라운드에서 실행)
          const failedLots = json.lots.filter((lot: LotStatus) => 
            lot.passFailResult && lot.passFailResult !== '합격' && lot.passFailResult !== 'Pass'
          );
          
          // 불량 LOT이 있으면 자동으로 레포트 생성 (사용자 개입 없이)
          failedLots.forEach((lot: LotStatus) => {
            // 레포트가 이미 있는지 확인하고, 없으면 생성
            fetch(dashboardApiUrl(`/api/dashboard/lot-defect-report?lotId=${encodeURIComponent(lot.lotId)}`), {
              headers: authHeader()
            })
              .then((res) => {
                if (res.status === 404) {
                  // 레포트 없음 → 자동 생성
                  return fetch(dashboardApiUrl('/api/dashboard/lot-defect-report'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...authHeader() },
                    body: JSON.stringify({
                      lotId: lot.lotId,
                      lotData: {
                        passFailResult: lot.passFailResult,
                        lithiumInput: lot.lithiumInput,
                        addictiveRatio: lot.addictiveRatio,
                        processTime: lot.processTime,
                        humidity: lot.humidity,
                        tankPressure: lot.tankPressure,
                        recordCount: lot.recordCount,
                        latestDate: lot.latestDate,
                        params: lot.params,
                      },
                      language: language === 'ko' ? 'ko' : 'en',
                    }),
                  });
                }
                return null;
              })
              .catch((err) => {
                console.warn(`Failed to auto-generate report for lot ${lot.lotId}:`, err);
              });
          });
        } else {
          setLotStatusList([]);
          setLotStatusError(json?.error ?? (json ? '데이터 없음' : 'API 오류'));
          setLotStatusDebug(json?._debug ?? null);
        }
      })
      .catch((err) => {
        console.error('Lot status fetch error:', err);
        setLotStatusList([]);
        setLotStatusError(err?.message ?? '네트워크 오류');
      })
      .finally(() => setLoadingLotStatus(false));
  }, [period, language]);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!selectedLot) {
      setReportContent('');
      setReportError(null);
      return;
    }
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setReportLoading(true);
    setReportError(null);
    setReportContent('');
    const lot = selectedLot;
    const ac = abortRef.current;

    // 1) DB에서 레포트 조회 → 없으면 2) 해당 LOT 레포트 자동 생성 후 표시
    (async () => {
      try {
        const res = await fetch(
          dashboardApiUrl(`/api/dashboard/lot-defect-report?lotId=${encodeURIComponent(lot.lotId)}`),
          { signal: ac.signal, headers: authHeader() }
        );
        if (res.status === 404) {
          // 레포트 없음 → 이 LOT에 대해 자동 생성 후 표시
          if (ac.signal.aborted) return;
          const postRes = await fetch(dashboardApiUrl('/api/dashboard/lot-defect-report'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeader() },
            body: JSON.stringify({
              lotId: lot.lotId,
              lotData: {
                passFailResult: lot.passFailResult,
                lithiumInput: lot.lithiumInput,
                addictiveRatio: lot.addictiveRatio,
                processTime: lot.processTime,
                humidity: lot.humidity,
                tankPressure: lot.tankPressure,
                recordCount: lot.recordCount,
                latestDate: lot.latestDate,
                params: lot.params,
              },
              language: language === 'ko' ? 'ko' : 'en',
            }),
            signal: ac.signal,
          });
          const postData = await postRes.json().catch(() => ({}));
          if (ac.signal.aborted) return;
          if (postRes.ok && postData.success && postData.report != null) {
            setReportContent(postData.report);
            setReportError(null);
          } else {
            setReportError(
              postData.error ||
              (language === 'ko' ? '레포트 생성에 실패했습니다. (OpenAI API 키 설정 확인)' : 'Report generation failed. Check OpenAI API key settings.')
            );
          }
          setReportLoading(false);
          return;
        }
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setReportError(data.error || res.statusText || 'Failed to load');
          setReportLoading(false);
          return;
        }

        const data = await res.json();
        if (data.success && data.report != null) {
          setReportContent(data.report);
          setReportError(null);
        } else {
          setReportContent('');
          setReportError(language === 'ko' ? '레포트를 불러올 수 없습니다.' : 'Failed to load report.');
        }
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
        setReportError(String(err instanceof Error ? err.message : err));
        setReportContent('');
      } finally {
        setReportLoading(false);
      }
    })();

    return () => ac.abort();
  }, [selectedLot, language]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <Navbar />

      <main className="ml-64 mr-80 mt-16 bg-slate-100 min-h-[calc(100vh-4rem)] p-6">
        <div className="max-w-full mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">{t('dashboard.lotStatus')}</h2>
          </div>

          <Card title={t('dashboard.lotStatus')}>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="text-sm text-slate-600">{language === 'ko' ? '기간:' : 'Period:'}</span>
              <div className="flex rounded-lg border border-slate-200 overflow-hidden" role="group" aria-label={language === 'ko' ? '기간 선택' : 'Period selection'}>
                <button
                  type="button"
                  onClick={() => setPeriod('day')}
                  className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                    period === 'day' ? 'bg-slate-800 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {language === 'ko' ? `일별 (${dayLabel})` : `Daily (${dayLabel})`}
                </button>
                <button
                  type="button"
                  onClick={() => setPeriod('week')}
                  className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-l border-slate-200 transition-colors ${
                    period === 'week' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {language === 'ko' ? `주별 (${weekLabel})` : `Weekly (${weekLabel})`}
                </button>
                <button
                  type="button"
                  onClick={() => setPeriod('month')}
                  className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-l border-slate-200 transition-colors ${
                    period === 'month' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {language === 'ko' ? `월별 (${monthLabel})` : `Monthly (${monthLabel})`}
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded px-3 py-2 mb-4">
              {language === 'ko'
                ? (period === 'day' ? '오늘 기준 불합격 LOT만 표시.' : period === 'week' ? '이번 주 기준 불합격 LOT만 표시.' : '이번 달 기준 불합격 LOT만 표시.')
                : (period === 'day' ? 'Failed LOTs only for today.' : period === 'week' ? 'Failed LOTs only for this week.' : 'Failed LOTs only for this month.')}
            </p>
            {loadingLotStatus && (
              <div className="py-8 text-center text-slate-500 text-sm">
                {language === 'ko' ? 'LOT별 데이터를 불러오는 중...' : 'Loading LOT data...'}
              </div>
            )}
            {!loadingLotStatus && lotStatusList.length === 0 && (
              <div className="py-8 px-4 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-sm space-y-3">
                <p>
                  {language === 'ko'
                    ? (period === 'day' ? '오늘 기준 불합격 LOT가 없습니다.' : period === 'week' ? '이번 주 기준 불합격 LOT가 없습니다.' : '이번 달 기준 불합격 LOT가 없습니다.')
                    : (period === 'day' ? 'No failed LOTs for today.' : period === 'week' ? 'No failed LOTs for this week.' : 'No failed LOTs for this month.')}
                </p>
                {lotStatusError && (
                  <p className="text-amber-700 font-medium">
                    {language === 'ko' ? 'API 오류: ' : 'API error: '}{lotStatusError}
                  </p>
                )}
                {lotStatusDebug && Object.keys(lotStatusDebug).length > 0 && (
                  <details className="mt-2 text-xs bg-white/60 rounded p-2 border border-slate-200">
                    <summary className="cursor-pointer text-slate-500">{language === 'ko' ? '원인 확인용 정보' : 'Debug info'}</summary>
                    <pre className="mt-2 overflow-auto max-h-40 text-left whitespace-pre-wrap break-all">
                      {JSON.stringify(lotStatusDebug, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            )}
            {!loadingLotStatus && lotStatusList.length > 0 && (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 px-3 font-medium text-slate-700 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1">
                            {t('dashboard.lotId')}
                            <button type="button" onClick={() => handleSort('lotId')} title={language === 'ko' ? '정렬 (클릭 시 오름차순↔내림차순)' : 'Sort (click to toggle asc/desc)'} className={`p-0.5 rounded text-sm ${sortKey === 'lotId' ? 'bg-slate-200 text-slate-800' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}>{sortKey === 'lotId' ? (sortDir === 'asc' ? '↑' : '↓') : '⇅'}</button>
                          </span>
                        </th>
                        <th className="text-left py-2 px-3 font-medium text-slate-700 whitespace-nowrap">{language === 'ko' ? '합격 여부' : 'Pass status'}</th>
                        <th className="text-left py-2 px-3 font-medium text-slate-700 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1">
                            {language === 'ko' ? '리튬 투입량 (kg)' : 'Lithium input (kg)'}
                            <button type="button" onClick={() => handleSort('lithiumInput')} title={language === 'ko' ? '정렬 (클릭 시 오름차순↔내림차순)' : 'Sort (click to toggle asc/desc)'} className={`p-0.5 rounded text-sm ${sortKey === 'lithiumInput' ? 'bg-slate-200 text-slate-800' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}>{sortKey === 'lithiumInput' ? (sortDir === 'asc' ? '↑' : '↓') : '⇅'}</button>
                          </span>
                        </th>
                        <th className="text-left py-2 px-3 font-medium text-slate-700 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1">
                            {language === 'ko' ? '첨가제 비율' : 'Additive ratio'}
                            <button type="button" onClick={() => handleSort('addictiveRatio')} title={language === 'ko' ? '정렬 (클릭 시 오름차순↔내림차순)' : 'Sort (click to toggle asc/desc)'} className={`p-0.5 rounded text-sm ${sortKey === 'addictiveRatio' ? 'bg-slate-200 text-slate-800' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}>{sortKey === 'addictiveRatio' ? (sortDir === 'asc' ? '↑' : '↓') : '⇅'}</button>
                          </span>
                        </th>
                        <th className="text-left py-2 px-3 font-medium text-slate-700 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1">
                            {language === 'ko' ? '공정 시간 (분)' : 'Process time (min)'}
                            <button type="button" onClick={() => handleSort('processTime')} title={language === 'ko' ? '정렬 (클릭 시 오름차순↔내림차순)' : 'Sort (click to toggle asc/desc)'} className={`p-0.5 rounded text-sm ${sortKey === 'processTime' ? 'bg-slate-200 text-slate-800' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}>{sortKey === 'processTime' ? (sortDir === 'asc' ? '↑' : '↓') : '⇅'}</button>
                          </span>
                        </th>
                        <th className="text-left py-2 px-3 font-medium text-slate-700 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1">
                            {language === 'ko' ? '습도 (%)' : 'Humidity (%)'}
                            <button type="button" onClick={() => handleSort('humidity')} title={language === 'ko' ? '정렬 (클릭 시 오름차순↔내림차순)' : 'Sort (click to toggle asc/desc)'} className={`p-0.5 rounded text-sm ${sortKey === 'humidity' ? 'bg-slate-200 text-slate-800' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}>{sortKey === 'humidity' ? (sortDir === 'asc' ? '↑' : '↓') : '⇅'}</button>
                          </span>
                        </th>
                        <th className="text-left py-2 px-3 font-medium text-slate-700 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1">
                            {language === 'ko' ? '탱크 압력 (kPa)' : 'Tank pressure (kPa)'}
                            <button type="button" onClick={() => handleSort('tankPressure')} title={language === 'ko' ? '정렬 (클릭 시 오름차순↔내림차순)' : 'Sort (click to toggle asc/desc)'} className={`p-0.5 rounded text-sm ${sortKey === 'tankPressure' ? 'bg-slate-200 text-slate-800' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}>{sortKey === 'tankPressure' ? (sortDir === 'asc' ? '↑' : '↓') : '⇅'}</button>
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedList.map((lot, idx) => (
                        <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-2 px-3">
                            <button
                              type="button"
                              onClick={() => setSelectedLot(lot)}
                              className="font-mono text-slate-900 hover:text-blue-600 hover:underline text-left"
                            >
                              {lot.lotId}
                            </button>
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            {lot.passFailResult != null && lot.passFailResult !== '' ? (
                              <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${
                                lot.passFailResult === '합격' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {lot.passFailResult}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            {lot.lithiumInput != null ? (
                              <span className="font-mono text-slate-900">{lot.lithiumInput.toFixed(4)}</span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            {lot.addictiveRatio != null ? (
                              <span className="font-mono text-slate-900">{lot.addictiveRatio.toFixed(4)}</span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            {lot.processTime != null ? (
                              <span className="font-mono text-slate-900">{lot.processTime.toFixed(2)}</span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            {lot.humidity != null ? (
                              <span className="font-mono text-slate-900">{lot.humidity.toFixed(2)}</span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            {lot.tankPressure != null ? (
                              <span className="font-mono text-slate-900">{lot.tankPressure.toFixed(2)}</span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="text-xs text-slate-500 mt-2">
                  {language === 'ko' ? 'prediction: 0=합격, 1=불합격(최근 기록). 리튬투입량·첨가제비율·공정시간·습도·탱크압력은 LOT별 평균. LOT ID 클릭 시 DB에 저장된 불량 원인 분석 레포트 표시.' : 'prediction: 0=Pass, 1=Fail (latest). lithium_input, additive_ratio, process_time, humidity, tank_pressure = LOT average. Click LOT ID to view defect analysis report from DB.'}
                </div>
              </>
            )}
          </Card>

          {/* 불량 원인 분석 레포트 모달 */}
          {selectedLot && (
            <div
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setSelectedLot(null)}
            >
              <div
                className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between p-4 border-b border-slate-200">
                  <h3 className="text-lg font-bold text-slate-900">
                    {language === 'ko' ? '불량 원인 분석 레포트' : 'Defect Cause Analysis Report'} - {selectedLot.lotId}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setSelectedLot(null)}
                    className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                  {reportLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
                      <p>{language === 'ko' ? '레포트를 불러오는 중...' : 'Loading report...'}</p>
                    </div>
                  ) : reportError ? (
                    <div className="py-6 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
                      {reportError}
                    </div>
                  ) : (
                    <div className="prose prose-slate max-w-none text-sm whitespace-pre-wrap">
                      {reportContent}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
