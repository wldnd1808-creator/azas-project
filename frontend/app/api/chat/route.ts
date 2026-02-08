import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 챗봇 API 프록시 라우트
 * Vercel 배포 시 백엔드 서버로 요청을 프록시합니다.
 * 백엔드 서버가 항상 켜져있어야 합니다.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 백엔드 서버 URL (환경 변수 또는 기본값)
    // Vercel 환경 변수에 BACKEND_API_URL을 설정하거나
    // NEXT_PUBLIC_API_BASE_URL을 사용할 수 있습니다
    const backendUrl = process.env.BACKEND_API_URL || 
                       process.env.NEXT_PUBLIC_API_BASE_URL || 
                       'http://3.34.166.82:4000';
    
    // 인증 토큰 가져오기
    const authHeader = request.headers.get('authorization');
    
    // 백엔드로 요청 전달
    const response = await fetch(`${backendUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || '챗봇 요청 실패' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error('[chat] Proxy error:', error);
    const message = error instanceof Error ? error.message : String(error);
    
    // 네트워크 오류인 경우 백엔드 서버 연결 실패로 판단
    if (message.includes('ECONNREFUSED') || message.includes('fetch failed')) {
      return NextResponse.json(
        { error: '백엔드 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.' },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: `챗봇 서버 연결 실패: ${message}` },
      { status: 500 }
    );
  }
}
