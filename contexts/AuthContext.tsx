'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  employeeNumber: string;
  name: string;
  role: 'admin' | 'user';
}

interface AuthContextType {
  user: User | null;
  login: (employeeNumber: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateUser: (userData: User) => void;
  isAdmin: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // [개발용] DB 연결 불가 시 테스트 유저로 전체 메뉴 이용. DB 복구 후 아래 TEST_USER 블록 제거.
  const TEST_USER: User = { employeeNumber: 'test', name: '테스트', role: 'user' };

  // 페이지 로드 시 세션 확인
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/api/auth/session');
        if (response.ok) {
          const data = await response.json();
          if (data.user) {
            setUser(data.user);
            return;
          }
        }
        // 세션 없음 또는 오류 시 테스트 유저 사용 (DB 복구 후 이 블록 삭제)
        setUser(TEST_USER);
      } catch (error) {
        console.error('Session check error:', error);
        setUser(TEST_USER);
      } finally {
        setIsLoading(false);
      }
    };
    checkSession();
  }, []);


  const login = async (employeeNumber: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ employeeNumber, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setUser(data.user);
        // 로그인 성공 시 홈으로 리다이렉트 (AuthGuard가 처리)
        router.push('/');
        return { success: true };
      } else {
        return { success: false, error: data.error || '로그인에 실패했습니다.' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: '로그인 중 오류가 발생했습니다.' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      router.push('/login');
    }
  };

  const updateUser = (userData: User) => {
    setUser(userData);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, isAdmin: user?.role === 'admin', isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
