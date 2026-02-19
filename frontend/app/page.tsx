'use client';

import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import RightSidebar from '@/components/RightSidebar';
import Card from '@/components/Card';
import { useLanguage } from '@/contexts/LanguageContext';
import { FileText, ChevronRight } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const { t, language } = useLanguage();
  
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <Navbar />
      <RightSidebar />
      
      <main className="ml-64 mr-80 mt-16 bg-slate-100 min-h-[calc(100vh-4rem)] p-6">
        <div className="max-w-full mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">{t('dashboard.title')}</h2>
            <p className="text-slate-600 mt-1">{t('dashboard.subtitle')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card title={t('dashboard.production')}>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-slate-900">1,234</div>
                <div className="text-sm text-slate-600">{t('dashboard.productionToday')}</div>
                <div className="text-xs text-green-700">+12% {t('dashboard.productionChange')}</div>
              </div>
            </Card>

            <Card title={t('dashboard.equipmentRate')}>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-slate-900">87.5%</div>
                <div className="text-sm text-slate-600">{t('dashboard.avgRate')}</div>
                <div className="w-full bg-slate-200 rounded-full h-2 mt-3">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '87.5%' }}></div>
                </div>
              </div>
            </Card>

            <Card title={t('dashboard.quality')}>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-slate-900">98.2%</div>
                <div className="text-sm text-slate-600">{t('dashboard.qualityRate')}</div>
                <div className="text-xs text-green-700">{t('dashboard.goalAchieved')}</div>
              </div>
            </Card>

            <Card title={t('dashboard.energy')}>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-slate-900">2,456</div>
                <div className="text-sm text-slate-600">{t('dashboard.energyToday')}</div>
                <div className="text-xs text-yellow-700">-5% {t('dashboard.productionChange')}</div>
              </div>
            </Card>

            <Card title={t('dashboard.workers')}>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-slate-900">24</div>
                <div className="text-sm text-slate-600">{t('dashboard.workersCurrent')}</div>
                <div className="text-xs text-blue-700">{t('dashboard.workersShift')}</div>
              </div>
            </Card>

            <Card title={t('dashboard.orders')}>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-slate-900">156</div>
                <div className="text-sm text-slate-600">{t('dashboard.ordersInProgress')}</div>
                <div className="text-xs text-slate-500">{t('dashboard.ordersCompletion')}</div>
              </div>
            </Card>

            <Card
              title={language === 'ko' ? 'AI 최적화 보고서' : 'AI Optimization Report'}
              className="h-full hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
              onClick={() => router.push('/ai-report')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="text-sm text-slate-600">
                    {language === 'ko' ? '보고서 란 보기' : 'View report'}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-blue-500" />
              </div>
            </Card>
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title={t('dashboard.recentEvents')}>
              <div className="space-y-3">
                {[
                  { time: '10:23', event: language === 'ko' ? '라인 A 생산 완료' : 'Line A Production Completed', status: 'success' },
                  { time: '10:15', event: language === 'ko' ? '라인 B 품질 검사 완료' : 'Line B Quality Inspection Completed', status: 'success' },
                  { time: '10:08', event: language === 'ko' ? '라인 C 경고 발생' : 'Line C Warning Occurred', status: 'warning' },
                  { time: '09:55', event: language === 'ko' ? '라인 D 재시작' : 'Line D Restarted', status: 'info' },
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-white rounded border border-slate-200">
                    <span className="text-xs text-slate-500">{item.time}</span>
                    <span className="flex-1 text-sm text-slate-900">{item.event}</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      item.status === 'success' ? 'bg-green-50 text-green-700' :
                      item.status === 'warning' ? 'bg-yellow-50 text-yellow-700' :
                      'bg-blue-50 text-blue-700'
                    }`}>
                      {item.status === 'success' ? t('dashboard.completed') : item.status === 'warning' ? t('dashboard.warning') : t('dashboard.info')}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            <Card title={t('dashboard.lineStatus')}>
              <div className="space-y-4">
                {[
                  { name: language === 'ko' ? '라인 A' : 'Line A', progress: 85, status: 'normal' },
                  { name: language === 'ko' ? '라인 B' : 'Line B', progress: 92, status: 'normal' },
                  { name: language === 'ko' ? '라인 C' : 'Line C', progress: 45, status: 'inspection' },
                  { name: language === 'ko' ? '라인 D' : 'Line D', progress: 78, status: 'normal' },
                ].map((line, index) => (
                  <div key={index}>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium text-slate-900">{line.name}</span>
                      <span className={`text-xs ${
                        line.status === 'normal' ? 'text-green-700' : 'text-yellow-700'
                      }`}>
                        {line.status === 'normal' ? t('dashboard.normal') : t('dashboard.inspection')}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          line.status === 'normal' ? 'bg-blue-500' : 'bg-yellow-500'
                        }`}
                        style={{ width: `${line.progress}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">{line.progress}% {t('dashboard.complete')}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
