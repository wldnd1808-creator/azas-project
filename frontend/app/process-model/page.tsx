'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import ProcessModel2D from '@/components/ProcessModel2D';
import { useLanguage } from '@/contexts/LanguageContext';

const Process3D = dynamic(() => import('@/components/Process3D'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[550px] rounded-lg bg-slate-100">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});
import { authHeader, dashboardApiUrl } from '@/lib/api-client';

type LotInfo = {
  lotId: string;
  passFailResult: string | null;
  processTime: number | null;
};

export default function ProcessModelPage() {
  const { language } = useLanguage();
  const [lots, setLots] = useState<LotInfo[]>([]);
  const [lotProgress, setLotProgress] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const animRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    fetch(dashboardApiUrl('/api/dashboard/lot-status?period=day&all=1'), { headers: authHeader() })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.lots) && data.lots.length > 0) {
          setLots(
            data.lots.slice(0, 12).map((l: any) => ({
              lotId: l.lotId,
              passFailResult: l.passFailResult,
              processTime: l.processTime,
            }))
          );
        } else {
          setLots([
            { lotId: 'LOT-001', passFailResult: '합격', processTime: 45 },
            { lotId: 'LOT-002', passFailResult: '불합격', processTime: 52 },
            { lotId: 'LOT-003', passFailResult: '합격', processTime: 38 },
          ]);
        }
      })
      .catch(() => {
        setError(language === 'ko' ? 'LOT 데이터를 불러올 수 없습니다.' : 'Failed to load LOT data.');
        setLots([
          { lotId: 'DEMO-1', passFailResult: '합격', processTime: 45 },
          { lotId: 'DEMO-2', passFailResult: '불합격', processTime: 52 },
        ]);
      })
      .finally(() => setLoading(false));
  }, [language]);

  useEffect(() => {
    startTimeRef.current = 0;
    const duration = 25000;
    const animate = (ts: number) => {
      if (!startTimeRef.current) startTimeRef.current = ts;
      const elapsed = (ts - startTimeRef.current) % duration;
      const baseProgress = elapsed / duration;

      setLotProgress((prev) => {
        const next: Record<string, number> = {};
        lots.forEach((lot, i) => {
          const offset = (i / Math.max(lots.length, 1)) * 0.85;
          const p = (baseProgress + offset) % 1;
          next[lot.lotId] = p;
        });
        return next;
      });
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [lots]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <Sidebar />
      <main className="pl-64 pr-80 pt-16 min-h-screen">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">
            {language === 'ko' ? '공정 실시간 모델' : 'Process Real-time Model'}
          </h1>
          <p className="text-slate-600 text-sm mb-6">
            {language === 'ko'
              ? '왼쪽에서 오른쪽으로 흐르는 공정 흐름. LOT이 라인을 따라 이동합니다.'
              : 'Process flow from left to right. LOTs move along the line.'}
          </p>

          {error && (
            <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-[280px] rounded-xl bg-slate-100">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <ProcessModel2D lots={lots} lotProgress={lotProgress} language={language} />
              <div className="text-right text-xs text-slate-500">
                {lots.length} LOT
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-800 mb-2">
                  {language === 'ko' ? '3D 공정 모니터링' : '3D Process Monitoring'}
                </h2>
                <Process3D />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
