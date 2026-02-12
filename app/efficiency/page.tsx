'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import RightSidebar from '@/components/RightSidebar';
import Card from '@/components/Card';
import { useLanguage } from '@/contexts/LanguageContext';

export default function EfficiencyPage() {
  const { t, language } = useLanguage();
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month'>('week');

  // 샘플 데이터
  const getDayLabel = (day: string) => {
    const dayMap: Record<string, string> = {
      '월': t('common.mon'),
      '화': t('common.tue'),
      '수': t('common.wed'),
      '목': t('common.thu'),
      '금': t('common.fri'),
      '토': t('common.sat'),
      '일': t('common.sun'),
    };
    return dayMap[day] || day;
  };

  const efficiencyData = {
    day: [
      { time: '00:00', efficiency: 82, uptime: 95 },
      { time: '04:00', efficiency: 85, uptime: 97 },
      { time: '08:00', efficiency: 92, uptime: 98 },
      { time: '12:00', efficiency: 88, uptime: 96 },
      { time: '16:00', efficiency: 90, uptime: 99 },
      { time: '20:00', efficiency: 84, uptime: 94 },
    ],
    week: [
      { day: '월', dayLabel: getDayLabel('월'), efficiency: 87.5, uptime: 96.2, downtime: 3.8 },
      { day: '화', dayLabel: getDayLabel('화'), efficiency: 89.2, uptime: 97.5, downtime: 2.5 },
      { day: '수', dayLabel: getDayLabel('수'), efficiency: 85.8, uptime: 94.8, downtime: 5.2 },
      { day: '목', dayLabel: getDayLabel('목'), efficiency: 91.3, uptime: 98.1, downtime: 1.9 },
      { day: '금', dayLabel: getDayLabel('금'), efficiency: 88.7, uptime: 96.8, downtime: 3.2 },
      { day: '토', dayLabel: getDayLabel('토'), efficiency: 78.5, uptime: 92.3, downtime: 7.7 },
      { day: '일', dayLabel: getDayLabel('일'), efficiency: 72.3, uptime: 88.5, downtime: 11.5 },
    ],
    month: [
      { week: '1주', efficiency: 86.2, uptime: 95.5 },
      { week: '2주', efficiency: 88.7, uptime: 96.8 },
      { week: '3주', efficiency: 87.9, uptime: 95.2 },
      { week: '4주', efficiency: 89.1, uptime: 97.1 },
    ],
  };

  const currentData = efficiencyData[selectedPeriod];
  const avgEfficiency = currentData.reduce((sum, d) => sum + d.efficiency, 0) / currentData.length;
  const avgUptime = currentData.reduce((sum, d) => sum + d.uptime, 0) / currentData.length;
  const maxEfficiency = Math.max(...currentData.map(d => d.efficiency));

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <Navbar />
      <RightSidebar />
      
      <main className="ml-64 mr-80 mt-16 bg-slate-100 min-h-[calc(100vh-4rem)] p-6">
        <div className="max-w-full mx-auto">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{t('efficiency.title')}</h2>
              <p className="text-slate-600 mt-1">{t('efficiency.subtitle')}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedPeriod('day')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedPeriod === 'day'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                {t('production.daily')}
              </button>
              <button
                onClick={() => setSelectedPeriod('week')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedPeriod === 'week'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                {t('production.weekly')}
              </button>
              <button
                onClick={() => setSelectedPeriod('month')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedPeriod === 'month'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                {t('production.monthly')}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <Card title={t('efficiency.avg')}>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-slate-900">
                  {avgEfficiency.toFixed(1)}%
                </div>
                <div className="text-sm text-slate-600">{t('efficiency.currentPeriod')}</div>
                <div className="w-full bg-slate-200 rounded-full h-2 mt-3">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${avgEfficiency}%` }}
                  ></div>
                </div>
              </div>
            </Card>
            <Card title={t('efficiency.uptime')}>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-slate-900">
                  {avgUptime.toFixed(1)}%
                </div>
                <div className="text-sm text-slate-600">{t('efficiency.currentPeriod')}</div>
                <div className="w-full bg-slate-200 rounded-full h-2 mt-3">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${avgUptime}%` }}
                  ></div>
                </div>
              </div>
            </Card>
            <Card title={t('efficiency.max')}>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-slate-900">
                  {maxEfficiency.toFixed(1)}%
                </div>
                <div className="text-sm text-slate-600">{t('efficiency.peak')}</div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card title={t('efficiency.chart')} className="lg:col-span-2">
              <div className="h-80 p-4">
                <div className="h-full flex items-end justify-between gap-2">
                  {currentData.map((item, index) => {
                    const it = item as any;
                    const height = (it.efficiency / 100) * 100;
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center">
                        <div className="w-full flex flex-col items-center justify-end h-full">
                          <div
                            className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-pointer relative group"
                            style={{ height: `${height}%` }}
                          >
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                              {it.efficiency.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-slate-600">
                          {(it.time ?? it.week ?? it.dayLabel ?? it.day) ?? ''}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>

            <Card title={t('production.details')}>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-slate-900 mb-3">{t('efficiency.byLine')}</h4>
                  <div className="space-y-3">
                    {[
                      { line: language === 'ko' ? '라인 A' : 'Line A', efficiency: 92.5, uptime: 98.2, status: 'excellent', issues: 0 },
                      { line: language === 'ko' ? '라인 B' : 'Line B', efficiency: 88.7, uptime: 96.5, status: 'good', issues: 1 },
                      { line: language === 'ko' ? '라인 C' : 'Line C', efficiency: 75.3, uptime: 89.2, status: 'normal', issues: 3 },
                      { line: language === 'ko' ? '라인 D' : 'Line D', efficiency: 85.9, uptime: 94.8, status: 'good', issues: 2 },
                    ].map((line, index) => (
                      <div key={index} className="p-3 bg-white rounded border border-slate-200">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium text-slate-900">{line.line}</span>
                          <span className={`text-xs px-2 py-1 rounded ${
                            line.status === 'excellent' ? 'bg-green-100 text-green-700' :
                            line.status === 'good' ? 'bg-blue-100 text-blue-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {line.status === 'excellent' ? t('common.excellent') :
                              line.status === 'good' ? t('common.good') :
                              t('common.normal')}
                          </span>
                        </div>
                        <div className="text-sm text-slate-600 mb-2">
                          {t('efficiency.efficiency')}: <span className="font-medium text-slate-900">{line.efficiency}%</span>
                        </div>
                        <div className="text-sm text-slate-600 mb-2">
                          {t('efficiency.uptimeLabel')}: <span className="font-medium text-slate-900">{line.uptime}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2 mb-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${line.efficiency}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-slate-500">
                          {t('efficiency.issues')}: {line.issues}{language === 'ko' ? '건' : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {selectedPeriod === 'week' && (
                  <div className="pt-4 border-t border-slate-200">
                    <h4 className="text-sm font-medium text-slate-900 mb-2">
                      {language === 'ko' ? '가동률 vs 다운타임' : 'Uptime vs Downtime'}
                    </h4>
                    <div className="space-y-2">
                      {efficiencyData.week.map((item, index) => {
                        const it = item as any;
                        return (
                        <div key={index} className="text-sm">
                          <div className="flex justify-between mb-1">
                            <span className="text-slate-600">{(it.dayLabel ?? it.day) ?? ''}</span>
                            <span className="font-medium text-slate-900">{it.uptime}%</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2">
                            <div
                              className="bg-green-500 h-2 rounded-full"
                              style={{ width: `${it.uptime}%` }}
                            ></div>
                          </div>
                          {it.downtime && (
                            <div className="text-xs text-slate-500 mt-1">
                              {t('efficiency.downtime')}: {it.downtime}%
                            </div>
                          )}
                        </div>
                      );})}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
