'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import RightSidebar from '@/components/RightSidebar';
import Card from '@/components/Card';
import { useLanguage } from '@/contexts/LanguageContext';

export default function EnergyPage() {
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
  
  const energyData = {
    day: [
      { time: '00:00', consumption: 120, cost: 24 },
      { time: '04:00', consumption: 135, cost: 27 },
      { time: '08:00', consumption: 245, cost: 49 },
      { time: '12:00', consumption: 260, cost: 52 },
      { time: '16:00', consumption: 280, cost: 56 },
      { time: '20:00', consumption: 195, cost: 39 },
    ],
    week: [
      { day: '월', dayLabel: getDayLabel('월'), consumption: 2456, cost: 491, efficiency: 85 },
      { day: '화', dayLabel: getDayLabel('화'), consumption: 2389, cost: 478, efficiency: 87 },
      { day: '수', dayLabel: getDayLabel('수'), consumption: 2523, cost: 505, efficiency: 84 },
      { day: '목', dayLabel: getDayLabel('목'), consumption: 2412, cost: 482, efficiency: 86 },
      { day: '금', dayLabel: getDayLabel('금'), consumption: 2398, cost: 480, efficiency: 88 },
      { day: '토', dayLabel: getDayLabel('토'), consumption: 1876, cost: 375, efficiency: 82 },
      { day: '일', dayLabel: getDayLabel('일'), consumption: 1456, cost: 291, efficiency: 80 },
    ],
    month: [
      { week: '1주', consumption: 10234, cost: 2047 },
      { week: '2주', consumption: 9876, cost: 1975 },
      { week: '3주', consumption: 10123, cost: 2025 },
      { week: '4주', consumption: 9954, cost: 1991 },
    ],
  };

  const currentData = energyData[selectedPeriod];
  const maxConsumption = Math.max(...currentData.map(d => d.consumption));
  const avgConsumption = currentData.reduce((sum, d) => sum + d.consumption, 0) / currentData.length;
  const totalConsumption = currentData.reduce((sum, d) => sum + d.consumption, 0);
  const totalCost = currentData.reduce((sum, d) => sum + (d.cost || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <Navbar />
      <RightSidebar />
      
      <main className="ml-64 mr-80 mt-16 bg-slate-100 min-h-[calc(100vh-4rem)] p-6">
        <div className="max-w-full mx-auto">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{t('energy.title')}</h2>
              <p className="text-slate-600 mt-1">{t('energy.subtitle')}</p>
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

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
            <Card title={t('energy.total')}>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-slate-900">
                  {totalConsumption.toLocaleString()}
                </div>
                <div className="text-sm text-slate-600">kWh</div>
              </div>
            </Card>
            <Card title={t('energy.avg')}>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-slate-900">
                  {Math.round(avgConsumption).toLocaleString()}
                </div>
                <div className="text-sm text-slate-600">kWh</div>
              </div>
            </Card>
            <Card title={t('energy.cost')}>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-slate-900">
                  ₩{totalCost.toLocaleString()}
                </div>
                <div className="text-sm text-slate-600">{t('energy.currentPeriod')}</div>
              </div>
            </Card>
            <Card title={t('energy.unitPrice')}>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-slate-900">
                  ₩{totalCost > 0 ? (totalCost / (totalConsumption / 1000)).toFixed(2) : '0'}
                </div>
                <div className="text-sm text-slate-600">{t('energy.unit')}</div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card title={t('energy.chart')} className="lg:col-span-2">
              <div className="h-80 p-4">
                <div className="h-full flex items-end justify-between gap-2">
                  {currentData.map((item, index) => {
                    const it = item as any;
                    const height = (it.consumption / maxConsumption) * 100;
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center">
                        <div className="w-full flex flex-col items-center justify-end h-full">
                          <div
                            className="w-full bg-yellow-500 rounded-t hover:bg-yellow-600 transition-colors cursor-pointer relative group"
                            style={{ height: `${height}%` }}
                          >
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                              {it.consumption.toLocaleString()} kWh
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-slate-600">
                          {(it.time ?? it.week ?? it.dayLabel ?? it.day) ?? it.week}
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
                  <h4 className="text-sm font-medium text-slate-900 mb-3">{t('energy.byEquipment')}</h4>
                  <div className="space-y-3">
                    {[
                      { equipment: language === 'ko' ? '압출기' : 'Extruder', consumption: 856, percentage: 35, status: 'normal' },
                      { equipment: language === 'ko' ? '성형기' : 'Molding Machine', consumption: 623, percentage: 25, status: 'normal' },
                      { equipment: language === 'ko' ? '냉각장치' : 'Cooling Unit', consumption: 489, percentage: 20, status: 'normal' },
                      { equipment: language === 'ko' ? '포장기' : 'Packing Machine', consumption: 234, percentage: 10, status: 'inspection' },
                      { equipment: language === 'ko' ? '기타' : 'Others', consumption: 246, percentage: 10, status: 'normal' },
                    ].map((item, index) => (
                      <div key={index} className="p-3 bg-white rounded border border-slate-200">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium text-slate-900">{item.equipment}</span>
                          <span className={`text-xs px-2 py-1 rounded ${
                            item.status === 'normal' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {item.status === 'normal' ? t('common.statusNormal') : t('common.inspection')}
                          </span>
                        </div>
                        <div className="text-sm text-slate-600 mb-2">
                          {t('common.consumption')}: <span className="font-medium text-slate-900">{item.consumption.toLocaleString()} kWh</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div
                            className="bg-yellow-500 h-2 rounded-full"
                            style={{ width: `${item.percentage}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">{t('common.percentage')}: {item.percentage}%</div>
                      </div>
                    ))}
                  </div>
                </div>
                {selectedPeriod === 'week' && (
                  <div className="pt-4 border-t border-slate-200">
                    <h4 className="text-sm font-medium text-slate-900 mb-2">{t('common.energyEfficiency')}</h4>
                    <div className="space-y-2">
                      {energyData.week.map((item, index) => {
                        const it = item as any;
                        return (
                        <div key={index} className="flex justify-between items-center text-sm">
                          <span className="text-slate-600">{(it.dayLabel ?? it.day) ?? ''}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900">{it.efficiency}%</span>
                            <div className="w-16 bg-slate-200 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full ${
                                  it.efficiency >= 85 ? 'bg-green-500' : 'bg-yellow-500'
                                }`}
                                style={{ width: `${it.efficiency}%` }}
                              ></div>
                            </div>
                          </div>
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
