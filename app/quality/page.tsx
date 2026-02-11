'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import RightSidebar from '@/components/RightSidebar';
import Card from '@/components/Card';
import { useLanguage } from '@/contexts/LanguageContext';

export default function QualityPage() {
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
  
  const qualityData = {
    day: [
      { time: '00:00', passRate: 98.5, defectRate: 1.5 },
      { time: '04:00', passRate: 97.8, defectRate: 2.2 },
      { time: '08:00', passRate: 99.2, defectRate: 0.8 },
      { time: '12:00', passRate: 98.9, defectRate: 1.1 },
      { time: '16:00', passRate: 99.5, defectRate: 0.5 },
      { time: '20:00', passRate: 98.2, defectRate: 1.8 },
    ],
    week: [
      { day: '월', dayLabel: getDayLabel('월'), passRate: 98.2, defectRate: 1.8, inspected: 1234 },
      { day: '화', dayLabel: getDayLabel('화'), passRate: 98.5, defectRate: 1.5, inspected: 1356 },
      { day: '수', dayLabel: getDayLabel('수'), passRate: 99.1, defectRate: 0.9, inspected: 1289 },
      { day: '목', dayLabel: getDayLabel('목'), passRate: 98.8, defectRate: 1.2, inspected: 1423 },
      { day: '금', dayLabel: getDayLabel('금'), passRate: 99.3, defectRate: 0.7, inspected: 1387 },
      { day: '토', dayLabel: getDayLabel('토'), passRate: 97.5, defectRate: 2.5, inspected: 987 },
      { day: '일', dayLabel: getDayLabel('일'), passRate: 98.0, defectRate: 2.0, inspected: 756 },
    ],
    month: [
      { week: '1주', passRate: 98.3, defectRate: 1.7 },
      { week: '2주', passRate: 98.7, defectRate: 1.3 },
      { week: '3주', passRate: 99.0, defectRate: 1.0 },
      { week: '4주', passRate: 98.5, defectRate: 1.5 },
    ],
  };

  const currentData = qualityData[selectedPeriod];
  const avgPassRate = currentData.reduce((sum, d) => sum + d.passRate, 0) / currentData.length;
  const avgDefectRate = currentData.reduce((sum, d) => sum + d.defectRate, 0) / currentData.length;
  const totalInspected = selectedPeriod === 'week' 
    ? currentData.reduce((sum, d) => sum + (d.inspected || 0), 0)
    : 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <Navbar />
      <RightSidebar />
      
      <main className="ml-64 mr-80 mt-16 bg-slate-100 min-h-[calc(100vh-4rem)] p-6">
        <div className="max-w-full mx-auto">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{t('quality.title')}</h2>
              <p className="text-slate-600 mt-1">{t('quality.subtitle')}</p>
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
            <Card title={t('quality.avgRate')}>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-green-700">
                  {avgPassRate.toFixed(2)}%
                </div>
                <div className="text-sm text-slate-600">{t('quality.currentPeriod')}</div>
                <div className="text-xs text-green-700">{t('quality.targetPass')}</div>
              </div>
            </Card>
            <Card title={t('quality.avgDefect')}>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-red-700">
                  {avgDefectRate.toFixed(2)}%
                </div>
                <div className="text-sm text-slate-600">{t('quality.currentPeriod')}</div>
                <div className="text-xs text-red-700">{t('quality.targetDefect')}</div>
              </div>
            </Card>
            {totalInspected > 0 && (
              <Card title={t('quality.inspected')}>
                <div className="space-y-2">
                  <div className="text-3xl font-bold text-slate-900">
                    {totalInspected.toLocaleString()}
                  </div>
                  <div className="text-sm text-slate-600">{t('quality.totalInspected')}</div>
                </div>
              </Card>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card title={t('quality.trend')} className="lg:col-span-2">
              <div className="h-80 p-4">
                <div className="h-full flex items-end justify-between gap-2">
                  {currentData.map((item, index) => {
                    const height = (item.passRate / 100) * 100;
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center">
                        <div className="w-full flex flex-col items-center justify-end h-full">
                          <div
                            className="w-full bg-green-500 rounded-t hover:bg-green-600 transition-colors cursor-pointer relative group"
                            style={{ height: `${height}%` }}
                          >
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                              {item.passRate.toFixed(1)}%
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
                  <h4 className="text-sm font-medium text-slate-900 mb-3">{t('quality.defectTypes')}</h4>
                  <div className="space-y-2">
                    {[
                      { type: language === 'ko' ? '크기 불량' : 'Size Defect', count: 23, rate: 0.8 },
                      { type: language === 'ko' ? '색상 불량' : 'Color Defect', count: 15, rate: 0.5 },
                      { type: language === 'ko' ? '표면 결함' : 'Surface Defect', count: 8, rate: 0.3 },
                      { type: language === 'ko' ? '기타' : 'Others', count: 5, rate: 0.2 },
                    ].map((defect, index) => (
                      <div key={index} className="p-2 bg-white rounded border border-slate-200">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-slate-900">{defect.type}</span>
                          <span className="text-sm font-medium text-slate-900">{defect.count}{language === 'ko' ? '건' : ''}</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5">
                          <div
                            className="bg-red-500 h-1.5 rounded-full"
                            style={{ width: `${(defect.count / 51) * 100}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">{defect.rate}%</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-200">
                  <h4 className="text-sm font-medium text-slate-900 mb-2">{t('common.qualityByLine')}</h4>
                  <div className="space-y-2">
                    {[
                      { line: language === 'ko' ? '라인 A' : 'Line A', passRate: 99.2, status: 'excellent' },
                      { line: language === 'ko' ? '라인 B' : 'Line B', passRate: 98.5, status: 'good' },
                      { line: language === 'ko' ? '라인 C' : 'Line C', passRate: 97.8, status: 'normal' },
                      { line: language === 'ko' ? '라인 D' : 'Line D', passRate: 98.9, status: 'good' },
                    ].map((line, index) => (
                      <div key={index} className="flex justify-between items-center text-sm">
                        <span className="text-slate-600">{line.line}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900">{line.passRate}%</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            line.status === 'excellent' ? 'bg-green-100 text-green-700' :
                            line.status === 'good' ? 'bg-blue-100 text-blue-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {line.status === 'excellent' ? t('common.excellent') :
                             line.status === 'good' ? t('common.good') :
                             t('common.normal')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
