'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import RightSidebar from '@/components/RightSidebar';
import WhatIfSimulationPanel from '@/components/WhatIfSimulationPanel';
import { useLanguage } from '@/contexts/LanguageContext';

export default function WhatIfPage() {
  const { language } = useLanguage();
  const [simulationActive, setSimulationActive] = useState(false);

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

      <main className="ml-64 mr-80 mt-16 bg-slate-100 min-h-[calc(100vh-4rem)] p-6">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">
              What-If 시뮬레이션
            </h2>
            <p className="text-slate-600 mt-1">
              {language === 'ko'
                ? '공정 변수 조절 시 예상 수율·전력·생산량·품질 등급 확인'
                : 'Adjust process variables to see expected yield, power, production, and quality grade'}
            </p>
          </div>

          <WhatIfSimulationPanel onSimulationActiveChange={setSimulationActive} />
        </div>
      </main>
    </div>
  );
}
