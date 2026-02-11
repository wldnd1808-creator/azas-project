'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { UserPlus, KeyRound, Mail, Phone } from 'lucide-react';

type ModalMode = 'login' | 'signup' | 'findPassword';

export default function LoginPage() {
  const { login, user, isLoading } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const [mode, setMode] = useState<ModalMode>('login');
  const [error, setError] = useState('');
  
  // 로그인 폼 상태
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 회원가입 폼 상태
  const [signupEmployeeNumber, setSignupEmployeeNumber] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupPasswordConfirm, setSignupPasswordConfirm] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);
  
  // 비밀번호 찾기 폼 상태
  const [findPasswordEmployeeNumber, setFindPasswordEmployeeNumber] = useState('');
  const [findMethod, setFindMethod] = useState<'email' | 'phone'>('email');
  const [findValue, setFindValue] = useState('');

  // 이미 로그인되어 있으면 대시보드로 리다이렉트
  useEffect(() => {
    if (!isLoading && user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

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

  // 이미 로그인되어 있으면 아무것도 표시하지 않음 (리다이렉트 중)
  if (user) {
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const result = await login(employeeNumber, password);
      if (result.success) {
        // 로그인 성공 시 AuthContext에서 리다이렉트 처리
        router.push('/');
      } else {
        setError(result.error || '사원번호 또는 비밀번호가 올바르지 않습니다.');
      }
    } catch (err) {
      setError('로그인 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (signupPassword !== signupPasswordConfirm) {
      setError(language === 'ko' ? '비밀번호가 일치하지 않습니다.' : 'Passwords do not match.');
      return;
    }

    if (signupPassword.length < 4) {
      setError(language === 'ko' ? '비밀번호는 최소 4자 이상이어야 합니다.' : 'Password must be at least 4 characters.');
      return;
    }

    setIsSigningUp(true);

    if (!signupEmployeeNumber.trim()) {
      setError(language === 'ko' ? '사원번호를 입력해주세요.' : 'Please enter employee number.');
      setIsSigningUp(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          employeeNumber: signupEmployeeNumber.trim(),
          password: signupPassword
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // 회원가입 성공 - 자동 로그인
        const loginResult = await login(signupEmployeeNumber.trim(), signupPassword);
        if (loginResult.success) {
          router.push('/');
        } else {
          setError(language === 'ko' 
            ? '회원가입은 완료되었지만 자동 로그인에 실패했습니다. 로그인 페이지에서 로그인해주세요.'
            : 'Signup completed but auto-login failed. Please login from the login page.');
        }
      } else {
        setError(data.error || (language === 'ko' ? '회원가입에 실패했습니다.' : 'Signup failed.'));
      }
    } catch (error) {
      console.error('Signup error:', error);
      setError(language === 'ko' ? '회원가입 중 오류가 발생했습니다.' : 'An error occurred during signup.');
    } finally {
      setIsSigningUp(false);
    }
  };

  const handleFindPassword = (e: React.FormEvent) => {
    e.preventDefault();
    alert(language === 'ko' 
      ? `비밀번호 찾기: 사원번호 - ${findPasswordEmployeeNumber}, ${findMethod === 'email' ? '이메일' : '전화번호'} - ${findValue}\n\n실제 비밀번호 찾기 기능은 관리자에게 문의하세요.`
      : `Find Password: Employee Number - ${findPasswordEmployeeNumber}, ${findMethod === 'email' ? 'Email' : 'Phone'} - ${findValue}\n\nPlease contact administrator for password recovery.`);
    // 실제 비밀번호 찾기 로직 구현 필요
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 px-4">
      <div className="w-full max-w-md">
        {/* 로고/제목 영역 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            {language === 'ko' ? '제조 공정 대시보드' : 'Manufacturing Dashboard'}
          </h1>
          <p className="text-slate-600">
            {language === 'ko' ? '로그인하여 시작하세요' : 'Please login to continue'}
          </p>
        </div>

        {/* 로그인/회원가입/비밀번호 찾기 폼 */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          {/* 헤더 */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">
              {mode === 'login' && (language === 'ko' ? '로그인' : 'Login')}
              {mode === 'signup' && (language === 'ko' ? '회원가입' : 'Sign Up')}
              {mode === 'findPassword' && (language === 'ko' ? '비밀번호 찾기' : 'Find Password')}
            </h2>
          </div>

          {/* 로그인 폼 */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-6">
              {/* 사원번호 입력 */}
              <div>
                <label htmlFor="employeeNumber" className="block text-sm font-medium text-slate-700 mb-2">
                  {t('employeeNumber')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <KeyRound className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="employeeNumber"
                    type="text"
                    value={employeeNumber}
                    onChange={(e) => setEmployeeNumber(e.target.value)}
                    required
                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={language === 'ko' ? '사원번호를 입력하세요' : 'Enter employee number'}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* 비밀번호 입력 */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                  {language === 'ko' ? '비밀번호' : 'Password'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <KeyRound className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={language === 'ko' ? '비밀번호를 입력하세요' : 'Enter password'}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* 에러 메시지 */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* 로그인 버튼 */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>{language === 'ko' ? '로그인 중...' : 'Logging in...'}</span>
                  </>
                ) : (
                  <span>{t('login')}</span>
                )}
              </button>

              {/* 회원가입/비밀번호 찾기 버튼 */}
              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setError('');
                  }}
                  className="flex-1 py-2 border border-slate-200 hover:bg-slate-50 text-slate-900 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  {language === 'ko' ? '회원가입' : 'Sign Up'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('findPassword');
                    setError('');
                  }}
                  className="flex-1 py-2 border border-slate-200 hover:bg-slate-50 text-slate-900 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <KeyRound className="h-4 w-4" />
                  {language === 'ko' ? '비밀번호 찾기' : 'Find Password'}
                </button>
              </div>
            </form>
          )}

          {/* 회원가입 폼 */}
          {mode === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('employeeNumber')}
                </label>
                <input
                  type="text"
                  value={signupEmployeeNumber}
                  onChange={(e) => setSignupEmployeeNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={language === 'ko' ? '사원번호를 입력하세요' : 'Enter employee number'}
                  required
                />
                <p className="text-xs text-slate-500 mt-1">
                  {language === 'ko' 
                    ? '이름은 기본값 "사용자"로 설정되며, 설정 페이지에서 변경할 수 있습니다.'
                    : 'Name will be set to "User" by default and can be changed in settings.'}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {language === 'ko' ? '비밀번호' : 'Password'}
                </label>
                <input
                  type="password"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={language === 'ko' ? '비밀번호를 입력하세요 (최소 4자)' : 'Enter password (min 4 chars)'}
                  required
                  minLength={4}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {language === 'ko' ? '비밀번호 확인' : 'Confirm Password'}
                </label>
                <input
                  type="password"
                  value={signupPasswordConfirm}
                  onChange={(e) => setSignupPasswordConfirm(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={language === 'ko' ? '비밀번호를 다시 입력하세요' : 'Re-enter password'}
                  required
                  minLength={4}
                />
              </div>
              
              <button
                type="submit"
                disabled={isSigningUp}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isSigningUp ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>{language === 'ko' ? '회원가입 중...' : 'Signing up...'}</span>
                  </>
                ) : (
                  <span>{language === 'ko' ? '회원가입' : 'Sign Up'}</span>
                )}
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError('');
                  setSignupEmployeeNumber('');
                  setSignupPassword('');
                  setSignupPasswordConfirm('');
                }}
                className="w-full py-2 border border-slate-200 hover:bg-slate-50 text-slate-900 rounded-lg font-medium transition-colors"
              >
                {language === 'ko' ? '로그인으로 돌아가기' : 'Back to Login'}
              </button>
            </form>
          )}

          {/* 비밀번호 찾기 폼 */}
          {mode === 'findPassword' && (
            <form onSubmit={handleFindPassword} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('employeeNumber')}
                </label>
                <input
                  type="text"
                  value={findPasswordEmployeeNumber}
                  onChange={(e) => setFindPasswordEmployeeNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={language === 'ko' ? '사원번호를 입력하세요' : 'Enter employee number'}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {language === 'ko' ? '찾기 방법 선택' : 'Select Method'}
                </label>
                <div className="flex gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => setFindMethod('email')}
                    className={`flex-1 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                      findMethod === 'email'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                    }`}
                  >
                    <Mail className="h-4 w-4" />
                    {language === 'ko' ? '이메일' : 'Email'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFindMethod('phone')}
                    className={`flex-1 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                      findMethod === 'phone'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                    }`}
                  >
                    <Phone className="h-4 w-4" />
                    {language === 'ko' ? '전화번호' : 'Phone'}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {findMethod === 'email' ? (language === 'ko' ? '이메일' : 'Email') : (language === 'ko' ? '전화번호' : 'Phone Number')}
                </label>
                <input
                  type={findMethod === 'email' ? 'email' : 'tel'}
                  value={findValue}
                  onChange={(e) => setFindValue(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={findMethod === 'email' 
                    ? (language === 'ko' ? '이메일을 입력하세요' : 'Enter email')
                    : (language === 'ko' ? '전화번호를 입력하세요' : 'Enter phone number')}
                  required
                />
              </div>
              
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
              >
                {language === 'ko' ? '찾기' : 'Find'}
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError('');
                  setFindPasswordEmployeeNumber('');
                  setFindValue('');
                }}
                className="w-full py-2 border border-slate-200 hover:bg-slate-50 text-slate-900 rounded-lg font-medium transition-colors"
              >
                {language === 'ko' ? '로그인으로 돌아가기' : 'Back to Login'}
              </button>
            </form>
          )}
        </div>

        {/* 푸터 정보 */}
        <div className="mt-6 text-center text-sm text-slate-500">
          <p>{language === 'ko' ? '© 2025 제조 공정 대시보드' : '© 2025 Manufacturing Dashboard'}</p>
        </div>
      </div>
    </div>
  );
}
