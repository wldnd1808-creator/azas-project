'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import Card from '@/components/Card';
import { useLanguage } from '@/contexts/LanguageContext';
import { authHeader, dashboardApiUrl } from '@/lib/api-client';

type LotPassFail = {
  lotId: string;
  passFailResult: string | null;
  recordCount: number;
  latestDate: string | null;
};

/** 기간 라벨 (월별 기본) */
function getPeriodLabels(language: string) {
  const today = new Date();
  const monthNum = today.getMonth() + 1;
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const monthLabel = `${monthNum}/1~${monthNum}/${lastDay}`;
  return { monthLabel };
}

export default function QualityHeatmapPage() {
  const { t, language } = useLanguage();
  const [lots, setLots] = useState<LotPassFail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { monthLabel } = getPeriodLabels(language);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(dashboardApiUrl('/api/dashboard/lot-status?period=month&all=1'), { headers: authHeader() })
      .then((res) => res.ok ? res.json() : null)
      .then((json) => {
        if (json?.success && Array.isArray(json.lots)) {
          setLots(
            json.lots.map((lot: { lotId: string; passFailResult: string | null; recordCount: number; latestDate: string | null }) => ({
              lotId: lot.lotId,
              passFailResult: lot.passFailResult,
              recordCount: lot.recordCount ?? 0,
              latestDate: lot.latestDate ?? null,
            }))
          );
        } else {
          setLots([]);
          setError(json?.error ?? 'Request failed');
        }
      })
      .catch((err) => {
        setLots([]);
        setError(String(err?.message || err));
      })
      .finally(() => setLoading(false));
  }, []);

  // API는 항상 '합격'/'불합격' 반환
  const passCount = lots.filter((l) => l.passFailResult === '합격').length;
  const failCount = lots.filter((l) => l.passFailResult === '불합격').length;
  const unknownCount = lots.length - passCount - failCount;

  const titleKo = 'LOT별 합격·불합격 현황';
  const titleEn = 'LOT Pass / Fail Status';

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
          </div>

          <Card title={language === 'ko' ? `LOT별 합격·불합격 (이번 달 ${monthLabel})` : `LOT pass/fail (this month ${monthLabel})`}>
            {loading ? (
              <div className="py-12 text-center text-slate-500">
                {language === 'ko' ? '로딩 중...' : 'Loading...'}
              </div>
            ) : error ? (
              <div className="py-6 text-center text-amber-700 bg-amber-50 rounded-lg border border-amber-200">
                {error}
              </div>
            ) : lots.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                {language === 'ko'
                  ? '표시할 LOT가 없습니다. (이번 달 데이터 또는 LOT·합불 컬럼 확인)'
                  : 'No LOTs to display. (Check this month’s data or LOT / pass-fail columns.)'}
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-4 mb-4 text-sm">
                  <span className="text-slate-600">
                    {language === 'ko' ? '합격:' : 'Pass:'}{' '}
                    <span className="font-semibold text-green-700">{passCount}</span>
                  </span>
                  <span className="text-slate-600">
                    {language === 'ko' ? '불합격:' : 'Fail:'}{' '}
                    <span className="font-semibold text-red-700">{failCount}</span>
                  </span>
                  {unknownCount > 0 && (
                    <span className="text-slate-500">
                      {language === 'ko' ? '미표시:' : 'Unknown:'}{' '}
                      <span className="font-medium">{unknownCount}</span>
                    </span>
                  )}
                </div>
                <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 z-10">
                      <tr>
                        <th className="text-left py-2 px-3 font-medium text-slate-700 whitespace-nowrap">
                          LOT
                        </th>
                        <th className="text-left py-2 px-3 font-medium text-slate-700 whitespace-nowrap">
                          {language === 'ko' ? '합격 여부' : 'Pass / Fail'}
                        </th>
                        <th className="text-left py-2 px-3 font-medium text-slate-700 whitespace-nowrap">
                          {language === 'ko' ? '기록 수' : 'Records'}
                        </th>
                        <th className="text-left py-2 px-3 font-medium text-slate-700 whitespace-nowrap">
                          {language === 'ko' ? '최근 시각' : 'Latest'}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {lots.map((lot, idx) => (
                        <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono text-slate-900">{lot.lotId}</td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            {lot.passFailResult != null && lot.passFailResult !== '' ? (
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${
                                  lot.passFailResult === '합격'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-red-100 text-red-700'
                                }`}
                              >
                                {language === 'ko' ? lot.passFailResult : (lot.passFailResult === '합격' ? 'Pass' : 'Fail')}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-slate-600">{lot.recordCount}</td>
                          <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                            {lot.latestDate
                              ? new Date(lot.latestDate).toLocaleString(language === 'ko' ? 'ko-KR' : 'en-US', {
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
