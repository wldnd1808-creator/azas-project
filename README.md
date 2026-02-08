# AZAS Project

제조 공정 대시보드 프로젝트 - Active material Zero defect AI Solutions

## 프로젝트 구조

```
.
├── frontend/          # Next.js 프론트엔드 애플리케이션
├── backend/           # Fastify 백엔드 서버
└── minseo/            # 데이터 수집 및 처리 시스템
```

## 시작하기

### 사전 요구사항

- Node.js 18 이상
- npm 또는 yarn
- MariaDB/MySQL
- Git

### 설치 및 실행

#### 1. 저장소 클론

```bash
git clone https://github.com/gkstmdwls8720-code/azas_project.git
cd azas_project
```

#### 2. 프론트엔드 설정

```bash
cd frontend
npm install
cp .env.example .env.local  # 환경 변수 설정
npm run dev
```

프론트엔드는 `http://localhost:3000`에서 실행됩니다.

#### 3. 백엔드 설정

```bash
cd backend/backend
npm install
cp .env.example .env  # 환경 변수 설정
npm run dev
```

백엔드는 `http://localhost:4000`에서 실행됩니다.

#### 4. 환경 변수 설정

**프론트엔드 (.env.local)**
```
DB_HOST=your_db_host
DB_PORT=3306
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

**백엔드 (.env)**
```
DB_HOST=your_db_host
DB_PORT=3306
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name
PROCESS_TABLE_NAME=simulation_results
PORT=4000
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL_NAME=gpt-4o-mini
```

## 주요 기능

- 실시간 공정 모니터링
- 불량 원인 분석
- LOT별 공정 현황
- 센서 데이터 시각화
- 챗봇 지원

## 기술 스택

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Fastify, TypeScript, MariaDB
- **Database**: MariaDB/MySQL

## 라이선스

이 프로젝트는 비공개 프로젝트입니다.
