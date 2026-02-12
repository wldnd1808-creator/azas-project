'use client';

import { useState } from 'react';
import { Activity, AlertCircle, CheckCircle2, LogIn, LogOut, User, RefreshCw, Bell } from 'lucide-react';
import LoginModal from './LoginModal';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDashboardRefresh } from '@/contexts/DashboardRefreshContext';

interface StatusItem {
  label: string;
  value: string;
  status: 'success' | 'warning' | 'error' | 'info';
  icon: React.ReactNode;
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const { t, language } = useLanguage();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const {
    lastUpdate,
    autoRefresh,
    setAutoRefresh,
    triggerRefresh,
  } = useDashboardRefresh();

  const statusItems: StatusItem[] = [
    {
      label: language === 'ko' ? '시스템 상태' : 'System Status',
      value: language === 'ko' ? '정상' : 'Normal',
      status: 'success',
      icon: <CheckCircle2 className="w-4 h-4" />,
    },
    {
      label: language === 'ko' ? '활성 공정' : 'Active Processes',
      value: '12',
      status: 'info',
      icon: <Activity className="w-4 h-4" />,
    },
    {
      label: language === 'ko' ? '경고' : 'Warnings',
      value: '2',
      status: 'warning',
      icon: <AlertCircle className="w-4 h-4" />,
    },
  ];

  const getStatusColor = (status: StatusItem['status']) => {
    switch (status) {
      case 'success':
        return 'text-green-700 bg-green-100/90';
      case 'warning':
        return 'text-amber-800 bg-amber-100/90';
      case 'error':
        return 'text-red-700 bg-red-100/90';
      case 'info':
        return 'text-blue-800 bg-blue-100/90';
      default:
        return 'text-slate-700 bg-white/80';
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 h-16 z-20 shadow-md border-b border-[#252840]" style={{ background: 'linear-gradient(90deg, #1A1C2E 0%, #1B1C2F 50%, #1E1F35 100%)' }}>
      {/* 사이드바 위 공간까지 포함한 전체 너비 사용, 3구역으로 분산 (한 줄 고정) */}
      <div className="h-full w-full px-6 flex items-center gap-0">
        {/* 제일 왼쪽: AZAS 로고 + 서브타이틀 */}
        <div className="shrink-0 flex flex-col justify-center pr-8 border-r border-white/10">
          <span className="text-lg font-bold text-white tracking-wide">AZAS</span>
          <span className="text-[10px] text-white/80 leading-tight">Active material Zero defect AI Solutions.</span>
        </div>
        {/* 왼쪽 구역: 상태 아이템 */}
        <div className="flex-1 min-w-0 flex items-center justify-start gap-4 pl-6">
          {statusItems.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-2 whitespace-nowrap"
            >
              <div className={`p-1.5 rounded shrink-0 ${getStatusColor(item.status)}`}>
                {item.icon}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs text-white/80 truncate">{item.label}</span>
                <span className="text-sm font-semibold text-white">{item.value}</span>
              </div>
            </div>
          ))}
        </div>

        {/* 가운데 구역: 비움 (마지막 업데이트는 오른쪽으로 이동) */}
        <div className="flex-1 min-w-0" />

        {/* 오른쪽 구역: 마지막 업데이트, 자동 새로고침, 새로고침, 사용자, 로그아웃, 시각 */}
        <div className="shrink-0 flex items-center justify-end gap-3 pl-4">
          <span className="text-sm text-white/80 whitespace-nowrap">
            {language === 'ko' ? '마지막 업데이트' : 'Last update'}:{' '}
          </span>
          <span className="text-sm font-medium text-white whitespace-nowrap">
            {lastUpdate.toLocaleTimeString(language === 'ko' ? 'ko-KR' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
              autoRefresh
                ? 'bg-white/30 text-white hover:bg-white/40'
                : 'bg-white/10 text-white/90 hover:bg-white/20'
            }`}
            title={language === 'ko' ? '자동 새로고침' : 'Auto-refresh'}
          >
            {autoRefresh ? (
              <span className="inline-block w-1.5 h-1.5 bg-white rounded-full animate-pulse shrink-0" />
            ) : null}
            <RefreshCw className="h-4 w-4 shrink-0" />
            {language === 'ko' ? '자동 새로고침' : 'Auto-refresh'}
          </button>
          <button
            onClick={triggerRefresh}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/20 px-2.5 py-1.5 text-sm font-medium text-white hover:bg-white/30 transition-colors whitespace-nowrap"
            title={language === 'ko' ? '새로고침' : 'Refresh'}
          >
            <RefreshCw className="h-4 w-4 shrink-0" />
            {language === 'ko' ? '새로고침' : 'Refresh'}
          </button>
          {user ? (
            <>
              <div className="flex items-center gap-2 text-sm text-blue-100 whitespace-nowrap">
                <User className="h-4 w-4 shrink-0" />
                <span className="text-white font-medium truncate max-w-[80px]">{user.name}</span>
                {user.role === 'admin' && (
                  <span className="px-2 py-0.5 bg-white/25 text-white rounded text-xs shrink-0">{t('admin')}</span>
                )}
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg bg-white/20 hover:bg-white/30 px-3 py-2 text-sm font-medium text-white transition-colors whitespace-nowrap shrink-0"
                onClick={logout}
              >
                <LogOut className="h-4 w-4" />
                {t('nav.logout')}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg bg-white/20 hover:bg-white/30 px-3 py-2 text-sm font-medium text-white transition-colors whitespace-nowrap shrink-0"
              onClick={() => setIsLoginModalOpen(true)}
            >
              <LogIn className="h-4 w-4" />
              {t('nav.login')}
            </button>
          )}
          <div className="text-sm text-white/80 whitespace-nowrap shrink-0">
            {new Date().toLocaleString(language === 'ko' ? 'ko-KR' : 'en-US', {
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>
      </div>
      
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
      />
    </div>
  );
}
