'use client';

import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import RightSidebar from '@/components/RightSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  AlertTriangle,
  Cpu,
  Package,
  TrendingUp,
  Download,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const AI_GUIDE_TEXT_KO =
  '현재 불량률은 안정적이나 process_time의 변동이 감지됩니다. 생산량 증가에 따른 설비 부하를 방지하기 위해 정기 점검을 권장합니다.';
const AI_GUIDE_TEXT_EN =
  'Current defect rate is stable but process_time variance is detected. Regular maintenance is recommended to prevent equipment load from increased production.';

const REPORT_KPI = [
  {
    titleKo: '금일 전체 불량률',
    titleEn: "Today's Defect Rate",
    value: '1.2%',
    change: '0.2% ↓',
    changeColor: 'text-emerald-600',
    icon: AlertTriangle,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-500',
  },
  {
    titleKo: '가동 중인 설비',
    titleEn: 'Equipment in Operation',
    value: '18 / 20',
    subKo: '정상 작동 중',
    subEn: 'Normal operation',
    icon: Cpu,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-500',
  },
  {
    titleKo: '주요 불량 원인',
    titleEn: 'Top Defect Cause',
    value: 'process_time',
    subKo: '공정 시간 변동',
    subEn: 'Process time variance',
    icon: AlertTriangle,
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-600',
  },
  {
    titleKo: '금일 생산량',
    titleEn: "Today's Production",
    value: '12,540',
    change: '5% ↑',
    changeColor: 'text-red-600',
    unitKo: '개',
    unitEn: ' units',
    icon: Package,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
  },
];

export default function AiReportPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const { language } = useLanguage();
  const reportRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!user) router.replace('/login');
  }, [user, isLoading, router]);

  const handleDownloadPdf = async () => {
    if (!reportRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = (canvas.height * pdfW) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);
      pdf.save('AI-Optimization-Report.pdf');
    } catch (e) {
      console.error(e);
    } finally {
      setDownloading(false);
    }
  };

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
      <RightSidebar />

      <main className="ml-64 mr-80 mt-16 bg-slate-100 min-h-[calc(100vh-4rem)] p-6">
        <div className="max-w-5xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900">
              {language === 'ko' ? 'AI 최적화 보고서' : 'AI Optimization Report'}
            </h1>
            <p className="text-slate-600 mt-1">
              {language === 'ko'
                ? '공정·에너지 기반 AI 분석 결과'
                : 'Process & energy based AI analysis results'}
            </p>
          </div>

          {/* PDF 출력용 영역 (화면에도 동일 표시) */}
          <div ref={reportRef} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {REPORT_KPI.map((kpi) => {
                const Icon = kpi.icon;
                return (
                  <div
                    key={kpi.titleKo}
                    className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200"
                  >
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${kpi.iconBg} ${kpi.iconColor}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-600">
                        {language === 'ko' ? kpi.titleKo : kpi.titleEn}
                      </p>
                      <p className="text-xl font-bold text-slate-900 mt-1">
                        {kpi.value}
                        {(kpi as { unitKo?: string }).unitKo && (
                          <span className="text-sm font-normal text-slate-500 ml-1">
                            {language === 'ko' ? (kpi as { unitKo: string }).unitKo : (kpi as { unitEn: string }).unitEn}
                          </span>
                        )}
                      </p>
                      {'change' in kpi && kpi.change && (
                        <p className={`text-sm mt-0.5 ${kpi.changeColor}`}>{kpi.change}</p>
                      )}
                      {'subKo' in kpi && (kpi as { subKo: string }).subKo && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          {language === 'ko' ? (kpi as { subKo: string }).subKo : (kpi as { subEn: string }).subEn}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-slate-200 pt-4">
              <p className="text-sm text-slate-600">
                {language === 'ko' ? AI_GUIDE_TEXT_KO : AI_GUIDE_TEXT_EN}
              </p>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Download className="h-5 w-5" />
              {downloading
                ? (language === 'ko' ? '생성 중...' : 'Generating...')
                : (language === 'ko' ? '보고서 다운로드 (PDF)' : 'Download Report (PDF)')}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
