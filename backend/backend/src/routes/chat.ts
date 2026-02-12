import type { FastifyInstance } from 'fastify';
import OpenAI from 'openai';
import { authQuery } from '../db.js';
import { requireAuth } from '../middlewares/auth.js';

type ChatHistoryMsg = { role: 'user' | 'bot'; text: string };

export async function registerChatRoutes(app: FastifyInstance) {
  app.post('/api/chat', async (request, reply) => {
    try {
      // 인증 확인
      const user = await requireAuth(request);
      if (!user) {
        return reply.code(401).send({ error: '인증이 필요합니다.' });
      }

      const body = request.body as any;
      const { 
        message, 
        conversationHistory = [], 
        notices = [], 
        communications = [],
        enableRAG: requestRAG = false, // RAG 기능은 현재 비활성화 (OpenAI embeddings로 나중에 구현 가능)
        includeNotices = false, // 공지사항 포함 여부
        includeCommunications = false // 커뮤니케이션 포함 여부
      } = body;

      if (!message || typeof message !== 'string' || !message.trim()) {
        return reply.code(400).send({ error: '메시지를 입력해주세요.' });
      }

      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return reply.code(500).send({ error: 'OpenAI API 키가 설정되지 않았습니다.' });
      }

      // 사용자 정보 가져오기
      let userName = user.employeeNumber;
      let userRole = 'user';
      try {
        const userRows = await authQuery<Array<{ name: string; role: string }>>(
          'SELECT name, role FROM users WHERE employee_number = ?',
          [user.employeeNumber]
        );
        if (Array.isArray(userRows) && userRows.length > 0) {
          userName = userRows[0]?.name || user.employeeNumber;
          userRole = userRows[0]?.role || 'user';
        }
      } catch (dbError) {
        request.log.warn({ err: dbError }, 'Failed to fetch user info, using defaults');
        // DB 오류가 있어도 챗봇은 계속 작동하도록 함
      }

      // 컨텍스트 구성
      const contextParts: string[] = [];

      // RAG 기능은 현재 비활성화 (필요시 OpenAI embeddings로 구현 가능)
      if (requestRAG) {
        // TODO: OpenAI embeddings를 사용한 RAG 구현 가능
        console.warn('RAG 기능은 현재 OpenAI로 구현되지 않았습니다.');
      }

      // 공지사항과 커뮤니케이션은 사용자가 명시적으로 요청할 때만 포함
      if (includeNotices && notices.length > 0) {
        contextParts.push('\n=== 공지사항 ===');
        notices.forEach((notice: any) => {
          contextParts.push(`- ${notice.title}: ${notice.content}`);
        });
      }

      if (includeCommunications && communications.length > 0) {
        contextParts.push('\n=== 커뮤니케이션 ===');
        communications.forEach((comm: any) => {
          contextParts.push(`- ${comm.title}: ${comm.content}`);
        });
      }

      const context = contextParts.length > 0 ? contextParts.join('\n\n') : '';

      // OpenAI API 호출
      const openai = new OpenAI({ apiKey });
      const modelName = process.env.OPENAI_MODEL_NAME || 'gpt-4o-mini';

      // 대화 히스토리를 OpenAI 메시지 형식으로 변환
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: `당신은 제조업 공정 관리 시스템의 챗봇입니다. 사용자의 질문에 친절하고 정확하게 답변해주세요.${context ? `\n\n[참고 정보]\n${context}` : ''}`
        }
      ];

      // 대화 히스토리 추가 (최근 10개)
      conversationHistory.forEach((msg: ChatHistoryMsg) => {
        if (msg.role === 'user') {
          messages.push({ role: 'user', content: msg.text });
        } else if (msg.role === 'bot') {
          messages.push({ role: 'assistant', content: msg.text });
        }
      });

      // 현재 사용자 메시지 추가
      messages.push({
        role: 'user',
        content: `사용자 (${userName}, ${userRole === 'admin' ? '관리자' : '일반 사용자'}): ${message}`
      });

      const completion = await openai.chat.completions.create({
        model: modelName,
        messages: messages,
        temperature: 0.7,
      });

      const botMessage = completion.choices[0]?.message?.content;
      
      if (!botMessage) {
        request.log.warn('OpenAI returned empty message', { completion });
        return reply.code(500).send({
          success: false,
          error: '챗봇 응답을 생성할 수 없습니다. 다시 시도해주세요.',
        });
      }

      return reply.send({
        success: true,
        message: botMessage,
      });
    } catch (error: any) {
      console.error('챗봇 오류:', error);
      const errorDetails = {
        message: error?.message,
        stack: error?.stack,
        response: error?.response?.data,
        status: error?.response?.status,
        code: error?.code,
        name: error?.name,
      };
      request.log.error({ err: error, errorDetails }, 'Chat API error');
      
      let errorMessage = '챗봇 응답 중 오류가 발생했습니다.';
      const msg = String(error?.message || error || '');

      if (msg.includes('API_KEY_INVALID') || msg.includes('API key') || msg.includes('Invalid API key')) {
        errorMessage = 'OpenAI API 키가 유효하지 않습니다. 환경 변수를 확인해주세요.';
      } else if (msg.includes('quota') || msg.includes('쿼터') || msg.includes('한도') || msg.includes('429') || msg.includes('rate_limit')) {
        errorMessage = 'API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.';
      } else if (msg.includes('network') || msg.includes('fetch') || msg.includes('ECONNREFUSED')) {
        errorMessage = '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      } else if (process.env.NODE_ENV === 'development') {
        errorMessage = `개발 모드 오류: ${msg}`;
      }

      return reply.code(500).send({
        success: false,
        error: errorMessage,
      });
    }
  });
}
