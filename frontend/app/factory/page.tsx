'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import RightSidebar from '@/components/RightSidebar';
import { type MachineDetail } from '@/components/Process3D';

const Process3DWithSSR = dynamic(() => import('@/components/Process3D'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[550px] rounded-lg bg-slate-100">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

/** 센서 데이터 타입 */
type MachineSensorData = {
  name: string;
  temperature: number;
  vibration: number;
  rpm: number;
  power: number;
  status: 'normal' | 'warning' | 'error';
};

/** 설비별 센서 데이터 (id를 키로 사용) */
const MACHINE_DATA: Record<string, MachineSensorData> = {
  'raw-input-1': {
    name: 'Pre-mixing Tank',
    temperature: 25,
    vibration: 1.2,
    rpm: 0,
    power: 12,
    status: 'normal',
  },
  'mixer-1': {
    name: 'Kiln #1 Mixer',
    temperature: 45,
    vibration: 4.8,
    rpm: 120,
    power: 28,
    status: 'error',
  },
  'filler-1': {
    name: 'Filling Station',
    temperature: 32,
    vibration: 2.1,
    rpm: 60,
    power: 18,
    status: 'normal',
  },
  'kiln-3': {
    name: 'Kiln #3',
    temperature: 850,
    vibration: 3.5,
    rpm: 2,
    power: 120,
    status: 'warning',
  },
  'coarse-mill-1': {
    name: 'Coarse Mill',
    temperature: 55,
    vibration: 5.2,
    rpm: 180,
    power: 42,
    status: 'normal',
  },
  'fine-mill-1': {
    name: 'Fine Mill',
    temperature: 48,
    vibration: 4.1,
    rpm: 220,
    power: 55,
    status: 'normal',
  },
  'sieve-1': {
    name: 'Sieve Unit',
    temperature: 35,
    vibration: 2.8,
    rpm: 90,
    power: 22,
    status: 'normal',
  },
  'magnet-1': {
    name: 'Magnetic Separator',
    temperature: 38,
    vibration: 1.9,
    rpm: 45,
    power: 35,
    status: 'normal',
  },
  'packer-1': {
    name: 'Packing Unit',
    temperature: 28,
    vibration: 1.5,
    rpm: 30,
    power: 15,
    status: 'normal',
  },
};

/** 공정 순서 (Process3D 레이아웃 매칭) */
const MACHINE_IDS = [
  'raw-input-1',
  'mixer-1',
  'filler-1',
  'kiln-3',
  'coarse-mill-1',
  'fine-mill-1',
  'sieve-1',
  'magnet-1',
  'packer-1',
];

/** Process3D에 전달할 데이터 (MachineDetail 형식) */
const machineDataFor3D: MachineDetail[] = MACHINE_IDS.map((id) => {
  const d = MACHINE_DATA[id];
  return {
    id,
    name: d.name,
    temperature: d.temperature,
    vibration: d.vibration,
    rpm: d.rpm,
    power: d.power,
    status: d.status,
  };
});

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  normal: { bg: 'bg-emerald-500/30', text: 'text-emerald-400', label: '정상' },
  warning: { bg: 'bg-amber-500/30', text: 'text-amber-400', label: '점검 필요' },
  error: { bg: 'bg-red-500/30', text: 'text-red-400', label: 'ERROR' },
};

export default function FactoryPage() {
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);
  const selectedMachine = selectedMachineId ? MACHINE_DATA[selectedMachineId] ?? null : null;

  const handleMachineClick = (detail: MachineDetail) => {
    setSelectedMachineId(detail.id);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <Sidebar />
      <RightSidebar />
      <main className="pl-64 pr-80 pt-16 min-h-screen">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">설비 모니터링</h1>
          <p className="text-slate-600 text-sm mb-6">설비를 클릭하면 상세 데이터를 확인할 수 있습니다.</p>

          <div className="relative">
            <Process3DWithSSR
              machineData={machineDataFor3D}
              onMachineClick={handleMachineClick}
              selectedMachineId={selectedMachineId}
            />

            {/* 데이터 대시보드 패널 (HUD) - selectedMachine 있을 때만 우측 상단 */}
            {selectedMachine && (
              <div
                className="absolute top-4 right-4 z-20 w-80 rounded-lg bg-black/80 border border-gray-700 text-white font-sans shadow-2xl"
                style={{ pointerEvents: 'auto' }}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <h3 className="font-semibold text-lg text-white">{selectedMachine.name}</h3>
                    <button
                      onClick={() => setSelectedMachineId(null)}
                      className="shrink-0 w-8 h-8 flex items-center justify-center rounded hover:bg-white/20 transition-colors text-gray-400 hover:text-white text-xl leading-none"
                      aria-label="닫기"
                    >
                      ×
                    </button>
                  </div>
                  <span
                    className={`inline-flex px-2.5 py-1 rounded text-xs font-semibold ${
                      STATUS_STYLES[selectedMachine.status]?.bg ?? 'bg-gray-500/30'
                    } ${STATUS_STYLES[selectedMachine.status]?.text ?? 'text-gray-400'}`}
                  >
                    {STATUS_STYLES[selectedMachine.status]?.label ?? selectedMachine.status}
                  </span>
                  <dl className="mt-4 space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                      <dt className="text-gray-400">온도</dt>
                      <dd className="font-mono text-white">{selectedMachine.temperature} °C</dd>
                    </div>
                    <div className="flex justify-between items-center">
                      <dt className="text-gray-400">진동</dt>
                      <dd className="font-mono text-white">{selectedMachine.vibration} mm/s</dd>
                    </div>
                    <div className="flex justify-between items-center">
                      <dt className="text-gray-400">RPM</dt>
                      <dd className="font-mono text-white">{selectedMachine.rpm}</dd>
                    </div>
                    <div className="flex justify-between items-center">
                      <dt className="text-gray-400">전력</dt>
                      <dd className="font-mono text-white">{selectedMachine.power} kW</dd>
                    </div>
                  </dl>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
