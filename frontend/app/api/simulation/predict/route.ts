import { NextRequest, NextResponse } from 'next/server';
import { computeSimulation } from '@/lib/simulation';

const DEFAULT_PROCESS_TIME = 74.3;
const DEFAULT_TANK_PRESSURE = 98;
const DEFAULT_ADDITIVE_RATIO = 0.15;

/**
 * 시뮬레이션 예측 API (구간별 불량률 반영)
 * POST body: { temperature, speedPercent, processTime?, tankPressure?, additiveRatio? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const temperature = Number(body?.temperature ?? 300);
    const speedPercent = Number(body?.speedPercent ?? 0);
    const processTime = Number(body?.processTime ?? DEFAULT_PROCESS_TIME);
    const tankPressure = Number(body?.tankPressure ?? DEFAULT_TANK_PRESSURE);
    const additiveRatio = Number(body?.additiveRatio ?? DEFAULT_ADDITIVE_RATIO);

    if (Number.isNaN(temperature) || Number.isNaN(speedPercent)) {
      return NextResponse.json(
        { error: 'temperature, speedPercent required' },
        { status: 400 }
      );
    }

    const result = computeSimulation(
      temperature,
      speedPercent,
      processTime,
      tankPressure,
      additiveRatio
    );
    return NextResponse.json(result);
  } catch (e) {
    console.error('Simulation predict error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Prediction failed' },
      { status: 500 }
    );
  }
}
