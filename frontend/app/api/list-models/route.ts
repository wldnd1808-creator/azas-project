// 사용 가능한 Gemini 모델 목록 조회 API
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GOOGLE_GENERATIVE_AI_API_KEY가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // 사용 가능한 모델 목록 조회
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { 
          error: `모델 목록 조회 실패: ${response.status} ${response.statusText}`,
          details: errorText
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // generateContent를 지원하는 모델만 필터링
    const availableModels = (data.models || [])
      .filter((model: any) => {
        const methods = model.supportedGenerationMethods || [];
        return methods.includes('generateContent');
      })
      .map((model: any) => ({
        name: model.name.replace('models/', ''),
        displayName: model.displayName,
        description: model.description,
        supportedMethods: model.supportedGenerationMethods,
      }));

    return NextResponse.json({
      success: true,
      models: availableModels,
      total: availableModels.length,
    });
  } catch (error: any) {
    console.error('모델 목록 조회 오류:', error);
    return NextResponse.json(
      { 
        error: `모델 목록 조회 실패: ${error.message || error.toString()}` 
      },
      { status: 500 }
    );
  }
}
