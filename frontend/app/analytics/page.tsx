'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import RightSidebar from '@/components/RightSidebar';
import Card from '@/components/Card';
import WhatIfSimulationPanel from '@/components/WhatIfSimulationPanel';
import { useLanguage } from '@/contexts/LanguageContext';

const HUMIDITY_THRESHOLD = 72;

type Sensor = { id: string; name: string; humidity: number; temperature: number };

const initialSensors: Sensor[] = [
  { id: 'A1', name: 'Zone A-1', humidity: 68, temperature: 23.2 },
  { id: 'A2', name: 'Zone A-2', humidity: 75, temperature: 24.1 },
  { id: 'B1', name: 'Zone B-1', humidity: 71, temperature: 24.8 },
  { id: 'B2', name: 'Zone B-2', humidity: 73, temperature: 25.0 },
];

// 차트용 초기 습도 이력 (마지막 값이 현재 습도)
const buildInitialChartData = (current: number) =>
  [70, 71, 72, 73, 74, 74, 75, 75, 75, current];

export default function AnalyticsPage() {
  const { language } = useLanguage();
  const [showHumidityPopup, setShowHumidityPopup] = useState(false);
  const [humidityChecked, setHumidityChecked] = useState(false);
  const [currentHumidity, setCurrentHumidity] = useState(75);
  const [sensors, setSensors] = useState<Sensor[]>(() =>
    initialSensors.map((s) => ({ ...s }))
  );
  const [chartData, setChartData] = useState<number[]>(() =>
    buildInitialChartData(75)
  );
  const [isSimulating, setIsSimulating] = useState(false);
  const [approvalSent, setApprovalSent] = useState(false);
  const [simulationActive, setSimulationActive] = useState(false);

  const sensorsOverThreshold = sensors.filter(
    (s) => s.humidity >= HUMIDITY_THRESHOLD
  );
  const isOverThreshold =
    currentHumidity >= HUMIDITY_THRESHOLD || sensorsOverThreshold.length > 0;

  // 습도가 72% 이상일 때 팝업 표시 (한 번만)
  useEffect(() => {
    if (humidityChecked) return;
    if (currentHumidity >= HUMIDITY_THRESHOLD || sensorsOverThreshold.length > 0) {
      setShowHumidityPopup(true);
    }
    setHumidityChecked(true);
  }, [humidityChecked, currentHumidity, sensorsOverThreshold.length]);

  const handleCloseHumidityPopup = () => {
    setShowHumidityPopup(false);
  };

  // 설비 제어 승인: 텔레그램 알림 + 습도 72% 아래로 떨어지는 시뮬레이션
  const handleEquipmentApprove = useCallback(async () => {
    if (approvalSent || isSimulating) return;
    setApprovalSent(true);
    setIsSimulating(true);

    const startHumidity = currentHumidity;
    const targetHumidity = 65;
    const message =
      language === 'ko'
        ? `🔔 [분석 페이지] 설비 제어 승인됨\n\n습도: ${startHumidity}% → ${targetHumidity}%(목표) 제습/환기 조치 진행\n시각: ${new Date().toLocaleString('ko-KR')}`
        : `🔔 [Analytics] Equipment control approved\n\nHumidity: ${startHumidity}% → ${targetHumidity}% (target). Dehumidification in progress.\nTime: ${new Date().toISOString()}`;

    try {
      await fetch('/api/telegram-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
    } catch (_) {}

    setShowHumidityPopup(false);

    // 습도 값이 72% 아래로 떨어지는 시뮬레이션 (차트 + 현재값 + 센서)
    const steps = 10;
    const stepMs = 150;

    for (let i = 1; i <= steps; i++) {
      await new Promise((r) => setTimeout(r, stepMs));
      const t = i / steps;
      const nextHumidity = Math.round(
        startHumidity - (startHumidity - targetHumidity) * t
      );
      const clamped = Math.min(nextHumidity, targetHumidity);

      setCurrentHumidity(clamped);
      setChartData((prev) => [...prev.slice(-9), clamped]);

      setSensors((prev) =>
        prev.map((s) => ({
          ...s,
          humidity:
            s.humidity >= HUMIDITY_THRESHOLD
              ? Math.min(s.humidity, Math.round(s.humidity - (s.humidity - targetHumidity) * t))
              : s.humidity,
        }))
      );
    }

    setCurrentHumidity(targetHumidity);
    setSensors((prev) =>
      prev.map((s) => ({
        ...s,
        humidity: s.humidity >= HUMIDITY_THRESHOLD ? targetHumidity : s.humidity,
      }))
    );
    setChartData((prev) => [...prev.slice(-9), targetHumidity]);
    setIsSimulating(false);
  }, [
    currentHumidity,
    language,
    approvalSent,
    isSimulating,
  ]);

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

      {/* 습도 72% 이상 경고 팝업 */}
      {showHumidityPopup && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="humidity-popup-title"
        >
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-amber-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <span className="text-amber-600 text-xl">⚠</span>
              </div>
              <h2
                id="humidity-popup-title"
                className="text-lg font-bold text-slate-900"
              >
                {language === 'ko' ? '습도 경고' : 'Humidity Alert'}
              </h2>
            </div>
            <p className="text-slate-600 mb-4">
              {language === 'ko'
                ? `현재 습도가 ${HUMIDITY_THRESHOLD}% 이상입니다. (현재: ${currentHumidity}%) 공정 품질에 영향을 줄 수 있으니 환기 또는 제습을 권장합니다.`
                : `Current humidity is at or above ${HUMIDITY_THRESHOLD}%. (Current: ${currentHumidity}%) Ventilation or dehumidification is recommended.`}
            </p>
            {sensorsOverThreshold.length > 0 && (
              <p className="text-sm text-slate-500 mb-4">
                {language === 'ko' ? '기준 초과 구역: ' : 'Zones over threshold: '}
                {sensorsOverThreshold.map((s) => s.name).join(', ')}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCloseHumidityPopup}
                className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg font-medium hover:bg-slate-300"
              >
                {language === 'ko' ? '확인' : 'OK'}
              </button>
              <button
                type="button"
                onClick={handleEquipmentApprove}
                disabled={isSimulating}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50"
              >
                {language === 'ko' ? '설비 제어 승인' : 'Approve equipment control'}
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="ml-64 mr-80 mt-16 bg-slate-100 min-h-[calc(100vh-4rem)] p-6">
        <div className="max-w-full mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">
              {language === 'ko' ? '분석' : 'Analytics'}
            </h2>
            <p className="text-slate-600 mt-1">
              {language === 'ko'
                ? '환경·센서 데이터 분석 및 모니터링'
                : 'Environment and sensor data analysis'}
            </p>
          </div>

          {/* What-If 시뮬레이션: 상단 고정 노출 (항상 보이도록) */}
          <section className="mb-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">
              {language === 'ko' ? 'What-If 시뮬레이션' : 'What-If Simulation'}
            </h3>
            <div className="w-full max-w-[360px]">
              <WhatIfSimulationPanel onSimulationActiveChange={setSimulationActive} />
            </div>
          </section>

          <div className="grid grid-cols-1 gap-6">
            <div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card title={language === 'ko' ? '현재 습도' : 'Current Humidity'}>
              <div className="space-y-2">
                <div
                  className={`text-3xl font-bold ${
                    isOverThreshold ? 'text-amber-600' : 'text-slate-900'
                  }`}
                >
                  {currentHumidity}%
                </div>
                <div className="text-sm text-slate-600">
                  {language === 'ko' ? '권장 기준: 72% 미만' : 'Recommended: below 72%'}
                </div>
                {isOverThreshold && (
                  <div className="text-xs text-amber-700 font-medium">
                    {language === 'ko' ? '기준 초과' : 'Above threshold'}
                  </div>
                )}
                {isSimulating && (
                  <div className="text-xs text-emerald-600 font-medium">
                    {language === 'ko' ? '제습 시뮬레이션 중…' : 'Simulating…'}
                  </div>
                )}
              </div>
            </Card>
            <Card title={language === 'ko' ? '현재 온도' : 'Current Temperature'}>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-slate-900">24.5°C</div>
                <div className="text-sm text-slate-600">
                  {language === 'ko' ? '공정 실내' : 'Process room'}
                </div>
              </div>
            </Card>
            <Card title={language === 'ko' ? '습도 기준 초과 구역' : 'Zones Over Humidity Limit'}>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-slate-900">
                  {sensorsOverThreshold.length}
                </div>
                <div className="text-sm text-slate-600">
                  {language === 'ko' ? '구역 (72% 이상)' : 'zones (≥72%)'}
                </div>
              </div>
            </Card>
          </div>

          {/* 습도 추이 차트 (72% 아래로 떨어지는 시뮬레이션 반영) */}
          <Card
            title={language === 'ko' ? '습도 추이' : 'Humidity trend'}
            className="mb-6"
          >
            <div className="h-48 p-4 flex items-end justify-between gap-1">
              {chartData.map((value, index) => (
                <div
                  key={index}
                  className="flex-1 flex flex-col items-center min-w-0"
                >
                  <div
                    className={`w-full rounded-t transition-all duration-150 ${
                      value >= HUMIDITY_THRESHOLD
                        ? 'bg-amber-500'
                        : 'bg-slate-400'
                    }`}
                    style={{
                      height: `${Math.min(100, (value / 100) * 100)}%`,
                      minHeight: '4px',
                    }}
                  />
                  <span className="text-[10px] text-slate-500 mt-1 truncate w-full text-center">
                    {value}%
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 px-4 pb-2">
              {language === 'ko'
                ? '최근 습도 값 (설비 제어 승인 시 72% 이하로 시뮬레이션)'
                : 'Recent humidity (simulation drops below 72% on approval)'}
            </p>
          </Card>

          <Card title={language === 'ko' ? '구역별 센서 현황' : 'Sensor Status by Zone'}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-600 text-left">
                    <th className="py-3 px-4">{language === 'ko' ? '구역' : 'Zone'}</th>
                    <th className="py-3 px-4">{language === 'ko' ? '습도(%)' : 'Humidity(%)'}</th>
                    <th className="py-3 px-4">{language === 'ko' ? '온도(°C)' : 'Temp(°C)'}</th>
                    <th className="py-3 px-4">{language === 'ko' ? '상태' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody>
                  {sensors.map((sensor) => (
                    <tr key={sensor.id} className="border-b border-slate-100">
                      <td className="py-3 px-4 font-medium text-slate-900">{sensor.name}</td>
                      <td className="py-3 px-4">{sensor.humidity}%</td>
                      <td className="py-3 px-4">{sensor.temperature}°C</td>
                      <td className="py-3 px-4">
                        <span
                          className={
                            sensor.humidity >= HUMIDITY_THRESHOLD
                              ? 'text-amber-700 font-medium'
                              : 'text-slate-600'
                          }
                        >
                          {sensor.humidity >= HUMIDITY_THRESHOLD
                            ? language === 'ko'
                              ? '기준 초과'
                              : 'Over limit'
                            : language === 'ko'
                              ? '정상'
                              : 'Normal'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
