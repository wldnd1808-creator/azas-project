'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import Card from '@/components/Card';
import { useLanguage } from '@/contexts/LanguageContext';
import { authHeader, dashboardApiUrl } from '@/lib/api-client';

type HistoryItem = {
  time: string;
  raw_data?: Record<string, number | string> | string;
  simulation_results?: Record<string, number | string> | string;
  [key: string]: string | number | Record<string, number | string> | undefined;
};
type SensorInfo = { name: string; nameKorean: string; unit: string };

type MetricOption = 'humidity' | 'tank_pressure' | 'temperature';

const CHART_PAD = { left: 56, right: 56, top: 24, bottom: 40 };
const CHART_VIEW = { width: 800, height: 360 };

/** 점 배열을 스무스 곡선 SVG path d 문자열로 변환 (Catmull-Rom 느낌의 부드러운 곡선) */
function smoothPathD(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  const tension = 0.35;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) * tension / 3;
    const cp1y = p1.y + (p2.y - p0.y) * tension / 3;
    const cp2x = p2.x - (p3.x - p1.x) * tension / 3;
    const cp2y = p2.y - (p3.y - p1.y) * tension / 3;
    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)} ${cp2x.toFixed(2)} ${cp2y.toFixed(2)} ${p2.x} ${p2.y}`;
  }
  return d;
}

export default function SensorChartPage() {
  const { language } = useLanguage();
  const svgRef = useRef<SVGSVGElement>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [sensors, setSensors] = useState<SensorInfo[]>([]);
  const [rawDataForIqr, setRawDataForIqr] = useState<Record<string, number[]> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<MetricOption>('humidity');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [calendarMonth, setCalendarMonth] = useState<{ year: number; month: number }>(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  });
  const [hover, setHover] = useState<{
    index: number;
    x: number;
    y: number;
    value: number;
    time: string;
    mouseX: number;
  } | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(dashboardApiUrl(`/api/dashboard/realtime?history=true&period=day&date=${selectedDate}&iqr=all`), { headers: authHeader() })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.success) {
          setHistory(json.history ?? []);
          setRawDataForIqr(json.rawDataForIqr ?? null);
          const sensorList = (json.sensors ?? []).map((s: { name: string; nameKorean: string; unit: string }) => ({
            name: s.name,
            nameKorean: s.nameKorean,
            unit: s.unit,
          }));
          setSensors(sensorList);
        } else {
          setHistory([]);
          setRawDataForIqr(null);
          setSensors([]);
          setError(json?.error || 'Failed to load');
        }
      })
      .catch((err) => {
        setError(String(err?.message || err));
        setHistory([]);
        setRawDataForIqr(null);
        setSensors([]);
      })
      .finally(() => setLoading(false));
  }, [selectedDate]);

  useEffect(() => {
    const [y, m] = selectedDate.split('-').map(Number);
    setCalendarMonth({ year: y, month: m });
  }, [selectedDate]);

  const humidityCol = sensors.find((s) => /humidity/i.test(s.name));
  const tankPressureCol = sensors.find((s) => /tank_pressure|tank.?pressure/i.test(s.name));
  const temperatureCol = sensors.find((s) => /temperature|temp/i.test(s.name));

  const activeCol =
    selectedMetric === 'humidity'
      ? humidityCol
      : selectedMetric === 'tank_pressure'
        ? tankPressureCol
        : temperatureCol;

  // history 행에서 키 찾기 (DB 컬럼명 대소문자 차이 대비)
  const getRowVal = (h: HistoryItem, key: string): number => {
    const v = h[key];
    if (v !== undefined && v !== null && typeof v !== 'object') return Number(v);
    const lower = key.toLowerCase();
    const found = Object.keys(h).find((k) => k.toLowerCase() === lower && typeof h[k] !== 'object');
    return found != null ? Number(h[found]) : NaN;
  };

  // 객체(obj)에서 메트릭 값 꺼내기. raw_data.humidity / simulation_results.humidity 형태 (키 대소문자 무시)
  const getMetricFromObj = (obj: Record<string, unknown> | undefined, metricName: string): number => {
    if (!obj || typeof obj !== 'object') return NaN;
    const v = obj[metricName];
    if (v !== undefined && v !== null) return Number(v);
    const lower = metricName.toLowerCase();
    const found = Object.keys(obj).find((k) => k.toLowerCase() === lower);
    return found != null ? Number(obj[found]) : NaN;
  };

  // API가 JSON 문자열로 넘긴 경우 파싱
  const ensureObj = (h: HistoryItem, key: 'raw_data' | 'simulation_results'): Record<string, unknown> | undefined => {
    const raw = h[key];
    if (raw == null) return undefined;
    if (typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, unknown>;
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        return parsed && typeof parsed === 'object' ? parsed : undefined;
      } catch {
        return undefined;
      }
    }
    return undefined;
  };

  const baseKey = activeCol ? activeCol.name : '';
  // 파란선 = simulation_results의 해당 메트릭
  const rawSimulation = history.length > 0 && activeCol
    ? history.map((h) => {
        const obj = ensureObj(h, 'simulation_results');
        const fromObj = getMetricFromObj(obj, baseKey);
        if (!Number.isNaN(fromObj)) return fromObj;
        return Number(getRowVal(h, baseKey) || 0);
      })
    : [];
  // simulation_results와 다른 raw_data 값만 빨간점으로 표시
  const rawDataValues = history.length > 0 && activeCol
    ? history.map((h) => {
        const obj = ensureObj(h, 'raw_data');
        const fromObj = getMetricFromObj(obj, baseKey);
        if (!Number.isNaN(fromObj)) return fromObj;
        return Number(getRowVal(h, baseKey) || 0);
      })
    : [];

  // 결측/특수값(-999 등)은 클램프하지 않고 그대로 표시
  const isSentinelValue = (v: number) => !Number.isFinite(v) || v <= -100 || v === -999 || v === -9999;
  const clampHumidity = (v: number) => {
    if (!(activeCol && selectedMetric === 'humidity')) return v;
    if (isSentinelValue(v)) return v;
    return Math.max(0, Math.min(100, v));
  };
  const simulationResults = rawSimulation.map(clampHumidity);
  const rawData = rawDataValues.map(clampHumidity);

  // 차트 기본 표시: simulation_results
  const values = simulationResults;

  const times = history.map((h) => h.time);

  // IQR 상·하한: raw_data 전체로 계산 (API rawDataForIqr), 없으면 당일 rawData
  const { lowerBoundIQR, upperBoundIQR } = (() => {
    const baseKeyForIqr = activeCol?.name ?? '';
    const rawForIqr =
      baseKeyForIqr && rawDataForIqr?.[baseKeyForIqr]?.length >= 4
        ? rawDataForIqr[baseKeyForIqr]
        : rawData;
    const clamped = rawForIqr.map((v) => (activeCol && selectedMetric === 'humidity' ? Math.max(0, Math.min(100, v)) : v));
    if (clamped.length < 4) return { lowerBoundIQR: null as number | null, upperBoundIQR: null as number | null };
    const sorted = [...clamped].filter(Number.isFinite).sort((a, b) => a - b);
    const n = sorted.length;
    if (n < 4) return { lowerBoundIQR: null, upperBoundIQR: null };
    const q1Idx = (n - 1) * 0.25;
    const q3Idx = (n - 1) * 0.75;
    const Q1 = sorted[Math.floor(q1Idx)] ?? 0;
    const Q3 = sorted[Math.floor(q3Idx)] ?? 0;
    const IQR = Q3 - Q1 || 1e-9;
    const lower = Q1 - 3 * IQR;
    return {
      lowerBoundIQR: lower < 0 ? 0 : lower,
      upperBoundIQR: Q3 + 3 * IQR,
    };
  })();

  // raw_data와 simulation_results가 다른 인덱스 → 빨간점(이상치). simulation_results와 다른 raw_data 값 표시
  const DIFF_EPS = 1e-9;
  const diffIndices = new Set<number>(
    simulationResults
      .map((sim, i) => {
        const rawVal = Number(rawData[i]);
        const simVal = Number(sim);
        if (Number.isNaN(rawVal) && Number.isNaN(simVal)) return -1;
        return Math.abs(rawVal - simVal) > DIFF_EPS ? i : -1;
      })
      .filter((i) => i >= 0)
  );

  // FDC 이상감지(anomaly_depth === -1)도 이상치로 사용. 키는 getRowVal로 대소문자 무시
  const anomalyIndices = new Set(
    history
      .map((h, i) => {
        const v = getRowVal(h, 'anomaly_depth');
        return v === -1 || v === -1.0 ? i : -1;
      })
      .filter((i) => i >= 0)
  );

  // 이상치 = (simulation_results≠raw_data) ∪ (FDC 이상감지)
  const outlierIndices = new Set<number>([...diffIndices, ...anomalyIndices]);
  // 결측/특수값(-999 등) 인덱스 → 그래프선은 이 구간 끊고, 빨간 점으로 표시
  const sentinelIndices = new Set<number>(
    values.map((v, i) => (isSentinelValue(v) ? i : -1)).filter((i) => i >= 0)
  );
  // IQR 구간 이탈 = 하한선 미만 또는 상한선 초과 (상·하한선 기준)
  const outOfBoundsIndices = new Set<number>(
    lowerBoundIQR != null && upperBoundIQR != null
      ? values
          .map((v, i) => (v < lowerBoundIQR! || v > upperBoundIQR! ? i : -1))
          .filter((i) => i >= 0)
      : []
  );
  // 빨간 점 = 이상치 ∪ 결측/특수값 ∪ IQR 구간 이탈
  const redDotIndices = new Set<number>([...outlierIndices, ...sentinelIndices, ...outOfBoundsIndices]);
  // 이상치일 때 표시할 값: diff면 raw_data 값, 아니면 해당 시점 실제값
  const getOutlierValue = (i: number) => (diffIndices.has(i) ? rawData[i] : values[i]);
  // 빨간 점 표시용 값 (이상치면 getOutlierValue, 나머지는 values[i])
  const getRedDotValue = (i: number) => (outlierIndices.has(i) ? getOutlierValue(i) : values[i]);

  const chartW = CHART_VIEW.width - CHART_PAD.left - CHART_PAD.right;
  const chartH = CHART_VIEW.height - CHART_PAD.top - CHART_PAD.bottom;
  // 배율 계산 시 이상치(-999 등) 제외 → 그래프 스케일은 정상값만 사용
  const allValues = [
    ...values.filter((v, i) => !redDotIndices.has(i)),
    ...(lowerBoundIQR != null ? [lowerBoundIQR] : []),
    ...(upperBoundIQR != null ? [upperBoundIQR] : []),
  ].filter((v) => Number.isFinite(v));
  const dataMax = allValues.length ? Math.max(...allValues) : 0;
  const dataMin = allValues.length ? Math.min(...allValues) : 0;
  const dataRange = dataMax - dataMin || 1;
  const yPadding = Math.max(dataRange * 0.45, dataRange * 0.2 + 0.5, 0.5);
  let displayMin = dataMin - yPadding;
  let displayMax = dataMax + yPadding;
  if (selectedMetric === 'humidity') {
    displayMin = Math.max(0, displayMin);
    displayMax = Math.min(100, displayMax);
    if (displayMax - displayMin < 10) displayMax = Math.min(100, displayMin + 10);
  }
  const displayRange = displayMax - displayMin;

  const yTicks = (() => {
    const count = 6;
    const ticks: number[] = [];
    for (let i = 0; i <= count; i++) {
      ticks.push(displayMin + (displayRange * i) / count);
    }
    return ticks;
  })();

  const xTickIndices = (() => {
    const count = 6;
    if (values.length <= 1) return [];
    const indices: number[] = [];
    for (let i = 0; i <= count; i++) {
      indices.push(Math.round((i / count) * (values.length - 1)));
    }
    return indices;
  })();

  const valueToY = useCallback(
    (v: number) => CHART_PAD.top + chartH - ((v - displayMin) / displayRange) * chartH,
    [displayMin, displayRange, chartH]
  );
  const indexToX = useCallback(
    (i: number) =>
      values.length <= 1
        ? CHART_PAD.left + chartW / 2
        : CHART_PAD.left + (i / Math.max(1, values.length - 1)) * chartW,
    [values.length, chartW]
  );

  const handleChartMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!svgRef.current || values.length === 0) return;
      const rect = svgRef.current.getBoundingClientRect();
      const svgX = ((e.clientX - rect.left) / rect.width) * CHART_VIEW.width;
      const svgY = ((e.clientY - rect.top) / rect.height) * CHART_VIEW.height;

      const inChart =
        svgX >= CHART_PAD.left &&
        svgX <= CHART_PAD.left + chartW &&
        svgY >= CHART_PAD.top &&
        svgY <= CHART_PAD.top + chartH;
      if (!inChart) {
        setHover(null);
        return;
      }

      const relX = svgX - CHART_PAD.left;
      const idx =
        values.length <= 1
          ? 0
          : Math.round((relX / chartW) * (values.length - 1));
      const clampedIdx = Math.max(0, Math.min(idx, values.length - 1));
      const v = values[clampedIdx];
      const x = indexToX(clampedIdx);
      const y = valueToY(v);
      const mouseX = Math.max(CHART_PAD.left, Math.min(CHART_PAD.left + chartW, svgX));

      setHover({
        index: clampedIdx,
        x,
        y,
        value: v,
        time: times[clampedIdx] ?? '',
        mouseX,
      });
    },
    [values, times, indexToX, valueToY, chartW, chartH]
  );

  const handleChartMouseLeave = useCallback(() => setHover(null), []);

  const formatTimeOnly = (timeStr: string) => {
    try {
      const d = new Date(timeStr);
      return d.toLocaleTimeString(language === 'ko' ? 'ko-KR' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    } catch {
      return '-';
    }
  };

  const calendarDays = (() => {
    const { year, month } = calendarMonth;
    const first = new Date(year, month - 1, 1);
    const last = new Date(year, month, 0);
    const startPad = first.getDay();
    const daysInMonth = last.getDate();
    const total = startPad + daysInMonth;
    const rows = Math.ceil(total / 7);
    const cells: (number | null)[] = [];
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    const remainder = rows * 7 - cells.length;
    for (let i = 0; i < remainder; i++) cells.push(null);
    return cells;
  })();

  const titleKo = '습도·탱크 압력·온도 추이';
  const titleEn = 'Humidity, Tank Pressure & Temperature Trend';
  const subtitleKo = 'raw_data와 simulation_results를 비교하여, simulation_results와 다른 raw_data 값을 표시합니다.';
  const subtitleEn = 'Compare raw_data with simulation_results and show raw_data values that differ from simulation_results.';

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <Navbar />

      <main className="ml-64 mr-80 mt-16 bg-slate-100 min-h-[calc(100vh-4rem)] p-6">
        <div className="max-w-full mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">
              {language === 'ko' ? titleKo : titleEn}
            </h2>
            <p className="text-slate-600 mt-1">
              {language === 'ko' ? subtitleKo : subtitleEn}
            </p>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-500">
              {language === 'ko' ? '로딩 중...' : 'Loading...'}
            </div>
          ) : error ? (
            <div className="py-6 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
              {error}
            </div>
          ) : (
            <Card
              title={
                activeCol
                  ? `${activeCol.nameKorean} (${language === 'ko' ? '시간' : 'Time'})`
                  : language === 'ko'
                    ? '데이터 없음'
                    : 'No Data'
              }
            >
              <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedMetric('humidity')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    selectedMetric === 'humidity'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {humidityCol ? humidityCol.nameKorean : '습도'} ({humidityCol ? humidityCol.unit : '%'})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMetric('tank_pressure')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    selectedMetric === 'tank_pressure'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {tankPressureCol ? tankPressureCol.nameKorean : '탱크 압력'} ({tankPressureCol ? tankPressureCol.unit : 'kPa'})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMetric('temperature')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    selectedMetric === 'temperature'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {temperatureCol ? temperatureCol.nameKorean : (language === 'ko' ? '온도' : 'Temperature')} ({temperatureCol ? temperatureCol.unit : '°C'})
                </button>
                </div>

                {/* 작은 캘린더 - 오른쪽 상단 */}
                <div className="shrink-0 rounded border border-slate-200 bg-white p-2 shadow-sm text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <button
                      type="button"
                      onClick={() =>
                        setCalendarMonth((m) =>
                          m.month === 1 ? { year: m.year - 1, month: 12 } : { year: m.year, month: m.month - 1 }
                        )
                      }
                      className="p-0.5 rounded hover:bg-slate-100 text-slate-500 text-[10px]"
                    >
                      ◀
                    </button>
                    <span className="font-medium text-slate-700 text-[11px]">
                      {calendarMonth.year}/{calendarMonth.month}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setCalendarMonth((m) =>
                          m.month === 12 ? { year: m.year + 1, month: 1 } : { year: m.year, month: m.month + 1 }
                        )
                      }
                      className="p-0.5 rounded hover:bg-slate-100 text-slate-500 text-[10px]"
                    >
                      ▶
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-px text-center">
                    {(language === 'ko' ? ['일','월','화','수','목','금','토'] : ['S','M','T','W','T','F','S']).map((d) => (
                      <div key={d} className="py-0.5 font-medium text-slate-400 text-[9px]">
                        {d}
                      </div>
                    ))}
                    {calendarDays.map((day, i) => {
                      const dateStr =
                        day != null
                          ? `${calendarMonth.year}-${String(calendarMonth.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                          : '';
                      const isSelected = dateStr === selectedDate;
                      const isToday =
                        day != null &&
                        new Date().getFullYear() === calendarMonth.year &&
                        new Date().getMonth() + 1 === calendarMonth.month &&
                        new Date().getDate() === day;
                      return (
                        <button
                          key={i}
                          type="button"
                          disabled={day == null}
                          onClick={() => day != null && setSelectedDate(dateStr)}
                          className={`min-w-[18px] py-0.5 rounded text-[10px] transition-colors leading-tight ${
                            day == null
                              ? 'invisible'
                              : isSelected
                                ? 'bg-blue-600 text-white font-medium'
                                : isToday
                                  ? 'border border-blue-400 text-blue-600 hover:bg-blue-50'
                                  : 'hover:bg-slate-100 text-slate-600'
                          }`}
                        >
                          {day ?? ''}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex gap-6 flex-col lg:flex-row">
                <div className="flex-1 min-w-0">
              {values.length > 0 ? (
                <>
                  <div className="h-96 w-full relative bg-white">
                    <svg
                      ref={svgRef}
                      className="w-full h-full"
                      viewBox={`0 0 ${CHART_VIEW.width} ${CHART_VIEW.height}`}
                      preserveAspectRatio="xMidYMid meet"
                      onMouseMove={handleChartMouseMove}
                      onMouseLeave={handleChartMouseLeave}
                      style={{ cursor: 'crosshair' }}
                    >
                      <defs>
                        <linearGradient id="sensorLineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.12" />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                        </linearGradient>
                      </defs>

                      {/* Y축 그리드선 (아주 얇고 연하게) */}
                      {yTicks.map((tickVal, i) => {
                        const y = valueToY(tickVal);
                        return (
                          <line
                            key={`yg-${i}`}
                            x1={CHART_PAD.left}
                            y1={y}
                            x2={CHART_PAD.left + chartW}
                            y2={y}
                            stroke="#e5e7eb"
                            strokeWidth="0.5"
                          />
                        );
                      })}
                      {/* X축 그리드선 */}
                      {xTickIndices.map((idx) => {
                        const x = indexToX(idx);
                        return (
                          <line
                            key={`xg-${idx}`}
                            x1={x}
                            y1={CHART_PAD.top}
                            x2={x}
                            y2={CHART_PAD.top + chartH}
                            stroke="#e5e7eb"
                            strokeWidth="0.5"
                          />
                        );
                      })}
                      {/* Y축 눈금 (왼쪽) */}
                      {yTicks.map((tickVal, i) => {
                        const y = valueToY(tickVal);
                        return (
                          <text
                            key={`yt-l-${i}`}
                            x={CHART_PAD.left - 6}
                            y={y + 3}
                            fontSize="9"
                            fill="#6b7280"
                            textAnchor="end"
                          >
                            {tickVal.toFixed(1)}{activeCol?.unit ?? ''}
                          </text>
                        );
                      })}
                      {/* Y축 눈금 (오른쪽) */}
                      {yTicks.map((tickVal, i) => {
                        const y = valueToY(tickVal);
                        return (
                          <text
                            key={`yt-r-${i}`}
                            x={CHART_PAD.left + chartW + 6}
                            y={y + 3}
                            fontSize="9"
                            fill="#6b7280"
                            textAnchor="start"
                          >
                            {tickVal.toFixed(1)}{activeCol?.unit ?? ''}
                          </text>
                        );
                      })}
                      {/* X축 눈금 */}
                      {xTickIndices.map((idx) => {
                        const x = indexToX(idx);
                        const t = times[idx];
                        return (
                          <text
                            key={`xt-${idx}`}
                            x={x}
                            y={CHART_PAD.top + chartH + 20}
                            fontSize="10"
                            fill="#6b7280"
                            textAnchor="middle"
                          >
                            {t ? formatTimeOnly(t) : '-'}
                          </text>
                        );
                      })}

                      {/* 차트 영역 배경 (호버 감지) */}
                      <rect
                        x={CHART_PAD.left}
                        y={CHART_PAD.top}
                        width={chartW}
                        height={chartH}
                        fill="transparent"
                        pointerEvents="all"
                      />

                      {/* 라인 차트: simulation_results (이상치 구간은 선만 0으로 대체, 점은 빨간 점으로 따로 표시) */}
                      {(() => {
                        const valuesForLine = values.map((v, i) =>
                          redDotIndices.has(i) ? 0 : v
                        );
                        const pts = valuesForLine.map((v, i) => ({
                          x: indexToX(i),
                          y: valueToY(v),
                        }));
                        const smoothD = smoothPathD(pts);
                        const bottom = CHART_PAD.top + chartH;
                        const areaD =
                          pts.length > 0
                            ? `${smoothD} L ${pts[pts.length - 1].x} ${bottom} L ${pts[0].x} ${bottom} Z`
                            : '';
                        return (
                          <>
                            <path d={areaD} fill="url(#sensorLineGradient)" stroke="none" />
                            <path
                              d={smoothD}
                              fill="none"
                              stroke="#2563eb"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </>
                        );
                      })()}
                      {/* IQR 상·하한선 (raw_data 기준: Q1-3IQR, Q3+3IQR) */}
                      {lowerBoundIQR != null && (
                        <line
                          x1={CHART_PAD.left}
                          y1={valueToY(lowerBoundIQR)}
                          x2={CHART_PAD.left + chartW}
                          y2={valueToY(lowerBoundIQR)}
                          stroke="#059669"
                          strokeWidth="1"
                          strokeDasharray="6,4"
                          strokeLinecap="round"
                        />
                      )}
                      {upperBoundIQR != null && (
                        <line
                          x1={CHART_PAD.left}
                          y1={valueToY(upperBoundIQR)}
                          x2={CHART_PAD.left + chartW}
                          y2={valueToY(upperBoundIQR)}
                          stroke="#dc2626"
                          strokeWidth="1"
                          strokeDasharray="6,4"
                          strokeLinecap="round"
                        />
                      )}
                      {/* 이상치 + IQR 구간 이탈 빨간 점 (배율 제외, 차트 영역 안에만 표시) */}
                      {Array.from(redDotIndices).map((i) => {
                        const rawY = valueToY(getRedDotValue(i));
                        const cy = Math.max(CHART_PAD.top, Math.min(CHART_PAD.top + chartH, rawY));
                        return (
                          <circle
                            key={`reddot-${i}`}
                            cx={indexToX(i)}
                            cy={cy}
                            r="4"
                            fill="#dc2626"
                            stroke="#fff"
                            strokeWidth="1"
                            pointerEvents="none"
                          />
                        );
                      })}

                      {/* 호버 시 직교선 및 값 표시 */}
                      {hover && (
                        <g>
                          {(() => {
                            const isRedDot = redDotIndices.has(hover.index);
                            const displayVal = isRedDot ? getRedDotValue(hover.index) : hover.value;
                            const yPos = isRedDot
                              ? Math.max(CHART_PAD.top, Math.min(CHART_PAD.top + chartH, valueToY(displayVal)))
                              : hover.y;
                            const labelW = isRedDot ? 72 : 52;
                            const tooltipBoxY = CHART_PAD.top + 14;
                            const tooltipBoxH = isRedDot ? 28 : 16;
                            return (
                              <>
                                {/* 값 표시 (오른쪽 고정 위치) */}
                                <rect
                                  x={CHART_PAD.left + chartW + 6}
                                  y={tooltipBoxY}
                                  width={labelW}
                                  height={tooltipBoxH}
                                  fill="white"
                                  stroke="#e5e7eb"
                                  strokeWidth="1"
                                  rx="2"
                                />
                                {isRedDot ? (
                                  <>
                                    <text
                                      x={CHART_PAD.left + chartW + 10}
                                      y={tooltipBoxY + 10}
                                      fontSize="9"
                                      fill="#64748b"
                                      textAnchor="start"
                                    >
                                      {language === 'ko' ? '이상치!!' : 'Outlier!!'}
                                    </text>
                                    <text
                                      x={CHART_PAD.left + chartW + 10}
                                      y={tooltipBoxY + 22}
                                      fontSize="10"
                                      fontWeight="600"
                                      fill="#dc2626"
                                      textAnchor="start"
                                    >
                                      {displayVal.toFixed(2)}{activeCol?.unit ?? ''}
                                    </text>
                                  </>
                                ) : (
                                  <text
                                    x={CHART_PAD.left + chartW + 10}
                                    y={tooltipBoxY + 12}
                                    fontSize="10"
                                    fontWeight="600"
                                    fill="#374151"
                                    textAnchor="start"
                                  >
                                    {displayVal.toFixed(2)}{activeCol?.unit ?? ''}
                                  </text>
                                )}
                                {/* X축에 수직선 (마우스 위치 고정, 끊김 방지) */}
                                <line
                                  x1={hover.mouseX}
                                  y1={CHART_PAD.top}
                                  x2={hover.mouseX}
                                  y2={CHART_PAD.top + chartH}
                                  stroke="#94a3b8"
                                  strokeWidth="0.5"
                                  strokeDasharray="2,2"
                                />
                                {/* 호버 포인트 강조 (데이터 포인트 위치) */}
                                <circle
                                  cx={hover.x}
                                  cy={yPos}
                                  r="4"
                                  fill={isRedDot ? '#dc2626' : '#3b82f6'}
                                  fillOpacity="0.3"
                                  stroke={isRedDot ? '#dc2626' : '#3b82f6'}
                                  strokeWidth="2"
                                />
                              </>
                            );
                          })()}
                        </g>
                      )}
                    </svg>
                  </div>
                  {/* 호버 값 표시: 고정 높이로 레이아웃 밀림 방지 */}
                  <div className="min-h-[2rem] mt-2 flex items-center">
                    {hover ? (
                      <p className="text-sm text-slate-600 truncate max-w-full" title={`${formatTimeOnly(hover.time)} · ${activeCol?.nameKorean ?? ''}: ${hover.value.toFixed(2)}${activeCol?.unit ?? ''}`}>
                        <span className="font-medium">{formatTimeOnly(hover.time)}</span>
                        {' · '}
                        {activeCol?.nameKorean ?? ''}: {hover.value.toFixed(2)}{activeCol?.unit ?? ''}
                      {redDotIndices.has(hover.index) && (
                        <>
                          {' · '}
                          <span className="text-red-600">
                            {language === 'ko' ? '이상치!!' : 'Outlier!!'}
                            : {Number(getRedDotValue(hover.index)).toFixed(2)}{activeCol?.unit ?? ''}
                          </span>
                        </>
                      )}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-6 mt-3 text-xs text-slate-600">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-8 h-0.5 bg-blue-600" />
                      {activeCol?.nameKorean ?? (language === 'ko' ? '시뮬레이션' : 'Simulation')}
                    </span>
                    {lowerBoundIQR != null && (
                      <span className="inline-flex items-center gap-2">
                        <span className="w-8 border-t border-emerald-500 border-dashed" />
                        {language === 'ko' ? '하한선' : 'Lower'} {lowerBoundIQR.toFixed(2)}{activeCol?.unit ?? ''}
                      </span>
                    )}
                    {upperBoundIQR != null && (
                      <span className="inline-flex items-center gap-2">
                        <span className="w-8 border-t border-red-500 border-dashed" />
                        {language === 'ko' ? '상한선' : 'Upper'} {upperBoundIQR.toFixed(2)}{activeCol?.unit ?? ''}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 text-center mt-1">
                    {selectedDate} · {language === 'ko' ? '마우스를 올려 값을 확인하세요' : 'Hover to see values'}
                  </p>
                </>
              ) : (
                <div className="py-12 text-center text-slate-500">
                  {language === 'ko'
                    ? '표시할 데이터가 없습니다. 공정 DB에 해당 센서 데이터가 있는지 확인해 주세요.'
                    : 'No data to display. Check if the process DB has the sensor data.'}
                </div>
              )}
                </div>
              </div>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
