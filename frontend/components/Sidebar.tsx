'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Box,
  LayoutDashboard,
  BarChart3,
  ClipboardList,
  AlertTriangle,
  Activity,
  Settings,
  ChevronDown,
  ChevronRight,
  LineChart,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t, language } = useLanguage();
  
  // 섹션 열림/닫힘 상태 관리
  const [isMonitoringOpen, setIsMonitoringOpen] = useState(true);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(true);

  // 현재 경로에 따라 해당 섹션 자동 열기
  useEffect(() => {
    const monitoringPaths = ['/process-model', '/dashboard', '/sensor-chart', '/lot-status'];
    const analysisPaths = ['/analytics', '/defect-analysis', '/what-if', '/energy-visualization', '/ai-report'];
    
    if (monitoringPaths.includes(pathname)) {
      setIsMonitoringOpen(true);
    }
    if (analysisPaths.includes(pathname)) {
      setIsAnalysisOpen(true);
    }
  }, [pathname]);

  const monitoringItems = [
    { name: language === 'ko' ? '실시간 모델' : 'Real-time Model', href: '/process-model', icon: Box },
    { name: language === 'ko' ? '공정 현황' : 'Process Status', href: '/dashboard', icon: LayoutDashboard },
    { name: language === 'ko' ? '센서 차트' : 'Sensor Chart', href: '/sensor-chart', icon: Activity },
    { name: language === 'ko' ? 'LOT별 공정 현황' : 'LOT Process Status', href: '/lot-status', icon: ClipboardList },
  ];

  const analysisItems = [
    { name: t('sidebar.energyVisualization'), href: '/energy-visualization', icon: Activity },
    { name: t('sidebar.defectAnalysis'), href: '/defect-analysis', icon: AlertTriangle },
    { name: language === 'ko' ? '불량 원인 분석' : 'Defect Root Cause Analysis', href: '/analytics', icon: BarChart3 },
    { name: 'What-If 시뮬레이션', href: '/what-if', icon: LineChart },
    { name: language === 'ko' ? 'AI 최적화 보고서' : 'AI Optimization Report', href: '/ai-report', icon: ClipboardList },
  ];

  return (
    <div className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-white border-r border-slate-200 flex flex-col z-30">
      <div className="p-6 border-b border-slate-200">
        <h1 className="text-xl font-bold text-slate-900">{language === 'ko' ? '공정 데이터' : 'Process Data'}</h1>
        <p className="text-sm text-slate-600 mt-1">{t('sidebar.dashboard')}</p>
      </div>
      
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          {/* 모니터링 섹션 */}
          <li>
            <button
              type="button"
              onClick={() => setIsMonitoringOpen(!isMonitoringOpen)}
              className="w-full text-left flex items-center justify-between px-4 py-2 text-slate-900 font-semibold hover:bg-slate-50 rounded-lg transition-colors"
            >
              <span>{language === 'ko' ? '모니터링' : 'Monitoring'}</span>
              {isMonitoringOpen ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
            {isMonitoringOpen && (
              <ul className="mt-1 ml-4 space-y-1">
                {monitoringItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  
                  return (
                    <li key={item.href}>
                      <button
                        type="button"
                        onClick={() => router.push(item.href)}
                        className={`
                          w-full text-left flex items-center gap-3 px-4 py-2 rounded-lg transition-colors
                          ${isActive 
                            ? 'bg-slate-100 text-slate-900' 
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                          }
                        `}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-sm">{item.name}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>

          {/* 분석 섹션 */}
          <li>
            <button
              type="button"
              onClick={() => setIsAnalysisOpen(!isAnalysisOpen)}
              className="w-full text-left flex items-center justify-between px-4 py-2 text-slate-900 font-semibold hover:bg-slate-50 rounded-lg transition-colors"
            >
              <span>{t('sidebar.intelligentAnalysis')}</span>
              {isAnalysisOpen ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
            {isAnalysisOpen && (
              <ul className="mt-1 ml-4 space-y-1">
                {analysisItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  
                  return (
                    <li key={item.href}>
                      <button
                        type="button"
                        onClick={() => router.push(item.href)}
                        className={`
                          w-full text-left flex items-center gap-3 px-4 py-2 rounded-lg transition-colors
                          ${isActive 
                            ? 'bg-slate-100 text-slate-900' 
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                          }
                        `}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-sm">{item.name}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>

          {/* 설정 (섹션 없이 단독 항목) */}
          <li className="pt-2 border-t border-slate-200 mt-2">
            <button
              type="button"
              onClick={() => router.push('/settings')}
              className={`
                w-full text-left flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                ${pathname === '/settings'
                  ? 'bg-slate-100 text-slate-900' 
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }
              `}
            >
              <Settings className="w-5 h-5" />
              <span className="font-medium">{t('sidebar.settings')}</span>
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
