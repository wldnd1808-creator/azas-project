'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  TrendingUp,
  Award,
  Zap,
  Gauge,
  BarChart3,
  Grid3X3,
  AlertTriangle,
  Settings 
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Sidebar() {
  const pathname = usePathname();
  const { t, language } = useLanguage();
  
  const menuItems = [
    {
      name: t('sidebar.dashboard'),
      href: '/',
      icon: LayoutDashboard,
    },
    {
      name: t('sidebar.production'),
      href: '/production',
      icon: TrendingUp,
    },
    {
      name: t('sidebar.quality'),
      href: '/quality',
      icon: Award,
    },
    {
      name: t('sidebar.defectAnalysis'),
      href: '/defect-analysis',
      icon: AlertTriangle,
    },
    {
      name: t('sidebar.analytics'),
      href: '/analytics',
      icon: BarChart3,
    },
    {
      name: t('sidebar.energy'),
      href: '/energy',
      icon: Zap,
    },
    {
      name: t('sidebar.efficiency'),
      href: '/efficiency',
      icon: Gauge,
    },
    {
      name: t('sidebar.processModel'),
      href: '/process-model',
      icon: Grid3X3,
    },
    {
      name: t('sidebar.settings'),
      href: '/settings',
      icon: Settings,
    },
  ];

  return (
    <div className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-slate-200 flex flex-col">
      <div className="p-6 border-b border-slate-200">
        <h1 className="text-xl font-bold text-slate-900">{language === 'ko' ? '제조 공정' : 'Manufacturing'}</h1>
        <p className="text-sm text-slate-600 mt-1">{t('sidebar.dashboard')}</p>
      </div>
      
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                    ${isActive 
                      ? 'bg-slate-100 text-slate-900' 
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
