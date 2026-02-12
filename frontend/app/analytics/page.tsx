'use client';

import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import Card from '@/components/Card';
import { useLanguage } from '@/contexts/LanguageContext';
import { authHeader, dashboardApiUrl } from '@/lib/api-client';

/** 구간별 불량률 막대 1개용 데이터 타입 */
type IntervalDefectPoint = { interval: string; defectRate: number; fullLabel: string };

/** 주요 변수 구간별 불량률 Mock 데이터 (metal_impurity, humidity, lithium_input) */
const MOCK_INTERVAL_DEFECT: Record<string, { data: IntervalDefectPoint[]; average: number }> = {
  metal_impurity: {
    average: 0.082,
    data: [
      { interval: '0.008~0.014', fullLabel: '0.0080 - 0.0140 (ppm)', defectRate: 0.072 },
      { interval: '0.014~0.020', fullLabel: '0.0140 - 0.0200 (ppm)', defectRate: 0.065 },
      { interval: '0.020~0.026', fullLabel: '0.0200 - 0.0260 (ppm)', defectRate: 0.088 },
      { interval: '0.026~0.032', fullLabel: '0.0260 - 0.0320 (ppm)', defectRate: 0.091 },
      { interval: '0.032~0.045', fullLabel: '0.0320 - 0.0450 (ppm)', defectRate: 0.112 },
    ],
  },
  humidity: {
    average: 0.078,
    data: [
      { interval: '32~42', fullLabel: '32.0 - 42.0 (%)', defectRate: 0.055 },
      { interval: '42~52', fullLabel: '42.0 - 52.0 (%)', defectRate: 0.068 },
      { interval: '52~62', fullLabel: '52.0 - 62.0 (%)', defectRate: 0.082 },
      { interval: '62~72', fullLabel: '62.0 - 72.0 (%)', defectRate: 0.095 },
      { interval: '72~85', fullLabel: '72.0 - 85.0 (%)', defectRate: 0.108 },
    ],
  },
  lithium_input: {
    average: 0.081,
    data: [
      { interval: '0.94~0.98', fullLabel: '0.94 - 0.98 (mol ratio)', defectRate: 0.098 },
      { interval: '0.98~1.02', fullLabel: '0.98 - 1.02 (mol ratio)', defectRate: 0.058 },
      { interval: '1.02~1.06', fullLabel: '1.02 - 1.06 (mol ratio)', defectRate: 0.067 },
      { interval: '1.06~1.10', fullLabel: '1.06 - 1.10 (mol ratio)', defectRate: 0.089 },
      { interval: '1.10~1.15', fullLabel: '1.10 - 1.15 (mol ratio)', defectRate: 0.112 },
    ],
  },
};

/** 차트 표시 순서: metal_impurity → humidity → lithium_input */
const INTERVAL_DEFECT_ORDER: (keyof typeof MOCK_INTERVAL_DEFECT)[] = ['metal_impurity', 'humidity', 'lithium_input'];

/** 불량률에 따른 붉은 계열 색 (높을수록 진함) */
function getBarColor(rate: number, maxRate: number): string {
  if (maxRate <= 0) return '#fca5a5';
  const t = Math.min(1, rate / maxRate);
  if (t < 0.33) return '#fca5a5';
  if (t < 0.66) return '#ef4444';
  return '#b91c1c';
}

/** 단일 변수 구간별 불량률 막대 차트 (Recharts) */
function IntervalDefectBarChart({
  variable,
  data,
  average,
  language,
}: {
  variable: string;
  data: IntervalDefectPoint[];
  average: number;
  language: string;
}) {
  const maxRate = Math.max(...data.map((d) => d.defectRate), average, 0.01);
  return (
    <div className="h-[260px] w-full">
      <h4 className="text-sm font-semibold text-slate-800 mb-2">
        [{variable}] {language === 'ko' ? '구간별 불량률' : 'Defect Rate by Section'}
      </h4>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="interval"
            angle={0}
            textAnchor="middle"
            tick={{
              fontSize: 10,
              fill: '#333333',
              dy: 8,
            }}
            height={48}
            interval={0}
            minTickGap={20}
            tickFormatter={(value: string) =>
              value
                .split('~')
                .map((s) => {
                  const n = parseFloat(s.trim());
                  if (Number.isNaN(n)) return s;
                  return Number.isInteger(n) ? n.toFixed(0) : n.toFixed(2);
                })
                .join('~')
            }
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#64748b' }}
            tickFormatter={(v) => (v * 100).toFixed(1) + '%'}
            domain={[0, Math.ceil(maxRate * 20) / 20]}
            label={
              language === 'ko'
                ? { value: '불량률', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }
                : { value: 'Defect Rate', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }
            }
          />
          <Tooltip
            formatter={(value: number) => [(value * 100).toFixed(2) + '%', language === 'ko' ? '불량률' : 'Defect Rate']}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.fullLabel ?? ''}
          />
          <ReferenceLine
            y={average}
            stroke="#2563eb"
            strokeDasharray="5 5"
            strokeWidth={2}
            label={{
              value: language === 'ko' ? '평균' : 'Average',
              position: 'right',
              fill: '#2563eb',
              fontSize: 11,
            }}
          />
          <Bar dataKey="defectRate" radius={[4, 4, 0, 0]} maxBarSize={48}>
            {data.map((entry, index) => (
              <Cell key={index} fill={getBarColor(entry.defectRate, maxRate)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

type AnalyticsData = {
  importance: { name: string; importance: number }[];
  defectLots?: { lot: string; defectRate: number; variables: Record<string, number> }[];
  defectTrend?: { time: string; defectRate: number; passRate: number }[];
  targetColumn?: string;
  error?: string;
};

export default function AnalyticsPage() {
  const { t, language } = useLanguage();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(dashboardApiUrl('/api/dashboard/analytics'), { headers: authHeader() })
      .then((res) => res.json())
      .then((json) => {
        if (json?.success) setData(json);
        else setError(json?.error || 'Failed to load');
      })
      .catch((err) => setError(String(err?.message || err)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <Navbar />

      <main className="ml-64 mr-80 mt-16 bg-slate-100 min-h-[calc(100vh-4rem)] p-6">
        <div className="max-w-full mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">{t('analytics.defectAnalysis')}</h2>
            <p className="text-slate-600 mt-1">{t('analytics.defectSubtitle')}</p>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-12 text-slate-500">
              {t('analytics.noData').replace('표시할 데이터가 없습니다.', '로딩 중...')}
            </div>
          )}
          {error && (
            <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
              {error}
            </div>
          )}
          {!loading && data && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card title={t('analytics.defectFactors')} className="lg:col-span-2">
                {data.importance.length === 0 ? (
                  <p className="text-slate-500 text-sm py-4">{t('analytics.noData')}</p>
                ) : (
                  <>
                    <p className="text-sm text-slate-600 mb-4">
                      {t('analytics.defectFactorsDesc')}
                      {data.targetColumn && (
                        <span className="font-mono text-xs ml-2 px-2 py-1 bg-slate-100 rounded">
                          {t('analytics.target')}: {data.targetColumn}
                        </span>
                      )}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {data.importance.slice(0, 10).map((item, idx) => (
                        <div key={item.name} className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-700">
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between text-sm mb-1">
                              <span className="font-medium text-slate-800 truncate" title={item.name}>
                                {item.name}
                              </span>
                              <span className="text-slate-600 ml-2">{(item.importance * 100).toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2">
                              <div
                                className="bg-indigo-500 h-2 rounded-full transition-all"
                                style={{ width: `${Math.min(100, item.importance * 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </Card>

              {/* 주요 변수 구간별 불량률 분석 (Mock) */}
              <Card
                title={language === 'ko' ? '주요 변수 구간별 불량률 분석' : 'Defect Rate by Interval (Key Variables)'}
                className="lg:col-span-2"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {INTERVAL_DEFECT_ORDER.map((variable) => {
                    const { data, average } = MOCK_INTERVAL_DEFECT[variable];
                    return (
                    <div key={variable} className="bg-slate-50/50 rounded-lg p-4 border border-slate-200">
                      <IntervalDefectBarChart
                        variable={variable}
                        data={data}
                        average={average}
                        language={language}
                      />
                    </div>
                    );
                  })}
                </div>
                <p className="text-slate-500 text-xs mt-3">
                  {language === 'ko'
                    ? '※ 현재 Mock 데이터로 표시 중입니다. 백엔드 API 연동 시 실제 데이터로 대체됩니다.'
                    : '※ Displaying mock data. Will be replaced with real data when API is connected.'}
                </p>
              </Card>

              {data.defectTrend && data.defectTrend.length > 0 && (
                <Card title={language === 'ko' ? '불량률 추이 (최근 7일)' : 'Defect Rate Trend (Last 7 Days)'} className="lg:col-span-2">
                  <p className="text-sm text-slate-600 mb-4">
                    {language === 'ko' ? '시간대별 불량률 변화 추이' : 'Hourly defect rate trend'}
                  </p>
                  <div className="h-64 relative">
                    <svg className="w-full h-full" viewBox="0 0 1000 300">
                      <defs>
                        <linearGradient id="defectGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                        </linearGradient>
                        <linearGradient id="passGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      {/* 그리드 라인 */}
                      {[0, 25, 50, 75, 100].map((y) => (
                        <g key={y}>
                          <line
                            x1="60"
                            y1={250 - (y / 100) * 200}
                            x2="950"
                            y2={250 - (y / 100) * 200}
                            stroke="#e2e8f0"
                            strokeWidth="1"
                          />
                          <text
                            x="45"
                            y={255 - (y / 100) * 200}
                            fontSize="10"
                            fill="#64748b"
                            textAnchor="end"
                          >
                            {y}%
                          </text>
                        </g>
                      ))}
                      {/* 불량률 차트 */}
                      {(() => {
                        const points = data.defectTrend!.map((d, i) => {
                          const x = 60 + (i / (data.defectTrend!.length - 1)) * 890;
                          const y = 250 - (d.defectRate / 100) * 200;
                          return `${x},${y}`;
                        }).join(' ');
                        const areaPoints = `60,250 ${points} ${60 + 890},250`;
                        return (
                          <>
                            <polyline
                              points={areaPoints}
                              fill="url(#defectGradient)"
                              stroke="none"
                            />
                            <polyline
                              points={points}
                              fill="none"
                              stroke="#ef4444"
                              strokeWidth="2"
                            />
                            {data.defectTrend!.map((d, i) => {
                              const x = 60 + (i / (data.defectTrend!.length - 1)) * 890;
                              const y = 250 - (d.defectRate / 100) * 200;
                              return (
                                <circle
                                  key={i}
                                  cx={x}
                                  cy={y}
                                  r="3"
                                  fill="#ef4444"
                                >
                                  <title>{d.time}: {d.defectRate.toFixed(2)}%</title>
                                </circle>
                              );
                            })}
                          </>
                        );
                      })()}
                      {/* X축 레이블 (시간) */}
                      {data.defectTrend.filter((_, i) => i % Math.ceil(data.defectTrend!.length / 10) === 0).map((d, i, arr) => {
                        const originalIndex = data.defectTrend!.findIndex((item) => item.time === d.time);
                        const x = 60 + (originalIndex / (data.defectTrend!.length - 1)) * 890;
                        const timeLabel = new Date(d.time).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
                        return (
                          <text
                            key={i}
                            x={x}
                            y="270"
                            fontSize="9"
                            fill="#64748b"
                            textAnchor="middle"
                          >
                            {timeLabel}
                          </text>
                        );
                      })}
                    </svg>
                  </div>
                  <div className="flex items-center justify-center gap-6 mt-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-red-500 rounded" />
                      <span className="text-slate-600">{language === 'ko' ? '불량률' : 'Defect Rate'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">
                        {language === 'ko' ? '평균' : 'Avg'}: {(data.defectTrend.reduce((sum, d) => sum + d.defectRate, 0) / data.defectTrend.length).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </Card>
              )}

              {data.defectLots && data.defectLots.length > 0 && (
                <Card title={t('analytics.recentDefectLots')} className="lg:col-span-2">
                  <p className="text-sm text-slate-600 mb-4">{t('analytics.recentDefectLotsDesc')}</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-2 px-3 font-medium text-slate-700">LOT</th>
                          <th className="text-left py-2 px-3 font-medium text-slate-700">{t('analytics.defectRate')}</th>
                          <th className="text-left py-2 px-3 font-medium text-slate-700">{t('analytics.topFactors')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.defectLots.slice(0, 8).map((lot, idx) => {
                          const topVars = Object.entries(lot.variables)
                            .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
                            .slice(0, 3);
                          return (
                            <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                              <td className="py-2 px-3 font-mono text-xs">{lot.lot}</td>
                              <td className="py-2 px-3">
                                <span className="px-2 py-1 rounded bg-red-100 text-red-700 font-medium">
                                  {lot.defectRate.toFixed(1)}%
                                </span>
                              </td>
                              <td className="py-2 px-3 text-xs text-slate-600">
                                {topVars.map(([name, val]) => (
                                  <span key={name} className="inline-block mr-2 mb-1 px-2 py-0.5 bg-slate-100 rounded">
                                    {name}: {Number(val).toFixed(2)}
                                  </span>
                                ))}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
