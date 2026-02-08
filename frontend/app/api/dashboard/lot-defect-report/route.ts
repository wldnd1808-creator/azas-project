import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 불량 레포트 API 프록시 라우트
 * Vercel 배포 시 백엔드 서버로 요청을 프록시합니다.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lotId = searchParams.get('lotId');
    
    if (!lotId) {
      return NextResponse.json(
        { success: false, error: 'lotId is required' },
        { status: 400 }
      );
    }

    // 백엔드 서버 URL
    const backendUrl = process.env.BACKEND_API_URL || 
                       process.env.NEXT_PUBLIC_API_BASE_URL || 
                       'http://3.34.166.82:4000';

    // 인증 토큰 가져오기
    const authHeader = request.headers.get('authorization');
    
    console.log('[lot-defect-report] GET request:', { lotId, backendUrl });

    // 백엔드로 요청 전달
    const fetchUrl = `${backendUrl}/api/dashboard/lot-defect-report?lotId=${encodeURIComponent(lotId)}`;
    console.log('[lot-defect-report] GET fetch URL:', fetchUrl);
    
    const response = await fetch(fetchUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    });
    
    console.log('[lot-defect-report] GET response status:', response.status);
    console.log('[lot-defect-report] GET response ok:', response.ok);
    
    let data;
    try {
      const text = await response.text();
      console.log('[lot-defect-report] GET response text (first 500 chars):', text.substring(0, 500));
      data = text ? JSON.parse(text) : {};
      console.log('[lot-defect-report] GET parsed data:', JSON.stringify(data).substring(0, 200));
    } catch (jsonError) {
      console.error('[lot-defect-report] GET JSON parse error:', jsonError);
      // response.text()는 이미 호출했으므로 다시 호출할 수 없음
      return NextResponse.json(
        { success: false, error: `서버 응답을 파싱할 수 없습니다: ${jsonError instanceof Error ? jsonError.message : String(jsonError)}` },
        { status: 500 }
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.error || '레포트 조회 실패' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error('[lot-defect-report] GET Proxy error:', error);
    console.error('[lot-defect-report] GET Error stack:', error instanceof Error ? error.stack : 'No stack');
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes('ECONNREFUSED') || message.includes('fetch failed') || message.includes('ECONNREFUSED')) {
      return NextResponse.json(
        { success: false, error: '백엔드 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { success: false, error: `레포트 조회 실패: ${message}` },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lotId, lotData, language } = body;

    if (!lotId || !lotData) {
      return NextResponse.json(
        { success: false, error: 'lotId and lotData are required' },
        { status: 400 }
      );
    }

    // 백엔드 서버 URL
    const backendUrl = process.env.BACKEND_API_URL || 
                       process.env.NEXT_PUBLIC_API_BASE_URL || 
                       'http://3.34.166.82:4000';

    // 인증 토큰 가져오기
    const authHeader = request.headers.get('authorization');
    
    console.log('[lot-defect-report] POST request:', { lotId, backendUrl, hasAuth: !!authHeader });

    // 백엔드로 요청 전달
    const response = await fetch(`${backendUrl}/api/dashboard/lot-defect-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify({
        lotId,
        lotData,
        language: language || 'ko',
      }),
    });

    let data;
    try {
      const text = await response.text();
      data = text ? JSON.parse(text) : {};
    } catch (jsonError) {
      console.error('[lot-defect-report] POST JSON parse error:', jsonError);
      return NextResponse.json(
        { success: false, error: '서버 응답을 파싱할 수 없습니다.' },
        { status: 500 }
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.error || '레포트 생성 실패' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error('[lot-defect-report] POST Proxy error:', error);
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes('ECONNREFUSED') || message.includes('fetch failed')) {
      return NextResponse.json(
        { success: false, error: '백엔드 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { success: false, error: `레포트 생성 실패: ${message}` },
      { status: 500 }
    );
  }
}
