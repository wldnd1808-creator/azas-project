import type { FastifyInstance } from 'fastify';
import OpenAI from 'openai';
import { requireAuth } from '../../middlewares/auth.js';
import { authQuery } from '../../db.js';

async function ensureLotReportsTable() {
  await authQuery(`
    CREATE TABLE IF NOT EXISTS lot_defect_reports (
      id INT AUTO_INCREMENT PRIMARY KEY,
      lot_id VARCHAR(100) NOT NULL UNIQUE,
      report_content TEXT NOT NULL,
      lot_data_json JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_lot_id (lot_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function getReportFromDb(lotId: string): Promise<string | null> {
  const rows = (await authQuery<{ report_content: string }[]>(
    'SELECT report_content FROM lot_defect_reports WHERE lot_id = ?',
    [lotId]
  )) as any as { report_content: string }[];
  return rows?.length ? rows[0].report_content : null;
}

async function saveReportToDb(
  lotId: string,
  reportContent: string,
  lotDataJson?: Record<string, unknown>
) {
  const jsonStr = lotDataJson ? JSON.stringify(lotDataJson) : null;
  await authQuery(
    `INSERT INTO lot_defect_reports (lot_id, report_content, lot_data_json)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE report_content = VALUES(report_content), lot_data_json = VALUES(lot_data_json), updated_at = CURRENT_TIMESTAMP`,
    [lotId, reportContent, jsonStr]
  );
}

async function generateDefectReport(
  lotId: string,
  lotData: any,
  language: 'ko' | 'en' = 'ko'
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set');

  const params = lotData?.params || {};
  const paramsStr =
    Object.keys(params).length > 0
      ? Object.entries(params)
          .map(([k, v]) => `  ${k}: ${Number(v as any).toFixed(4)}`)
          .join('\n')
      : '';

  const lotDataText =
    language === 'ko'
      ? `--- LOT 데이터 ---
LOT ID: ${lotId}
판정: ${lotData?.passFailResult ?? '-'}
리튬 투입량: ${lotData?.lithiumInput != null ? `${Number(lotData.lithiumInput).toFixed(4)} kg` : '-'}
첨가제 비율: ${lotData?.addictiveRatio != null ? Number(lotData.addictiveRatio).toFixed(4) : '-'}
공정 시간: ${lotData?.processTime != null ? `${Number(lotData.processTime).toFixed(2)} 분` : '-'}
습도: ${lotData?.humidity != null ? `${Number(lotData.humidity).toFixed(2)}%` : '-'}
탱크 압력: ${lotData?.tankPressure != null ? `${Number(lotData.tankPressure).toFixed(2)} kPa` : '-'}
기록 수: ${lotData?.recordCount ?? 0}
최근 기록: ${lotData?.latestDate ?? '-'}
${paramsStr ? `기타 파라미터:\n${paramsStr}` : ''}`
      : `--- LOT Data ---
LOT ID: ${lotId}
Result: ${lotData?.passFailResult ?? '-'}
Lithium input: ${lotData?.lithiumInput != null ? `${Number(lotData.lithiumInput).toFixed(4)} kg` : '-'}
Additive ratio: ${lotData?.addictiveRatio != null ? Number(lotData.addictiveRatio).toFixed(4) : '-'}
Process time: ${lotData?.processTime != null ? `${Number(lotData.processTime).toFixed(2)} min` : '-'}
Humidity: ${lotData?.humidity != null ? `${Number(lotData.humidity).toFixed(2)}%` : '-'}
Tank pressure: ${lotData?.tankPressure != null ? `${Number(lotData.tankPressure).toFixed(2)} kPa` : '-'}
Record count: ${lotData?.recordCount ?? 0}
Latest: ${lotData?.latestDate ?? '-'}
${paramsStr ? `Other params:\n${paramsStr}` : ''}`;

  const systemPrompt =
    language === 'ko'
      ? '당신은 제조업 공정 관리 시스템의 분석 전문가입니다. 불량 LOT에 대한 상세한 분석 레포트를 작성해주세요. 마크다운 기호(*, #, -, >)를 사용하지 마세요. 일반 텍스트로만 답변하세요.'
      : 'You are an analysis expert for a manufacturing process management system. Write a detailed analysis report for failed LOTs. Do not use markdown symbols. Plain text only.';

  const userPrompt =
    language === 'ko'
      ? `다음 불량 LOT에 대한 "불량 원인 분석 레포트"를 작성해주세요. 레포트는 다음 형식으로 작성해주세요:\n1. 요약 (한 문단)\n2. 원인 분석 (공정 파라미터별 이상 여부)\n3. 권장 조치\n\n${lotDataText}`
      : `Write a "Defect Cause Analysis Report" for the following failed LOT. Format: 1) Summary 2) Cause analysis by process parameters 3) Recommended actions.\n\n${lotDataText}`;

  const openai = new OpenAI({ apiKey });
  const modelName = process.env.OPENAI_MODEL_NAME || 'gpt-4o-mini';

  const completion = await openai.chat.completions.create({
    model: modelName,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.7,
  });

  return completion.choices[0]?.message?.content || '레포트를 생성할 수 없습니다.';
}

export async function registerDashboardLotDefectReport(app: FastifyInstance) {
  app.get('/api/dashboard/lot-defect-report', async (request, reply) => {
    const user = await requireAuth(request as any);
    if (!user) return reply.code(401).send({ success: false, error: 'Unauthorized' });

    const q = (request.query || {}) as any;
    const lotId = q.lotId ? String(q.lotId) : '';
    if (!lotId) return reply.code(400).send({ success: false, error: 'lotId is required' });

    await ensureLotReportsTable();
    const report = await getReportFromDb(lotId);
    if (!report) return reply.code(404).send({ success: false, error: 'NOT_FOUND' });
    return reply.send({ success: true, lotId, report });
  });

  app.post('/api/dashboard/lot-defect-report', async (request, reply) => {
    const user = await requireAuth(request as any);
    if (!user) return reply.code(401).send({ success: false, error: 'Unauthorized' });

    const body = request.body as any;
    const lotId = body?.lotId ? String(body.lotId) : '';
    const lotData = body?.lotData;
    const language = (body?.language === 'en' ? 'en' : 'ko') as 'ko' | 'en';
    if (!lotId || !lotData) return reply.code(400).send({ success: false, error: 'lotId and lotData are required' });

    await ensureLotReportsTable();
    const existing = await getReportFromDb(lotId);
    if (existing) return reply.send({ success: true, lotId, report: existing, fromCache: true });

    try {
      const report = await generateDefectReport(lotId, lotData, language);
      await saveReportToDb(lotId, report, { ...lotData, lotId });
      return reply.send({ success: true, lotId, report });
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : String(e);
      request.log.error({ err: e }, 'Lot defect report generation failed');
      
      // OpenAI API 관련 에러 메시지 개선
      let errorMessage = msg;
      if (msg.includes('OPENAI_API_KEY') || msg.includes('API key') || msg.includes('Invalid API key')) {
        errorMessage = 'OpenAI API 키가 설정되지 않았거나 유효하지 않습니다.';
      } else if (msg.includes('quota') || msg.includes('429') || msg.includes('rate_limit')) {
        errorMessage = 'OpenAI API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.';
      } else if (msg.includes('network') || msg.includes('fetch') || msg.includes('ECONNREFUSED')) {
        errorMessage = 'OpenAI API 서버에 연결할 수 없습니다. 네트워크를 확인해주세요.';
      }
      
      return reply.code(500).send({ success: false, error: errorMessage });
    }
  });
}
