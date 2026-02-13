import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { employeeNumber, password } = await request.json();

    if (!employeeNumber || !password) {
      return NextResponse.json(
        { error: '사원번호와 비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    // users 테이블에서 사원번호로 사용자 조회
    let users: any[];
    try {
      users = await query(
        'SELECT * FROM users WHERE employee_number = ?',
        [employeeNumber]
      ) as any[];
    } catch (dbError: any) {
      console.error('Database query error:', dbError);
      return NextResponse.json(
        { 
          error: process.env.NODE_ENV === 'development' 
            ? `데이터베이스 연결 오류: ${dbError.message}`
            : '데이터베이스 연결에 실패했습니다. 관리자에게 문의하세요.'
        },
        { status: 500 }
      );
    }

    if (users.length === 0) {
      return NextResponse.json(
        { error: '사원번호 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      );
    }

    const user = users[0];

    // 비밀번호 확인 (bcrypt로 해시된 비밀번호 비교)
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: '사원번호 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      );
    }

    // 로그인 성공 - 사용자 정보 반환 (비밀번호 제외)
    const userData = {
      employeeNumber: user.employee_number,
      name: user.name,
      role: user.role,
    };

    // 쿠키에 사용자 정보 저장
    const response = NextResponse.json({
      success: true,
      user: userData,
    });

    response.cookies.set('user', JSON.stringify(userData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7일
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    // 더 자세한 에러 메시지 반환 (개발 환경에서만)
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? `로그인 중 오류가 발생했습니다: ${error.message || error.toString()}`
      : '로그인 중 오류가 발생했습니다.';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
