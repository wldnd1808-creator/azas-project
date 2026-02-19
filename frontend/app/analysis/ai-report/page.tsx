'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Factory,
  LayoutDashboard,
  Activity,
  ClipboardList,
  BarChart3,
  Zap,
  ChevronRight,
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRightSidebar } from '@/contexts/RightSidebarContext';

const MAIN_ITEMS = [
  { nameKo: '설비 모니터링', nameEn: 'Equipment Monitoring', href: '/factory', icon: Factory },
  { nameKo: '공정 현황', nameEn: 'Process Status', href: '/dashboard', icon: LayoutDashboard },
  { nameKo: '센서 차트', nameEn: 'Sensor Chart', href: '/sensor-chart', icon: Activity },
  { nameKo: 'LOT별 공정 현황', nameEn: 'LOT Process Status', href: '/lot-status', icon: ClipboardList },
  { nameKo: '불량 원인 분석', nameEn: 'Defect Root Cause Analysis', href: '/analytics', icon: BarChart3 },
  { nameKo: '에너지 시각 분석', nameEn: 'Energy Visualization', href: '/energy-visualization', icon: Zap },
] as const;

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const { language } = useLanguage();
  const { alertsPanelOpen, alertsSidebarWidth, rightSidebarOpen, rightSidebarWidth } = useRightSidebar();
  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">이동 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 overflow-x-hidden">
      <Sidebar />
      <Navbar />

      <main 
        className="ml-64 mt-16 bg-slate-100 min-h-[calc(100vh-4rem)] p-6 overflow-x-hidden transition-all duration-200"
        style={{
          marginRight: alertsPanelOpen ? `${alertsSidebarWidth}px` : (rightSidebarOpen ? `${rightSidebarWidth}px` : '0px'),
        }}
      >
        <div className="max-w-full mx-auto">
          <div className="relative flex flex-col items-center justify-start">
            {/* 메인 전체 흐릿한 배경 이미지 */}
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30 [filter:blur(80px)] scale-110"
              style={{ backgroundImage: 'url(/azas-hero-bg.png)' }}
              aria-hidden
            />

            {/* Hero: AZAS + 서브타이틀 */}
            <header className="relative z-10 w-full max-w-3xl text-center pt-12 pb-16">
              <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">
                AZAS
              </h1>
              <p className="mt-3 text-lg text-slate-600 font-medium">
                Active material Zero defect AI Solutions.
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {language === 'ko' ? '제조 공정 모니터링 및 품질 분석 플랫폼' : 'Manufacturing process monitoring & quality analytics platform'}
              </p>
            </header>

            {/* 6개 메뉴: 칸만 불투명 배경으로 배경 이미지 안 비치게 */}
            <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {MAIN_ITEMS.map((item) => {
            const Icon = item.icon;
            const name = language === 'ko' ? item.nameKo : item.nameEn;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center gap-5 p-8 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 hover:bg-slate-50 transition-all duration-200 text-left"
              >
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                  <Icon className="h-8 w-8" />
                </div>
                <div className="min-w-0 flex-1 text-center">
                  <span className="text-lg font-semibold text-slate-900 group-hover:text-blue-700 transition-colors whitespace-normal [word-break:keep-all]">
                    {name}
                  </span>
                </div>
                <ChevronRight className="h-6 w-6 shrink-0 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
              </Link>
            );
          })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}