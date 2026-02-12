'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import RightSidebar from '@/components/RightSidebar';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // 로딩 중이면 아무것도 하지 않음
    if (isLoading) return;

    // 로그인 페이지는 인증 체크 제외
    if (pathname === '/login') {
      // 이미 로그인되어 있으면 대시보드로 리다이렉트
      if (user) {
        router.push('/process-model');
      }
      return;
    }

    // 로그인하지 않았으면 로그인 페이지로 리다이렉트
    if (!user) {
      router.push('/login');
    }
  }, [user, isLoading, pathname, router]);

  // 로딩 중이면 로딩 화면 표시
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 로그인 페이지가 아니고 로그인하지 않았으면 로그인 페이지로 이동 중임을 표시 (흰 화면 방지)
  if (pathname !== '/login' && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">로그인 페이지로 이동 중...</p>
        </div>
      </div>
    );
  }

  // 로그인 페이지가 아닐 때만 RightSidebar 표시
  const showRightSidebar = pathname !== '/login' && user;

  return (
    <>
      {children}
      {showRightSidebar && <RightSidebar />}
    </>
  );
}
