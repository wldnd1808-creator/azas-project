'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import RightSidebar from '@/components/RightSidebar';
import Card from '@/components/Card';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [name, setName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showNameLimit, setShowNameLimit] = useState(false);

  const isEnglishName = (value: string) => /^[A-Za-z\s]+$/.test(value.trim());
  const getMaxNameLength = (value: string) => (isEnglishName(value) ? 10 : 5);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
    }
  }, [user]);

  const handleNameChange = (value: string) => {
    const maxLen = getMaxNameLength(value);
    if (value.length > maxLen) {
      setName(value.slice(0, maxLen));
      setShowNameLimit(true);
      return;
    }
    setName(value);
    setShowNameLimit(false);
  };

  const handleNameUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmed = name.trim();
    if (!trimmed) {
      setMessage({ type: 'error', text: t('settings.nameRequired') });
      return;
    }

    const maxLen = getMaxNameLength(trimmed);
    if (trimmed.length > maxLen) {
      setMessage({ type: 'error', text: t('settings.nameTooLong') });
      return;
    }

    setIsUpdating(true);
    setMessage(null);

    try {
      const response = await fetch('/api/auth/update-name', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: trimmed }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage({ type: 'success', text: t('settings.nameUpdated') });
        // 사용자 정보 업데이트
        if (data.user) {
          updateUser(data.user);
        }
      } else {
        setMessage({ type: 'error', text: data.error || t('settings.nameUpdateFailed') });
      }
    } catch (error) {
      console.error('Update name error:', error);
      setMessage({ type: 'error', text: t('settings.nameUpdateFailed') });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <Navbar />
      <RightSidebar />
      
      <main className="ml-64 mr-80 mt-16 bg-slate-100 min-h-[calc(100vh-4rem)] p-6">
        <div className="max-w-full mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">{t('settings.title')}</h2>
            <p className="text-slate-600 mt-1">{t('settings.subtitle')}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title={t('settings.myInfo')}>
              <div className="space-y-4">
                {message && (
                  <div className={`p-3 rounded-lg text-sm ${
                    message.type === 'success' 
                      ? 'bg-green-50 border border-green-200 text-green-700'
                      : 'bg-red-50 border border-red-200 text-red-700'
                  }`}>
                    {message.text}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    {t('employeeNumber')}
                  </label>
                  <input
                    type="text"
                    value={user?.employeeNumber || ''}
                    disabled
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-600 cursor-not-allowed"
                  />
                </div>
                <form onSubmit={handleNameUpdate}>
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      {t('name')}
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      maxLength={10}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500"
                      placeholder={t('settings.namePlaceholder')}
                      required
                    />
                    {showNameLimit && (
                      <p className="mt-1 text-xs text-red-600">
                        {getMaxNameLength(name) === 10 ? t('settings.nameMax10') : t('settings.nameMax5')}
                      </p>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={isUpdating || !name.trim() || name === user?.name}
                    className="mt-3 w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                  >
                    {isUpdating ? t('settings.updating') : t('settings.updateName')}
                  </button>
                </form>
              </div>
            </Card>

            <Card title={t('settings.general')}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    {t('settings.systemName')}
                  </label>
                  <input
                    type="text"
                    defaultValue={language === 'ko' ? '제조 공정 시스템' : 'Manufacturing System'}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    {t('settings.language')}
                  </label>
                  <select 
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as 'ko' | 'en')}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900"
                  >
                    <option value="ko">{t('settings.korean')}</option>
                    <option value="en">{t('settings.english')}</option>
                  </select>
                </div>
              </div>
            </Card>

            <Card title={t('settings.notifications')}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-900">{t('settings.emailNotification')}</span>
                  <input type="checkbox" className="w-4 h-4" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-900">{t('settings.smsNotification')}</span>
                  <input type="checkbox" className="w-4 h-4" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-900">{t('settings.warningNotification')}</span>
                  <input type="checkbox" className="w-4 h-4" defaultChecked />
                </div>
              </div>
            </Card>

            <Card title={t('settings.security')}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    {t('settings.changePassword')}
                  </label>
                  <input
                    type="password"
                    placeholder={t('settings.newPassword')}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 mb-2"
                  />
                  <input
                    type="password"
                    placeholder={t('settings.confirmPassword')}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
              </div>
            </Card>

            <Card title={t('settings.systemInfo')}>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">{t('settings.version')}</span>
                  <span className="text-sm text-slate-900">v1.0.0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">{t('settings.lastUpdate')}</span>
                  <span className="text-sm text-slate-900">2025.01.27</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
