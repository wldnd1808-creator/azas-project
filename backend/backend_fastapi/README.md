# AZAS Dashboard API (FastAPI)

FastAPI 기반 백엔드입니다. Next.js 프론트와 동일한 API 경로·응답 형식을 제공합니다.

## 요구 사항

- Python 3.10+
- MariaDB/MySQL (auth용 DB + 공정 데이터용 DB)

## 설치 및 실행

```bash
cd backend_fastapi
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# .env 에 DB 접속 정보·JWT_SECRET·CORS_ORIGIN 설정 후
uvicorn main:app --host 0.0.0.0 --port 4000 --reload
```

## 환경 변수

| 변수 | 설명 |
|------|------|
| PORT | 서버 포트 (기본 4000) |
| CORS_ORIGIN | 허용 Origin (쉼표 구분) |
| JWT_SECRET | JWT 서명 비밀키 |
| AUTH_DB_* | 로그인/회원가입용 DB (users 테이블) |
| DB_* / PROCESS_DB_NAME | 공정 데이터용 DB (preprocessing 등) |
| BACKEND_DATE_TZ | 날짜 기준 타임존 (예: Asia/Seoul) |

## API 경로

- `POST /api/auth/login` - 로그인
- `POST /api/auth/signup` - 회원가입
- `POST /api/auth/update-name` - 이름 변경 (Bearer)
- `GET /api/auth/session` - 세션 확인
- `POST /api/auth/logout` - 로그아웃
- `GET /api/dashboard/summary` - 대시보드 요약
- `GET /api/dashboard/calendar-month` - 캘린더 (year, month)
- `GET /api/dashboard/lot-status` - LOT별 공정 현황 (period, all, debug, noDate)
- `GET /api/dashboard/alerts` - FDC 알림
- `GET /api/dashboard/realtime` - 실시간 센서
- `GET /api/dashboard/analytics` - 불량 원인 분석용

## 프론트에서 FastAPI 사용

프론트엔드 `.env.local` 또는 Vercel 환경 변수에 다음을 설정하면 이 FastAPI 서버를 사용합니다.

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

배포 시에는 FastAPI 서버의 실제 URL(예: `https://api.example.com`)로 설정합니다.
