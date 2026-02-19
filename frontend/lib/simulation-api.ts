import type { SimulationResult } from './simulation';

export interface PredictParams {
  temperature: number;
  speedPercent: number;
  processTime?: number;
  tankPressure?: number;
  additiveRatio?: number;
}

const DEFAULT_PROCESS_TIME = 74.3;
const DEFAULT_TANK_PRESSURE = 98;
const DEFAULT_ADDITIVE_RATIO = 0.15;

export async function fetchSimulationPrediction(
  params: PredictParams
): Promise<SimulationResult> {
  const res = await fetch('/api/simulation/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      temperature: params.temperature,
      speedPercent: params.speedPercent,
      processTime: params.processTime ?? DEFAULT_PROCESS_TIME,
      tankPressure: params.tankPressure ?? DEFAULT_TANK_PRESSURE,
      additiveRatio: params.additiveRatio ?? DEFAULT_ADDITIVE_RATIO,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || `Prediction failed (${res.status})`);
  }

  const data = await res.json();
  return {
    yieldPct: Number(data.yieldPct),
    powerKwh: Number(data.powerKwh),
    productionRatePct: Number(data.productionRatePct),
    yieldWarning: Boolean(data.yieldWarning),
  };
}
