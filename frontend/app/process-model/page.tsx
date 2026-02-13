'use client';

import { useState, useMemo } from 'react';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import RightSidebar from '@/components/RightSidebar';
import Card from '@/components/Card';
import WhatIfSimulationPanel from '@/components/WhatIfSimulationPanel';
import { useLanguage } from '@/contexts/LanguageContext';

const PROCESS_DATA = [
  { process: '혼합', power: 420, production: 1200, target_production: 1500 },
  { process: '코팅', power: 580, production: 980, target_production: 1200 },
  { process: '건조', power: 720, production: 850, target_production: 1000 },
  { process: '소성', power: 1500, production: 820, target_production: 1500 },
  { process: '분쇄', power: 380, production: 1500, target_production: 1800 },
];

const TARIFF_BY_HOUR = [
  { hour: 0, rate: 85 },
  { hour: 6, rate: 95 },
  { hour: 9, rate: 180 },
  { hour: 12, rate: 220 },
  { hour: 17, rate: 250 },
  { hour: 22, rate: 95 },
  { hour: 23, rate: 85 },
];

const CARBON_FACTOR = 0.00042;

function getTariffForHour(h: number): number {
  let rate = 95;
  for (let i = TARIFF_BY_HOUR.length - 1; i >= 0; i--) {
    if (h >= TARIFF_BY_HOUR[i].hour) {
      rate = TARIFF_BY_HOUR[i].rate;
      break;
    }
  }
  return rate;
}

function getTariffLabel(h: number): string {
  if (h >= 22 || h < 6) return '야간';
  if (h >= 17 && h < 22) return '최대부하';
  if (h >= 12 && h < 17) return '최대부하';
  if (h >= 9 && h < 12) return '중간부하';
  return '경부하';
}

interface HeatmapModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: { process: string; hour: number; cost: number; carbon: number; isHighCost: boolean } | null;
}

function HeatmapDetailModal({ isOpen, onClose, data }: HeatmapModalProps) {
  if (!isOpen || !data) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-md bg-white rounded-lg border border-slate-200 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">
            {data.process} 공정 · {data.hour}시 ({getTariffLabel(data.hour)})
          </h3>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-900 text-2xl leading-none"
            aria-label="닫기"
          >
            ×
          </button>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg border-l-4 border-blue-600">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">예상 비용</div>
              <div className="text-xl font-bold text-blue-600 font-mono mt-1">
                {Math.round(data.cost).toLocaleString()} 원
              </div>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg border-l-4 border-blue-600">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">탄소 배출량</div>
              <div className="text-xl font-bold text-blue-600 font-mono mt-1">
                {data.carbon.toFixed(4)} tCO₂e
              </div>
            </div>
          </div>
          {data.isHighCost && (
            <div className="p-4 bg-red-50 rounded-lg border-l-4 border-red-500">
              <p className="text-sm text-slate-900 flex items-start gap-2">
                <span className="text-red-500 font-bold shrink-0">⚠</span>
                해당 시간대는 고비용 구간입니다. 야간·경부하 시간대로 가동을 이동하면 15~25% 비용 절감이 예상됩니다.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProcessModelPage() {
  const { t, language } = useLanguage();
  const [modalData, setModalData] = useState<HeatmapDetailModalProps['data']>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [simulationActive, setSimulationActive] = useState(false);

  const { costData, globalMax } = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const rateByHour = hours.map((h) => getTariffForHour(h));
    let max = 0;
    const data = PROCESS_DATA.map((p) =>
      hours.map((h) => {
        const share = p.power / 24;
        const cost = share * rateByHour[h];
        if (cost > max) max = cost;
        return cost;
      })
    );
    return { costData: data, globalMax: max };
  }, []);

  const handleCellClick = (processIndex: number, hour: number) => {
    const p = PROCESS_DATA[processIndex];
    const cost = costData[processIndex][hour];
    const powerPerHour = p.power / 24;
    const carbonT = (powerPerHour * CARBON_FACTOR) / 1000;
    const pct = globalMax > 0 ? (cost / globalMax) * 100 : 0;
    const isHighCost = pct >= 70;
    setModalData({
      process: p.process,
      hour,
      cost,
      carbon: carbonT,
      isHighCost,
    });
    setModalOpen(true);
  };

  return (
    <div
      className={`min-h-screen bg-slate-50 transition-all duration-500 ${
        simulationActive
          ? 'relative ring-2 ring-cyan-400/40 shadow-[0_0_0_1px_rgba(34,211,238,0.3),0_0_40px_rgba(34,211,238,0.12),0_0_80px_rgba(34,211,238,0.06)]'
          : ''
      }`}
    >
      <Sidebar />
      <Navbar />
      <RightSidebar />

      <main className="ml-64 mr-80 mt-16 bg-slate-100 min-h-[calc(100vh-4rem)] p-6 min-w-0">
        <div className="max-w-full mx-auto min-h-[400px]">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">
              {language === 'ko' ? '공정 모델' : 'Process Model'}
            </h2>
            <p className="text-slate-600 mt-1">
              {language === 'ko'
                ? '시간대별 공정 비용 분석 · 클릭하면 상세 정보 확인'
                : 'Time-based process cost analysis · Click for details'}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
            <Card
              title={language === 'ko' ? '시간대별 공정 비용 히트맵' : 'Time-based Process Cost Heatmap'}
              className="mb-6 lg:mb-0"
            >
              <p className="text-sm text-slate-600 mb-4">
                {language === 'ko'
                  ? '시간대 × 공정별 예상 전력 비용 (원/kWh 반영) · 셀을 클릭하면 상세 분석'
                  : 'Hour × Process expected power cost (reflects ₩/kWh) · Click cell for details'}
              </p>
              <div className="overflow-x-auto">
                <div className="grid grid-cols-[80px_1fr] grid-rows-[auto_1fr_auto] gap-2 min-w-[560px]">
                  <div className="col-start-1 row-start-2 flex flex-col gap-1 pt-3 text-xs text-slate-600">
                    {PROCESS_DATA.map((p) => (
                      <span key={p.process} className="whitespace-nowrap leading-8">
                        {p.process}
                      </span>
                    ))}
                  </div>
                  <div className="col-start-2 row-start-2 flex flex-col gap-1">
                    {costData.map((row, pi) => (
                      <div key={pi} className="grid gap-0.5 min-h-6" style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}>
                        {row.map((cost, hi) => {
                          const pct = globalMax > 0 ? (cost / globalMax) * 100 : 0;
                          const opacity = 0.2 + (pct / 100) * 0.6;
                          return (
                            <button
                              key={hi}
                              type="button"
                              onClick={() => handleCellClick(pi, hi)}
                              className="min-h-[20px] rounded border border-slate-200 hover:scale-105 hover:shadow-md hover:shadow-blue-200/50 transition-all cursor-pointer"
                              style={{
                                background: `rgba(59, 130, 246, ${opacity})`,
                              }}
                              title={`약 ${Math.round(cost).toLocaleString()}원 · ${language === 'ko' ? '클릭하면 상세 분석' : 'Click for details'}`}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                  <div className="col-start-2 row-start-3 grid gap-0.5 text-[10px] text-slate-500 mt-1" style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}>
                    {Array.from({ length: 24 }, (_, h) => (
                      <span key={h} className="text-center">
                        {h % 6 === 0 ? `${h}시` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-4 text-xs text-slate-600">
                <span>{language === 'ko' ? '저비용' : 'Low cost'}</span>
                <div className="w-24 h-2 rounded bg-gradient-to-r from-slate-200 to-blue-500" />
                <span>{language === 'ko' ? '고비용' : 'High cost'}</span>
              </div>
            </Card>

            <div className="lg:min-h-[480px] lg:sticky lg:top-24">
              <WhatIfSimulationPanel onSimulationActiveChange={setSimulationActive} />
            </div>
          </div>
        </div>
      </main>

      <HeatmapDetailModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        data={modalData}
      />
    </div>
  );
}
