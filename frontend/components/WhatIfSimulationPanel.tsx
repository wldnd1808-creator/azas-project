'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TEMP_REF } from '@/lib/simulation';
import type { SimulationResult } from '@/lib/simulation';
import { fetchSimulationPrediction } from '@/lib/simulation-api';

const TEMP_MIN = 300;
const TEMP_MAX = 900;
const SPEED_MIN = 0;
const SPEED_MAX = 100;
const PROCESS_TIME_MIN = 50;
const PROCESS_TIME_MAX = 90;
const TANK_PRESSURE_MIN = 82;
const TANK_PRESSURE_MAX = 117;
const ADDITIVE_RATIO_MIN = 0.14;
const ADDITIVE_RATIO_MAX = 0.18;
const DEFAULT_PROCESS_TIME = 74.3;
const DEFAULT_TANK_PRESSURE = 98;
const DEFAULT_ADDITIVE_RATIO = 0.15;
const DEBOUNCE_MS = 300;

// 품질 등급 판정 기준 (이미지 분석 데이터 반영)
const TEMP_OPTIMAL_MIN = 708;
const TEMP_OPTIMAL_MAX = 788;
const TEMP_RISK_UNDER = 700;
const PROCESS_TIME_OPTIMAL = 74;
const PROCESS_TIME_RISK_UNDER = 58;
const ADDITIVE_NEAR_MIN = 0.14;
const ADDITIVE_NEAR_MAX = 0.16;

type QualityGrade = 'A' | 'B' | 'C';

function getQualityGrade(
  temperature: number,
  processTime: number,
  additiveRatio: number
): { grade: QualityGrade; stars: number; message: string } {
  // Grade C: 공정 시간 58분 미만(불량률 9%+) 또는 소성 온도 700°C 미만
  if (processTime < PROCESS_TIME_RISK_UNDER || temperature < TEMP_RISK_UNDER) {
    const stars = processTime < PROCESS_TIME_RISK_UNDER && temperature < TEMP_RISK_UNDER ? 1 : 2;
    return { grade: 'C', stars, message: '불량 위험 높음' };
  }
  // Grade A: 온도 708~788°C, 공정 시간 74분 이상, 첨가제 0.15 근처
  const tempOk = temperature >= TEMP_OPTIMAL_MIN && temperature <= TEMP_OPTIMAL_MAX;
  const processOk = processTime >= PROCESS_TIME_OPTIMAL;
  const additiveOk = additiveRatio >= ADDITIVE_NEAR_MIN && additiveRatio <= ADDITIVE_NEAR_MAX;
  if (tempOk && processOk && additiveOk) {
    return { grade: 'A', stars: 5, message: 'Golden Batch 진입' };
  }
  // Grade B: 평균 불량률 구간 또는 일부 변수만 최적 이탈
  const optimalCount = [tempOk, processOk, additiveOk].filter(Boolean).length;
  const stars = optimalCount >= 2 ? 4 : 3;
  return { grade: 'B', stars, message: '품질 유의' };
}

function Gauge({
  value,
  min,
  max,
  unit,
  label,
  color = '#22d3ee',
  valueFormat,
  warning = false,
}: {
  value: number;
  min: number;
  max: number;
  unit: string;
  label: string;
  color?: string;
  valueFormat?: (v: number) => string;
  warning?: boolean;
}) {
  const id = useId().replace(/:/g, '');
  const pct = Math.min(1, Math.max(0, (value - min) / (max - min)));
  const displayValue = valueFormat ? valueFormat(value) : String(value);
  const angle = 180 * pct;
  const gaugeColor = warning ? '#f59e0b' : color;
  return (
    <div className={`rounded-xl bg-slate-800/80 border p-4 flex flex-col items-center ${warning ? 'border-amber-500/50' : 'border-cyan-500/30'}`}>
      <span className="text-xs font-medium text-cyan-300/90 uppercase tracking-wider mb-2">{label}</span>
      <div className="relative w-full max-w-[140px] aspect-[2/1]">
        <svg viewBox="0 0 200 110" className="w-full h-full" preserveAspectRatio="xMidYMax meet">
          <defs>
            <linearGradient id={`gaugeBg-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <linearGradient id={`gaugeFill-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0891b2" />
              <stop offset="100%" stopColor={gaugeColor} />
            </linearGradient>
          </defs>
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke={`url(#gaugeBg-${id})`}
            strokeWidth="14"
            strokeLinecap="round"
          />
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke={`url(#gaugeFill-${id})`}
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={`${3.14 * 80 * (angle / 180)} 999`}
            className="transition-all duration-300"
          />
        </svg>
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 -translate-y-2 text-center"
          style={{ textShadow: warning ? '0 0 12px rgba(245,158,11,0.6)' : '0 0 12px rgba(34, 211, 238, 0.6)' }}
        >
          <span className={`text-2xl font-bold font-mono tabular-nums ${warning ? 'text-amber-400' : 'text-cyan-400'}`}>{displayValue}</span>
          <span className={`text-sm font-medium ml-0.5 ${warning ? 'text-amber-400/80' : 'text-cyan-400/80'}`}>{unit}</span>
        </div>
      </div>
    </div>
  );
}

function SkeletonGauge({ label }: { label: string }) {
  return (
    <div className="rounded-xl bg-slate-800/80 border border-cyan-500/30 p-4 flex flex-col items-center">
      <span className="text-xs font-medium text-cyan-300/90 uppercase tracking-wider mb-2">{label}</span>
      <div className="relative w-full max-w-[140px] aspect-[2/1] flex items-center justify-center">
        <div className="w-full h-8 rounded bg-slate-700/80 animate-pulse" />
      </div>
    </div>
  );
}

function PredictionSkeleton() {
  return (
    <>
      <div className="grid grid-cols-1 gap-4">
        <SkeletonGauge label="예상 수율" />
        <SkeletonGauge label="시간당 전력 소모" />
        <SkeletonGauge label="시간당 생산량 (기준대비)" />
      </div>
      <div className="mt-4 rounded-xl bg-slate-800/80 border border-cyan-500/30 p-4">
        <h5 className="text-xs font-semibold text-cyan-300/90 uppercase tracking-wider mb-3">
          Actual vs Simulated
        </h5>
        <div className="h-[220px] w-full flex items-center justify-center">
          <div className="w-full h-[80%] rounded bg-slate-700/80 animate-pulse" />
        </div>
      </div>
    </>
  );
}

export interface WhatIfSimulationPanelProps {
  onSimulationActiveChange?: (active: boolean) => void;
}

export default function WhatIfSimulationPanel({ onSimulationActiveChange }: WhatIfSimulationPanelProps = {}) {
  const [mounted, setMounted] = useState(false);
  const [temperature, setTemperature] = useState(TEMP_REF);
  const [speedPercent, setSpeedPercent] = useState(0);
  const [processTime, setProcessTime] = useState(DEFAULT_PROCESS_TIME);
  const [tankPressure, setTankPressure] = useState(DEFAULT_TANK_PRESSURE);
  const [additiveRatio, setAdditiveRatio] = useState(DEFAULT_ADDITIVE_RATIO);
  const [actual, setActual] = useState<SimulationResult | null>(null);
  const [simulated, setSimulated] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchActual = useCallback(async () => {
    try {
      const result = await fetchSimulationPrediction({
        temperature: TEMP_REF,
        speedPercent: 0,
        processTime: DEFAULT_PROCESS_TIME,
        tankPressure: DEFAULT_TANK_PRESSURE,
        additiveRatio: DEFAULT_ADDITIVE_RATIO,
      });
      setActual(result);
      setSimulated(result);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActual();
  }, [fetchActual]);

  const isBaseline =
    temperature === TEMP_REF &&
    speedPercent === 0 &&
    processTime === DEFAULT_PROCESS_TIME &&
    tankPressure === DEFAULT_TANK_PRESSURE &&
    additiveRatio === DEFAULT_ADDITIVE_RATIO;

  useEffect(() => {
    if (actual === null) return;

    if (isBaseline) {
      setSimulated(actual);
      setLoading(false);
      setError(null);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    setLoading(true);

    debounceRef.current = setTimeout(async () => {
      debounceRef.current = null;
      try {
        const result = await fetchSimulationPrediction({
          temperature,
          speedPercent,
          processTime,
          tankPressure,
          additiveRatio,
        });
        setSimulated(result);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Prediction failed');
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [temperature, speedPercent, processTime, tankPressure, additiveRatio, actual, isBaseline]);

  const chartData = useMemo(() => {
    if (!actual || !simulated) return [];
    return [
      { name: '예상 수율 (%)', actual: actual.yieldPct, simulated: simulated.yieldPct },
      { name: '시간당 전력 (kWh)', actual: actual.powerKwh, simulated: simulated.powerKwh },
      { name: '시간당 생산량 (%)', actual: actual.productionRatePct, simulated: simulated.productionRatePct },
    ];
  }, [actual, simulated]);

  const qualityGrade = useMemo(
    () => getQualityGrade(temperature, processTime, additiveRatio),
    [temperature, processTime, additiveRatio]
  );

  const simulationActive = !isBaseline;
  useEffect(() => {
    onSimulationActiveChange?.(simulationActive);
  }, [simulationActive, onSimulationActiveChange]);

  const showContent = !loading && actual && simulated && !error;

  return (
    <div className="h-full flex flex-col rounded-xl bg-slate-900/95 border border-slate-700/80 shadow-xl shadow-cyan-500/5 overflow-hidden">
      <div className="px-4 py-3 border-b border-cyan-500/30 bg-slate-800/50">
        <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full bg-cyan-400 ${loading ? 'animate-pulse' : ''}`} />
          What-If Simulation
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <section>
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            공정 변수 조절
          </h4>
          <div className="space-y-5">
            <div>
              <div className="flex justify-between text-xs text-cyan-300/90 mb-1.5">
                <span>소성 온도</span>
                <span className="font-mono tabular-nums">{temperature}°C</span>
              </div>
              <input
                type="range"
                min={TEMP_MIN}
                max={TEMP_MAX}
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
                className="w-full h-2 rounded-full appearance-none bg-slate-700 accent-cyan-500 focus:outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-[0_0_0_2px_rgba(34,211,238,0.3)]"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                <span>300°C</span>
                <span>900°C</span>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-cyan-300/90 mb-1.5">
                <span>컨베이어 속도</span>
                <span className="font-mono tabular-nums">{speedPercent}%</span>
              </div>
              <input
                type="range"
                min={SPEED_MIN}
                max={SPEED_MAX}
                value={speedPercent}
                onChange={(e) => setSpeedPercent(Number(e.target.value))}
                className="w-full h-2 rounded-full appearance-none bg-slate-700 accent-cyan-500 focus:outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-[0_0_0_2px_rgba(34,211,238,0.3)]"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                <span>0%</span>
                <span>100%</span>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-cyan-300/90 mb-1.5">
                <span>공정 시간 (process_time)</span>
                <span className="font-mono tabular-nums">{processTime.toFixed(1)}분</span>
              </div>
              <input
                type="range"
                min={PROCESS_TIME_MIN}
                max={PROCESS_TIME_MAX}
                step={0.1}
                value={processTime}
                onChange={(e) => setProcessTime(Number(e.target.value))}
                className="w-full h-2 rounded-full appearance-none bg-slate-700 accent-cyan-500 focus:outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-[0_0_0_2px_rgba(34,211,238,0.3)]"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                <span>50분</span>
                <span>90분</span>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-cyan-300/90 mb-1.5">
                <span>탱크 압력 (tank_pressure)</span>
                <span className="font-mono tabular-nums">{tankPressure.toFixed(1)} kPa</span>
              </div>
              <input
                type="range"
                min={TANK_PRESSURE_MIN}
                max={TANK_PRESSURE_MAX}
                step={0.1}
                value={tankPressure}
                onChange={(e) => setTankPressure(Number(e.target.value))}
                className="w-full h-2 rounded-full appearance-none bg-slate-700 accent-cyan-500 focus:outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-[0_0_0_2px_rgba(34,211,238,0.3)]"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                <span>82 kPa</span>
                <span>117 kPa</span>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-cyan-300/90 mb-1.5">
                <span>첨가제 비율 (additive_ratio)</span>
                <span className="font-mono tabular-nums">{additiveRatio.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={ADDITIVE_RATIO_MIN}
                max={ADDITIVE_RATIO_MAX}
                step={0.01}
                value={additiveRatio}
                onChange={(e) => setAdditiveRatio(Number(e.target.value))}
                className="w-full h-2 rounded-full appearance-none bg-slate-700 accent-cyan-500 focus:outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-[0_0_0_2px_rgba(34,211,238,0.3)]"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                <span>0.14</span>
                <span>0.18</span>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            예측 결과
          </h4>
          {loading && <PredictionSkeleton />}
          {error && (
            <div className="rounded-xl bg-red-900/30 border border-red-500/40 p-4 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* 예상 품질 등급: 슬라이더 값 기준 실시간 표시(로딩과 무관) */}
          <div className="mt-4 rounded-xl bg-slate-800/80 border border-cyan-500/30 p-4">
            <h5 className="text-xs font-semibold text-cyan-300/90 uppercase tracking-wider mb-3">
              예상 품질 등급 (Quality Grade Prediction)
            </h5>
            <div className="flex flex-col items-center gap-3">
              <span
                className={`text-2xl font-bold tracking-wider ${
                  qualityGrade.grade === 'A'
                    ? 'text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.6)]'
                    : qualityGrade.grade === 'B'
                      ? 'text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.5)]'
                      : 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]'
                }`}
              >
                Grade {qualityGrade.grade}
              </span>
              <div className="flex gap-0.5" aria-label={`${qualityGrade.stars}점 만점`}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <span
                    key={i}
                    className={
                      i <= qualityGrade.stars
                        ? qualityGrade.grade === 'A'
                          ? 'text-green-400'
                          : qualityGrade.grade === 'B'
                            ? 'text-orange-400'
                            : 'text-red-500'
                        : 'text-slate-600'
                    }
                  >
                    ★
                  </span>
                ))}
              </div>
              <p
                className={`text-sm font-medium ${
                  qualityGrade.grade === 'A'
                    ? 'text-green-400/90'
                    : qualityGrade.grade === 'B'
                      ? 'text-orange-400/90'
                      : 'text-red-500/90'
                }`}
              >
                {qualityGrade.message}
              </p>
            </div>
          </div>

          {showContent && (
            <>
              <div className="grid grid-cols-1 gap-4 mt-4">
                <Gauge
                  value={simulated.yieldPct}
                  min={0}
                  max={100}
                  unit="%"
                  label="예상 수율"
                  color="#22d3ee"
                  valueFormat={(v) => v.toFixed(1)}
                  warning={simulated.yieldWarning}
                />
                <Gauge
                  value={simulated.powerKwh}
                  min={500}
                  max={1700}
                  unit="kWh"
                  label="시간당 전력 소모"
                  color="#38bdf8"
                />
                <Gauge
                  value={simulated.productionRatePct}
                  min={100}
                  max={300}
                  unit="%"
                  label="시간당 생산량 (기준대비)"
                  color="#34d399"
                  valueFormat={(v) => v.toFixed(0)}
                />
              </div>

              <div className="mt-4 rounded-xl bg-slate-800/80 border border-cyan-500/30 p-4">
                <h5 className="text-xs font-semibold text-cyan-300/90 uppercase tracking-wider mb-3">
                  Actual vs Simulated
                </h5>
                <div className="h-[220px] w-full">
                  {mounted ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
                      barGap={4}
                      barCategoryGap="20%"
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: '#94a3b8', fontSize: 10 }}
                        tickLine={{ stroke: '#475569' }}
                        axisLine={{ stroke: '#475569' }}
                      />
                      <YAxis
                        tick={{ fill: '#94a3b8', fontSize: 10 }}
                        tickLine={{ stroke: '#475569' }}
                        axisLine={{ stroke: '#475569' }}
                        tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : String(v))}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1e293b',
                          border: '1px solid rgba(34, 211, 238, 0.3)',
                          borderRadius: '8px',
                        }}
                        labelStyle={{ color: '#e2e8f0' }}
                        formatter={(value: number) => [value.toLocaleString(), '']}
                        labelFormatter={(label) => label}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: 11 }}
                        formatter={(value) => (
                          <span className="text-slate-300">
                            {value === 'actual' ? 'Actual (현재)' : 'Simulated (시뮬레이션)'}
                          </span>
                        )}
                      />
                      <Bar dataKey="actual" name="actual" fill="#64748b" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="simulated" name="simulated" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-slate-500 text-sm">차트 로딩 중...</div>
                  )}
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
