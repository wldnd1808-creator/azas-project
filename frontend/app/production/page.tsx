'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import RightSidebar from '@/components/RightSidebar';
import Card from '@/components/Card';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ProductionPage() {
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
  
  const productionData = {
    day: [
      { time: '00:00', value: 45 },
      { time: '04:00', value: 52 },
      { time: '08:00', value: 68 },
      { time: '12:00', value: 75 },
      { time: '16:00', value: 82 },
      { time: '20:00', value: 58 },
    ],
    week: [
      { day: '월', dayLabel: getDayLabel('월'), value: 1234, target: 1200 },
      { day: '화', dayLabel: getDayLabel('화'), value: 1356, target: 1200 },
      { day: '수', dayLabel: getDayLabel('수'), value: 1289, target: 1200 },
      { day: '목', dayLabel: getDayLabel('목'), value: 1423, target: 1200 },
      { day: '금', dayLabel: getDayLabel('금'), value: 1387, target: 1200 },
      { day: '토', dayLabel: getDayLabel('토'), value: 987, target: 1000 },
      { day: '일', dayLabel: getDayLabel('일'), value: 756, target: 800 },
    ],
    month: [
      { week: '1주', value: 5234, target: 5000 },
      { week: '2주', value: 5456, target: 5000 },
      { week: '3주', value: 5289, target: 5000 },
      { week: '4주', value: 5423, target: 5000 },
    ],
  };

  const currentData = productionData[selectedPeriod];
  const maxValue = Math.max(...currentData.map(d => d.value));
  const avgValue = currentData.reduce((sum, d) => sum + d.value, 0) / currentData.length;
  const totalValue = currentData.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <Navbar />
      <RightSidebar />
      
      <main className="ml-64 mr-80 mt-16 bg-slate-100 min-h-[calc(100vh-4rem)] p-6">
        <div className="max-w-full mx-auto">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{t('production.title')}</h2>
              <p className="text-slate-600 mt-1">{t('production.subtitle')}</p>
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
            <Card title={t('production.total')}>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-slate-900">
                  {totalValue.toLocaleString()}
                </div>
                <div className="text-sm text-slate-600">{t('production.currentPeriod')}</div>
              </div>
            </Card>
            <Card title={t('production.avg')}>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-slate-900">
                  {Math.round(avgValue).toLocaleString()}
                </div>
                <div className="text-sm text-slate-600">{t('production.avgPeriod')}</div>
              </div>
            </Card>
            <Card title={t('production.max')}>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-slate-900">
                  {maxValue.toLocaleString()}
                </div>
                <div className="text-sm text-slate-600">{t('production.peak')}</div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card title={t('production.chart')} className="lg:col-span-2">
              <div className="h-80 p-4">
                <div className="h-full flex items-end justify-between gap-2">
                  {currentData.map((item, index) => {
                    const height = (item.value / maxValue) * 100;
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center">
                        <div className="w-full flex flex-col items-center justify-end h-full">
                          <div
                            className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-pointer relative group"
                            style={{ height: `${height}%` }}
                          >
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                              {item.value.toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-slate-600">
                          {('time' in item ? item.time : 'week' in item ? item.week : ('dayLabel' in item ? item.dayLabel : item.day)) || item.week}
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
                  <h4 className="text-sm font-medium text-slate-900 mb-3">{t('production.lineStatus')}</h4>
                  <div className="space-y-3">
                    {[
                      { name: language === 'ko' ? '라인 A' : 'Line A', production: 456, status: 'normal', efficiency: 92 },
                      { name: language === 'ko' ? '라인 B' : 'Line B', production: 389, status: 'normal', efficiency: 88 },
                      { name: language === 'ko' ? '라인 C' : 'Line C', production: 234, status: 'inspection', efficiency: 65 },
                      { name: language === 'ko' ? '라인 D' : 'Line D', production: 308, status: 'normal', efficiency: 85 },
                    ].map((line, index) => (
                      <div key={index} className="p-3 bg-white rounded border border-slate-200">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium text-slate-900">{line.name}</span>
                          <span className={`text-xs px-2 py-1 rounded ${
                            line.status === 'normal' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {line.status === 'normal' ? t('dashboard.normal') : t('dashboard.inspection')}
                          </span>
                        </div>
                        <div className="text-sm text-slate-600 mb-2">
                          {t('production.amount')}: <span className="font-medium text-slate-900">{line.production.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${line.efficiency}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">{t('production.efficiency')}: {line.efficiency}%</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-200">
                  <h4 className="text-sm font-medium text-slate-900 mb-2">{t('production.achievement')}</h4>
                  {selectedPeriod === 'week' && (
                    <div className="space-y-2">
                      {productionData.week.map((item, index) => {
                        const achievement = (item.value / item.target) * 100;
                        return (
                          <div key={index} className="flex justify-between items-center text-sm">
                            <span className="text-slate-600">{('dayLabel' in item ? item.dayLabel : item.day)}</span>
                            <span className={`font-medium ${
                              achievement >= 100 ? 'text-green-700' : 'text-yellow-700'
                            }`}>
                              {achievement.toFixed(1)}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
