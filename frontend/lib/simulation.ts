/**
 * 시뮬레이션 예측 로직 (공유)
 * - 구간별 불량률 데이터 반영: process_time, tank_pressure, additive_ratio
 * - 추후 Python 예측 AI 모델 API 호출로 교체 가능
 */

export const TEMP_REF = 300;

export interface SimulationResult {
  yieldPct: number;
  powerKwh: number;
  productionRatePct: number;
  /** 101~104 kPa 구간 등 수율 경고 구간 여부 (게이지 경고 색상용) */
  yieldWarning?: boolean;
}

const BASE_YIELD_PCT = 95;
const BASE_POWER_KWH = 500;
const YIELD_PER_10C = -0.5;
const POWER_PER_10C = 20;
const YIELD_PER_5_SPEED = -1;
const PRODUCTION_PER_5_SPEED = 0.1;

/** 구간별 불량률 기준 (평균 2.34%) */
const AVG_DEFECT_PCT = 2.34;
const PROCESS_TIME_LOW = 58;       // 58분 미만 → 불량률 9%
const PROCESS_TIME_HIGH = 74.3;    // 74.3분 이상 → 불량률 0.63%
const DEFECT_UNDER_58 = 9;
const DEFECT_OVER_74_3 = 0.63;
const TANK_PRESSURE_WARN_LO = 101;
const TANK_PRESSURE_WARN_HI = 104;
const ADDITIVE_RATIO_THRESHOLD = 0.16;  // 0.16 이상 시 평균보다 불량률 상승

export interface SimulationParams {
  temperature: number;
  speedPercent: number;
  processTime: number;
  tankPressure: number;
  additiveRatio: number;
}

/** 공정 시간에 따른 수율 보정 (불량률 반영). 58 미만→낮음, 74.3 이상→최대 */
function yieldFactorFromProcessTime(processTime: number): number {
  if (processTime < PROCESS_TIME_LOW) {
    return (100 - DEFECT_UNDER_58) / 100; // 91%
  }
  if (processTime >= PROCESS_TIME_HIGH) {
    return (100 - DEFECT_OVER_74_3) / 100; // 99.37%
  }
  const t = (processTime - PROCESS_TIME_LOW) / (PROCESS_TIME_HIGH - PROCESS_TIME_LOW);
  const defectPct = DEFECT_UNDER_58 - t * (DEFECT_UNDER_58 - DEFECT_OVER_74_3);
  return (100 - defectPct) / 100;
}

export function computeSimulation(
  temperature: number,
  speedPercent: number,
  processTime: number,
  tankPressure: number,
  additiveRatio: number
): SimulationResult {
  const tempSteps = Math.max(0, (temperature - TEMP_REF) / 10);
  const speedSteps = speedPercent / 5;

  let yieldPct =
    BASE_YIELD_PCT + tempSteps * YIELD_PER_10C + speedSteps * YIELD_PER_5_SPEED;
  const powerKwh = BASE_POWER_KWH + tempSteps * POWER_PER_10C;
  const productionRatePct = (1 + speedSteps * PRODUCTION_PER_5_SPEED) * 100;

  const processFactor = yieldFactorFromProcessTime(processTime);
  yieldPct = yieldPct * processFactor;

  let yieldWarning = false;
  if (tankPressure >= TANK_PRESSURE_WARN_LO && tankPressure <= TANK_PRESSURE_WARN_HI) {
    yieldPct -= 2.5;
    yieldWarning = true;
  }
  if (additiveRatio >= ADDITIVE_RATIO_THRESHOLD) {
    yieldPct -= 2.5;
  }

  yieldPct = Math.min(100, Math.max(0, yieldPct));

  return {
    yieldPct: Math.round(yieldPct * 10) / 10,
    powerKwh: Math.round(powerKwh * 10) / 10,
    productionRatePct: Math.round(productionRatePct * 10) / 10,
    yieldWarning,
  };
}
