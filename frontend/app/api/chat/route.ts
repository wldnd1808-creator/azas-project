import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { cookies } from 'next/headers';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import path from 'path';

type ChatHistoryMsg = { role: 'user' | 'bot'; text: string };

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { message, conversationHistory } = await request.json();

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: '메시지를 입력해주세요.' },
        { status: 400 }
      );
    }

    // API 키 확인
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API 키가 설정되지 않았습니다. .env.local 파일에 GOOGLE_GENERATIVE_AI_API_KEY를 설정하세요.' },
        { status: 500 }
      );
    }
    
    // API 키 형식 확인 (기본적인 검증)
    if (!apiKey.startsWith('AIza')) {
      console.warn('API 키 형식이 예상과 다릅니다. Google AI Studio에서 발급받은 API 키인지 확인하세요.');
    }

    // Chroma 설정 (로컬 파일 기반)
    const chromaPath = process.env.CHROMA_PATH || path.resolve(process.cwd(), '.chroma');
    const collectionName = process.env.CHROMA_COLLECTION || 'manufacturing_docs';

    // 쿠키에서 사용자 정보 가져오기
    const cookieStore = await cookies();
    const userCookie = cookieStore.get('user');
    
    let userInfo = '';
    let userContext = '';
    
    if (userCookie) {
      try {
        const userData = JSON.parse(userCookie.value);
        userInfo = `현재 로그인한 사용자: ${userData.name || userData.employeeNumber} (사원번호: ${userData.employeeNumber}, 역할: ${userData.role === 'admin' ? '관리자' : '사원'})`;
        
        // 데이터베이스에서 사용자 정보 가져오기
        try {
          const users = await query(
            'SELECT employee_number, name, role FROM users WHERE employee_number = ?',
            [userData.employeeNumber]
          ) as any[];
          
          if (users.length > 0) {
            const user = users[0];
            userContext = `사용자 정보:\n- 사원번호: ${user.employee_number}\n- 이름: ${user.name}\n- 역할: ${user.role === 'admin' ? '관리자' : '사원'}`;
          }
        } catch (dbError) {
          console.error('Database query error:', dbError);
        }
      } catch (e) {
        console.error('User cookie parse error:', e);
      }
    }

    // 시스템 프롬프트 구성
    const systemPrompt = `당신은 제조 공정 대시보드의 AI 어시스턴트입니다. 간결하고 명확하게 필요한 정보만 제공하세요.

답변 규칙:
1. 질문에 대한 핵심 정보만 간단히 답변하세요.
2. 불필요한 설명이나 장황한 문구는 피하세요.
3. 문서에서 찾은 정보가 있으면 그 내용만 간단히 전달하세요.
4. 문서에 정보가 없으면 "제공해주신 참고 문서에는 해당 정보가 포함되어 있지 않습니다"라고만 답변하세요.
5. 대시보드 기능 질문에는 해당 기능의 위치나 사용법만 간단히 안내하세요.
6. 한국어로 답변하세요.`;

    // 대화 히스토리 (RAG에는 필수 아님, 간단히 마지막 6개만 연결)
    const history: ChatHistoryMsg[] = Array.isArray(conversationHistory) ? conversationHistory : [];
    let trimmedHistory = history.slice(-6);
    
    // Gemini API는 첫 번째 메시지가 반드시 'user' 역할이어야 함
    // 첫 번째 메시지가 'bot'이면 제거
    if (trimmedHistory.length > 0 && trimmedHistory[0].role === 'bot') {
      trimmedHistory = trimmedHistory.slice(1);
    }
    
    const historyText = trimmedHistory
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
      .join('\n');

    // Retrieval (Chroma - 로컬 파일 기반)
    const embeddings = new GoogleGenerativeAIEmbeddings({ 
      apiKey,
      modelName: 'models/gemini-embedding-001', // 최신 임베딩 모델 사용
    });
    const qEmbedding = await embeddings.embedQuery(String(message));

    // 간단한 파일 기반 벡터 저장소 사용 (서버 불필요)
    let vectorStore;
    let contextBlock = '';
    
    try {
      const { SimpleVectorStore } = await import('@/lib/simple-vector-store');
      vectorStore = new SimpleVectorStore(chromaPath);
      await vectorStore.init();
      
      // 더 많은 결과를 가져오고 유사도 필터링
      const results = await vectorStore.query(qEmbedding, 8); // 8개로 증가

      const docs = (results?.documents?.[0] || []).map((doc: string, i: number) => {
        const meta = (results?.metadatas?.[0]?.[i] as any) || {};
        const source = meta.source || 'unknown';
        const chunk = meta.chunk ?? i;
        const distance = (results?.distances?.[0]?.[i] as number) ?? 1;
        const similarity = 1 - distance;
        
        // 유사도가 0.3 이상인 것만 포함 (임계값 낮춤)
        if (similarity < 0.3) {
          return null;
        }
        
        const fileName = path.basename(source);
        return `- [${fileName}#${chunk}] (유사도: ${(similarity * 100).toFixed(1)}%)\n${doc}`;
      }).filter(Boolean) as string[];

      if (docs.length > 0) {
        // 상위 4개만 사용
        const topDocs = docs.slice(0, 4);
        contextBlock = `\n\n## 참고 문서(검색 결과)\n${topDocs.join('\n\n')}\n\n---\n위 문서 내용을 바탕으로 정확하게 답변하세요. 문서에 명확한 정보가 없으면 "제공해주신 참고 문서에는 해당 정보가 포함되어 있지 않습니다"라고 답하세요.`;
        console.log(`[RAG] ${docs.length}개 문서 발견, 상위 ${topDocs.length}개 사용`);
      } else {
        contextBlock = '\n\n(참고 문서 검색 결과 없음) 문서 근거가 없으면 모른다고 답하세요.';
        console.log('[RAG] 관련 문서를 찾지 못했습니다.');
      }
    } catch (error: any) {
      // RAG 실패 시 컨텍스트 없이 진행
      console.warn('벡터 저장소 초기화 실패, RAG 없이 진행:', error.message);
    }

    // LLM (Gemini via @google/generative-ai 직접 사용) - fallback 모델 시도
    // 실제 사용 가능한 모델 이름 사용 (2025년 기준)
    // 참고: SDK는 models/ 접두사 없이 모델 이름만 사용합니다
    
    // 기본 모델 목록 (사용 가능한 모델 확인 실패 시 사용)
    const defaultModelNames = [
      process.env.GEMINI_MODEL_NAME,
      'gemini-1.5-flash',            // 가장 안정적이고 빠른 모델 (권장)
      'gemini-1.5-pro',               // 더 강력한 모델
      'gemini-pro',                   // 레거시 모델 (호환성)
    ].filter(Boolean) as string[];
    
    // 사용 가능한 모델 목록 조회 시도 (쿼터 절약을 위해 스킵 가능)
    let availableModelNames = defaultModelNames;
    try {
      const modelsResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );
      
      if (modelsResponse.ok) {
        const modelsData = await modelsResponse.json();
        const supportedModels = (modelsData.models || [])
          .filter((m: any) => {
            const methods = m.supportedGenerationMethods || [];
            return methods.includes('generateContent');
          })
          .map((m: any) => m.name.replace('models/', ''))
          // 무료 티어 쿼터가 초과된 경우 free_tier가 아닌 모델 우선
          .sort((a: string, b: string) => {
            // free_tier가 포함된 모델을 뒤로
            if (a.includes('free') && !b.includes('free')) return 1;
            if (!a.includes('free') && b.includes('free')) return -1;
            return 0;
          });
        
        if (supportedModels.length > 0) {
          // 사용 가능한 모델이 있으면 우선 사용
          availableModelNames = [
            process.env.GEMINI_MODEL_NAME,
            ...supportedModels.filter((m: string) => m.includes('flash') || m.includes('pro') || m.includes('gemini'))
          ].filter(Boolean) as string[];
          console.log(`사용 가능한 모델 발견: ${availableModelNames.join(', ')}`);
        }
      }
    } catch (modelsError) {
      console.warn('모델 목록 조회 실패, 기본 모델 사용:', modelsError);
    }
    
    // 중복 제거
    const seen = new Set<string>();
    const uniqueModelNames = availableModelNames.filter(name => {
      const trimmed = name.trim();
      if (seen.has(trimmed)) return false;
      seen.add(trimmed);
      return true;
    });

    const genAI = new GoogleGenerativeAI(apiKey);
    let result: any;
    let lastError: any;

    for (const modelName of uniqueModelNames) {
      // 모델 이름 정규화 (models/ 접두사 제거, 공백 제거)
      const normalizedModelName = modelName.trim().replace(/^models\//, '');
      
      try {
        console.log(`모델 시도: ${normalizedModelName}`);
        
        // systemInstruction 없이 먼저 시도 (일부 모델은 지원하지 않을 수 있음)
        let model;
        try {
          model = genAI.getGenerativeModel({ 
            model: normalizedModelName,
            systemInstruction: systemPrompt,
          });
        } catch (configError: any) {
          // systemInstruction이 지원되지 않으면 없이 시도
          console.warn(`systemInstruction 미지원, 기본 설정으로 시도: ${normalizedModelName}`);
          model = genAI.getGenerativeModel({ 
            model: normalizedModelName,
          });
        }

        // 대화 히스토리 구성 (Gemini API는 첫 번째가 반드시 'user'여야 함)
        const chatHistory = trimmedHistory.map((msg) => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }],
        }));
        
        // 첫 번째 메시지가 'model'이면 제거
        if (chatHistory.length > 0 && chatHistory[0].role === 'model') {
          chatHistory.shift();
        }
        
        // RAG 컨텍스트를 포함한 메시지 구성
        const messageWithContext = contextBlock ? `${message}${contextBlock}` : message;
        
        // 히스토리가 있으면 startChat 사용, 없으면 generateContent 직접 사용
        if (chatHistory.length > 0) {
          const chat = model.startChat({
            history: chatHistory,
          });
          const response = await chat.sendMessage(messageWithContext);
          result = response.response;
        } else {
          // 히스토리가 없으면 generateContent 직접 사용
          // systemInstruction이 없으면 프롬프트에 포함
          const fullPrompt = systemPrompt 
            ? `${systemPrompt}${historyText ? `\n\n대화 히스토리:\n${historyText}` : ''}\n\n질문: ${messageWithContext}`
            : `${historyText ? `대화 히스토리:\n${historyText}\n\n` : ''}질문: ${messageWithContext}`;
          const response = await model.generateContent(fullPrompt);
          result = response.response;
        }
        
        console.log(`모델 ${normalizedModelName} 성공!`);
        break; // 성공하면 루프 종료
      } catch (error: any) {
        lastError = error;
        const errorMsg = error.message || error.toString();
        const errorDetails = error.toString();
        
        console.warn(`모델 ${normalizedModelName} 실패:`, errorMsg);
        
        // 429 오류 (쿼터 초과) 처리
        if (errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('Quota exceeded')) {
          // 재시도 시간 추출 (초 단위)
          let retryAfter = 60; // 기본 60초
          const retryMatch = errorMsg.match(/Please retry in ([\d.]+)s/);
          if (retryMatch) {
            retryAfter = Math.ceil(parseFloat(retryMatch[1]));
          }
          
          // 무료 티어 쿼터 초과인 경우 다른 모델 시도
          if (errorMsg.includes('free_tier') || errorMsg.includes('FreeTier')) {
            console.warn(`무료 티어 쿼터 초과 (${normalizedModelName}), 다른 모델 시도...`);
            // 무료 티어가 아닌 모델로 계속 시도
            continue;
          } else {
            // 유료 티어도 쿼터 초과인 경우
            throw new Error(`API 쿼터 초과: ${retryAfter}초 후 다시 시도해주세요. 자세한 정보: https://ai.google.dev/gemini-api/docs/rate-limits`);
          }
        }
        
        // 401 또는 403 오류인 경우 API 키 문제일 수 있음
        if (errorMsg.includes('401') || errorMsg.includes('403') || errorMsg.includes('API key')) {
          throw new Error(`API 키 오류: API 키가 유효하지 않거나 모델 접근 권한이 없습니다. 오류: ${errorMsg}`);
        }
        
        // 404 오류인 경우 모델이 존재하지 않는 것이므로 계속 시도
        // 다른 오류인 경우도 계속 시도 (네트워크 오류 등)
        continue;
      }
    }

    if (!result) {
      const errorDetails = lastError?.message || lastError?.toString() || '알 수 없는 오류';
      
      // 더 자세한 오류 메시지 제공
      let userMessage = `모든 모델 시도 실패. 시도한 모델: ${uniqueModelNames.join(', ')}.`;
      
      if (errorDetails.includes('429') || errorDetails.includes('quota') || errorDetails.includes('Quota exceeded')) {
        // 쿼터 초과 오류
        let retryAfter = 60;
        const retryMatch = errorDetails.match(/Please retry in ([\d.]+)s/);
        if (retryMatch) {
          retryAfter = Math.ceil(parseFloat(retryMatch[1]));
        }
        
        if (errorDetails.includes('free_tier') || errorDetails.includes('FreeTier')) {
          userMessage = `무료 티어 쿼터 초과: 일일 요청 한도를 초과했습니다. ${retryAfter}초 후 다시 시도하거나, Google AI Studio에서 사용량을 확인하세요.\n\n사용량 확인: https://aistudio.google.com/app/apikey`;
        } else {
          userMessage = `API 쿼터 초과: ${retryAfter}초 후 다시 시도해주세요.\n\n사용량 확인: https://aistudio.google.com/app/apikey`;
        }
      } else if (errorDetails.includes('404')) {
        userMessage += `\n\n모든 모델을 찾을 수 없습니다. API 키가 올바른지 확인하거나, 사용 가능한 모델 목록을 확인하세요: http://localhost:3000/api/list-models`;
      } else if (errorDetails.includes('401') || errorDetails.includes('403')) {
        userMessage += `\n\nAPI 키 오류: API 키가 유효하지 않거나 모델 접근 권한이 없습니다.`;
      } else {
        userMessage += `\n\n마지막 오류: ${errorDetails}`;
      }
      
      throw new Error(userMessage);
    }

    const text = result.text();

    return NextResponse.json({
      success: true,
      message: text,
    });
  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { 
        error: process.env.NODE_ENV === 'development' 
          ? `챗봇 오류: ${error.message || error.toString()}`
          : '챗봇 응답 중 오류가 발생했습니다.'
      },
      { status: 500 }
    );
  }
}
