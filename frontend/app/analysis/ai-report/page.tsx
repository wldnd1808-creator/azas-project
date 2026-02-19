'use client';

import { useRef, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import RightSidebar from '@/components/RightSidebar';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  AlertTriangle,
  Cpu,
  Package,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  Download,
} from 'lucide-react';

const AI_GUIDE_TEXT =
  '현재 불량률은 안정적이나 process_time의 변동이 감지됩니다. 생산량 증가에 따른 설비 부하를 방지하기 위해 정기 점검을 권장합니다.';

const REPORT_KPI = [
  {
    titleKo: '금일 전체 불량률',
    titleEn: 'Today\'s Defect Rate',
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
    unitKo: '대',
    unitEn: ' units',
    icon: Cpu,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-500',
  },
  {
    titleKo: '금일 생산량',
    titleEn: 'Today\'s Production',
    value: '12,540',
    change: '5% ↑',
    changeColor: 'text-red-600',
    unitKo: '개',
    unitEn: ' ea',
    icon: Package,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-500',
  },
  {
    titleKo: '주요 불량 원인',
    titleEn: 'Top Defect Cause',
    value: 'process_time',
    subKo: '1위 항목',
    subEn: 'Rank 1',
    icon: AlertCircle,
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-500',
  },
];

const A4_MM = { w: 210, h: 297 };

export default function AIReportPage() {
  const { language } = useLanguage();
  const pdfReportRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownloadPdf = async () => {
    if (!pdfReportRef.current || typeof window === 'undefined') return;
    setIsGenerating(true);
    try {
      const [html2canvasModule, jspdfModule] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);
      const html2canvas = html2canvasModule.default;
      const { jsPDF } = jspdfModule;

      const canvas = await html2canvas(pdfReportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const pageW = A4_MM.w;
      const pageH = A4_MM.h;
      const imgRatio = canvas.width / canvas.height;
      const pageRatio = pageW / pageH;
      let w = pageW;
      let h = pageH;
      if (imgRatio > pageRatio) {
        h = pageW / imgRatio;
      } else {
        w = pageH * imgRatio;
      }
      const doc = new jsPDF('p', 'mm', 'a4');
      doc.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, w, h);

      doc.save(`AI-optimization-report-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) {
      console.error('PDF generation failed:', e);
      window.alert(language === 'ko' ? 'PDF 생성에 실패했습니다.' : 'Failed to generate PDF.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <Sidebar />
      <RightSidebar />
      <main className="ml-64 mr-80 mt-16 bg-slate-100 min-h-[calc(100vh-4rem)] p-6">
        <div className="max-w-full mx-auto">
          {/* PDF용 숨김 보고서 (html2canvas 캡처 대상) */}
          <div
            ref={pdfReportRef}
            aria-hidden
            style={{
              position: 'fixed',
              left: '-9999px',
              top: 0,
              width: '210mm',
              minHeight: '297mm',
              padding: '20mm',
              backgroundColor: '#ffffff',
              fontFamily: 'Malgun Gothic, Apple SD Gothic Neo, sans-serif',
              color: '#0f172a',
              boxSizing: 'border-box',
            }}
          >
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>AI 최적화 보고서</h1>
            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 24 }}>
              생성일시: {new Date().toLocaleString('ko-KR')}
            </p>
            <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#334155' }}>주요 지표</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 28, fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ textAlign: 'left', padding: '10px 8px', color: '#64748b' }}>지표</th>
                  <th style={{ textAlign: 'left', padding: '10px 8px', color: '#64748b' }}>값</th>
                  <th style={{ textAlign: 'left', padding: '10px 8px', color: '#64748b' }}>비고</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 8px' }}>금일 전체 불량률</td>
                  <td style={{ padding: '10px 8px', fontWeight: 600 }}>1.2%</td>
                  <td style={{ padding: '10px 8px', color: '#059669' }}>전일 대비 0.2% ↓</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 8px' }}>가동 중인 설비</td>
                  <td style={{ padding: '10px 8px', fontWeight: 600 }}>18 / 20대</td>
                  <td style={{ padding: '10px 8px', color: '#64748b' }}>정상 작동 중</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 8px' }}>금일 생산량</td>
                  <td style={{ padding: '10px 8px', fontWeight: 600 }}>12,540개</td>
                  <td style={{ padding: '10px 8px', color: '#dc2626' }}>전일 대비 5% ↑</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 8px' }}>주요 불량 원인</td>
                  <td style={{ padding: '10px 8px', fontWeight: 600 }}>process_time</td>
                  <td style={{ padding: '10px 8px', color: '#64748b' }}>1위 항목</td>
                </tr>
              </tbody>
            </table>
            <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, color: '#334155' }}>AI 최적화 가이드</h2>
            <p style={{ fontSize: 12, lineHeight: 1.7, color: '#475569', margin: 0 }}>
              {AI_GUIDE_TEXT}
            </p>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">
              {language === 'ko' ? 'AI 최적화 보고서' : 'AI Optimization Report'}
            </h2>
            <p className="text-slate-600 mt-1">
              {language === 'ko'
                ? 'AI 기반 공정·에너지 최적화 분석 결과를 확인합니다.'
                : 'View AI-based process and energy optimization analysis results.'}
            </p>
          </div>

          {/* KPI 카드 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {REPORT_KPI.map((kpi, idx) => {
              const Icon = kpi.icon;
              const title = language === 'ko' ? kpi.titleKo : kpi.titleEn;
              const valueDisplay = kpi.value + (kpi.unitKo ? (language === 'ko' ? kpi.unitKo : kpi.unitEn || '') : '');
              return (
                <div
                  key={idx}
                  className="relative overflow-hidden bg-white rounded-xl border border-slate-100 p-5 transition-shadow hover:shadow-lg"
                  style={{ boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)' }}
                >
                  <div className={`absolute top-4 right-4 w-10 h-10 rounded-lg ${kpi.iconBg} flex items-center justify-center ${kpi.iconColor}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-medium text-slate-600 mb-1">{title}</h3>
                  <p className="text-2xl font-bold text-slate-900 tracking-tight">{valueDisplay}</p>
                  {kpi.change && (
                    <p className={`text-sm font-medium mt-1 flex items-center gap-1 ${kpi.changeColor}`}>
                      {language === 'ko' ? '전일 대비 ' : 'Vs yesterday '}{kpi.change}
                      {kpi.change.includes('↓') ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                    </p>
                  )}
                  {kpi.subKo && !kpi.change && (
                    <p className="text-sm text-slate-500 mt-1">
                      {language === 'ko' ? kpi.subKo : kpi.subEn}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* 보고서 다운로드 (PDF) */}
          <div className="flex justify-center pt-8 pb-4">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGenerating}
              className="inline-flex items-center justify-center gap-3 px-10 py-4 text-lg font-semibold text-white bg-slate-800 hover:bg-slate-700 disabled:bg-slate-500 disabled:cursor-not-allowed rounded-xl shadow-md hover:shadow-lg transition-all border border-slate-700"
            >
              {isGenerating ? (
                <>
                  <span className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {language === 'ko' ? 'PDF 생성 중...' : 'Generating PDF...'}
                </>
              ) : (
                <>
                  <Download className="w-6 h-6" />
                  {language === 'ko' ? '보고서 다운로드 (PDF)' : 'Download Report (PDF)'}
                </>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
