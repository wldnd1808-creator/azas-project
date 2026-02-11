'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import RightSidebar from '@/components/RightSidebar';
import Card from '@/components/Card';
import Toast from '@/components/Toast';
import { useLanguage } from '@/contexts/LanguageContext';

function addCommunityLog() {
  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('add-community-log', {
        detail: {
          user: '시스템',
          message: '[자동 제어] 습도 조절을 통해 예상 불량 5건을 방지했습니다',
          time: timeStr,
          content: '제습 설비 강도를 \'강\'으로 조절하여 습도를 안정화했습니다. 예상 불량 5건이 방지되었습니다.',
        },
      })
    );
  }
}

// humidity 구간별 불량률 데이터 (72% 이상 구간 = 위험)
const HUMIDITY_DEFECT_DATA = [
  { range: '50~55%', min: 50, max: 55, defectRate: 2.1, isDanger: false },
  { range: '55~60%', min: 55, max: 60, defectRate: 2.8, isDanger: false },
  { range: '60~65%', min: 60, max: 65, defectRate: 3.5, isDanger: false },
  { range: '65~70%', min: 65, max: 70, defectRate: 5.2, isDanger: false },
  { range: '70~72%', min: 70, max: 72, defectRate: 7.1, isDanger: false },
  { range: '72~75%', min: 72, max: 75, defectRate: 12.3, isDanger: true },
  { range: '75~80%', min: 75, max: 80, defectRate: 18.5, isDanger: true },
  { range: '80%+', min: 80, max: 100, defectRate: 24.2, isDanger: true },
];

const DANGER_THRESHOLD = 72;

function HumidityDefectChart({
  currentHumidity,
  onDangerEnter,
}: {
  currentHumidity: number;
  onDangerEnter: () => void;
}) {
  const maxDefect = Math.max(...HUMIDITY_DEFECT_DATA.map((d) => d.defectRate));

  useEffect(() => {
    if (currentHumidity >= DANGER_THRESHOLD) {
      onDangerEnter();
    }
  }, [currentHumidity, onDangerEnter]);

  return (
    <div className="h-80 p-4">
      <div className="h-full flex items-end justify-between gap-1">
        {HUMIDITY_DEFECT_DATA.map((item, index) => {
          const height = (item.defectRate / maxDefect) * 100;
          const isActive = currentHumidity >= item.min && currentHumidity < item.max;
          return (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div className="w-full flex flex-col items-center justify-end h-full">
                <div
                  className={`w-full rounded-t transition-colors cursor-pointer relative group ${
                    item.isDanger ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'
                  } ${isActive ? 'ring-2 ring-blue-600 ring-offset-2' : ''}`}
                  style={{ height: `${height}%` }}
                >
                  <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                    불량률 {item.defectRate}%
                  </div>
                </div>
              </div>
              <div className="mt-2 text-[10px] text-slate-600 text-center leading-tight">
                {item.range}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex items-center gap-4 text-xs text-slate-600">
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-blue-500" /> 안전 구간
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-red-500" /> 위험 구간 (72% 이상)
        </span>
        <span className="ml-auto font-medium text-slate-900">
          현재 습도: <span className={currentHumidity >= DANGER_THRESHOLD ? 'text-red-600' : 'text-blue-600'}>{currentHumidity}%</span>
        </span>
      </div>
    </div>
  );
}

function DefectTrendChart({ approvedAt }: { approvedAt: number | null }) {
  const [points, setPoints] = useState<number[]>([2.1, 2.8, 3.2, 4.1, 5.0, 6.2, 7.5, 9.0, 10.5]);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (approvedAt !== null && !hasAnimated.current) {
      hasAnimated.current = true;
      setPoints((prev) => [...prev, 11.5, 9.2, 6.8, 4.5, 3.2]);
    }
  }, [approvedAt]);

  const allPoints = points;
  const maxVal = Math.max(...allPoints);
  const minVal = Math.min(...allPoints);
  const range = maxVal - minVal || 1;
  const w = 400;
  const h = 120;
  const pad = 10;

  const toPath = () => {
    const step = (w - pad * 2) / (allPoints.length - 1);
    return allPoints
      .map((v, i) => {
        const x = pad + i * step;
        const y = h - pad - ((v - minVal) / range) * (h - pad * 2);
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  };

  return (
    <div className="h-40 p-4">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full" preserveAspectRatio="none">
        <path
          d={toPath()}
          fill="none"
          stroke="rgb(239, 68, 68)"
          strokeWidth="2"
          strokeDasharray="6 4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
    </div>
  );
}

function HumidityWarningModal({
  isOpen,
  onClose,
  onApprove,
  onViewDetail,
}: {
  isOpen: boolean;
  onClose: () => void;
  onApprove: () => void;
  onViewDetail: () => void;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="px-6 pt-6 pb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-4 text-xs font-semibold text-amber-700 bg-amber-100 rounded-lg">
            <span>⚠</span>
            <span>예측 기반 경고</span>
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">습도 위험 사전 차단 알림</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            🔍 습도 변수가 위험 구간에 진입 중입니다. 제습 설비를 가동할까요?
          </p>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onApprove}
            className="flex-1 px-4 py-3 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            설비 제어 승인
          </button>
          <button
            onClick={onViewDetail}
            className="flex-1 px-4 py-3 font-semibold text-slate-700 bg-slate-200 rounded-lg hover:bg-slate-300 transition-colors"
          >
            상세 데이터 보기
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DefectAnalysisPage() {
  const { t, language } = useLanguage();
  const [currentHumidity, setCurrentHumidity] = useState(70);
  const [showWarning, setShowWarning] = useState(false);
  const [warningShown, setWarningShown] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [approvedAt, setApprovedAt] = useState<number | null>(null);

  const handleDangerEnter = useCallback(() => {
    if (!warningShown) {
      setShowWarning(true);
      setWarningShown(true);
    }
  }, [warningShown]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (!warningShown && !approvedAt) {
        setShowWarning(true);
        setWarningShown(true);
      }
    }, 5000);
    return () => clearTimeout(t);
  }, [warningShown, approvedAt]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentHumidity((prev) => {
        if (approvedAt !== null) return 65;
        if (prev >= 75) return 70;
        return prev + Math.random() * 2 + 1;
      });
    }, 2000);
    return () => clearInterval(timer);
  }, [approvedAt]);

  const handleApprove = async () => {
    const startH = currentHumidity;
    setShowWarning(false);
    setApprovedAt(Date.now());
    setToastVisible(true);
    addCommunityLog();

    const targetH = 65;
    const steps = 8;
    for (let i = 1; i <= steps; i++) {
      await new Promise((r) => setTimeout(r, 120));
      const next = Math.round(startH - ((startH - targetH) * i) / steps);
      setCurrentHumidity(Math.max(targetH, next));
    }
    setCurrentHumidity(targetH);

    try {
      await fetch('/api/telegram-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `🔔 [습도 위험 사전 차단] 제습 설비 가동 승인됨\n\n습도: ${Math.round(startH)}% → ${targetH}%\n시각: ${new Date().toLocaleString('ko-KR')}`,
        }),
      });
    } catch (_) {}
  };

  const handleViewDetail = () => {
    setShowWarning(false);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <Navbar />
      <RightSidebar />

      <main className="ml-64 mr-80 mt-16 bg-slate-100 min-h-[calc(100vh-4rem)] p-6">
        <div className="max-w-full mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">
              {language === 'ko' ? '주요 변수 구간별 불량률 분석' : 'Defect Rate by Variable Range'}
            </h2>
            <p className="text-slate-600 mt-1">
              {language === 'ko'
                ? '습도(humidity) 구간별 불량률 · 72% 이상 위험 구간'
                : 'Defect rate by humidity range · Danger zone above 72%'}
            </p>
          </div>

          <Card
            title={language === 'ko' ? 'Humidity 구간별 불량률' : 'Defect Rate by Humidity'}
            className="mb-6"
          >
            <HumidityDefectChart currentHumidity={Math.round(currentHumidity)} onDangerEnter={handleDangerEnter} />
          </Card>

          <Card
            title={language === 'ko' ? '불량률 추이' : 'Defect Rate Trend'}
            className="mb-6"
          >
            <DefectTrendChart approvedAt={approvedAt} />
          </Card>
        </div>
      </main>

      <Toast
        message="제습 설비가 강으로 조절되었습니다. 습도 수치가 하향 안정화됩니다."
        isVisible={toastVisible}
        onClose={() => setToastVisible(false)}
      />

      <HumidityWarningModal
        isOpen={showWarning}
        onClose={() => setShowWarning(false)}
        onApprove={handleApprove}
        onViewDetail={handleViewDetail}
      />
    </div>
  );
}
