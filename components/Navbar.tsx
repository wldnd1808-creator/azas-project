'use client';

import { useState } from 'react';
import { Activity, AlertCircle, CheckCircle2, Clock, LogIn, LogOut, User } from 'lucide-react';
import LoginModal from './LoginModal';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

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
    {
      label: language === 'ko' ? '가동 시간' : 'Uptime',
      value: '24h 15m',
      status: 'info',
      icon: <Clock className="w-4 h-4" />,
    },
  ];

  const getStatusColor = (status: StatusItem['status']) => {
    switch (status) {
      case 'success':
        return 'text-green-700 bg-green-50';
      case 'warning':
        return 'text-yellow-700 bg-yellow-50';
      case 'error':
        return 'text-red-700 bg-red-50';
      case 'info':
        return 'text-blue-700 bg-blue-50';
      default:
        return 'text-slate-700 bg-slate-50';
    }
  };

  return (
    <div className="fixed top-0 left-64 right-80 h-16 bg-white border-b border-slate-200 z-10">
      <div className="h-full px-6 flex items-center justify-between">
        <div className="flex items-center gap-6">
          {statusItems.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-2"
            >
              <div className={`p-1.5 rounded ${getStatusColor(item.status)}`}>
                {item.icon}
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-slate-500">{item.label}</span>
                <span className="text-sm font-semibold text-slate-900">
                  {item.value}
                </span>
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <User className="h-4 w-4" />
                <span>{user.name}</span>
                {user.role === 'admin' && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">{t('admin')}</span>
                )}
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
                onClick={logout}
              >
                <LogOut className="h-4 w-4" />
                {t('nav.logout')}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
              onClick={() => setIsLoginModalOpen(true)}
            >
              <LogIn className="h-4 w-4" />
              {t('nav.login')}
            </button>
          )}
          <div className="text-sm text-slate-500">
            {new Date().toLocaleString(language === 'ko' ? 'ko-KR' : 'en-US', {
              year: 'numeric',
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
