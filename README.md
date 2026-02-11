# 제조 공정 대시보드

Next.js와 Tailwind CSS를 사용한 제조 공정 모니터링 대시보드입니다.

## 기능

- **고정 사이드바**: 대시보드, 분석, 설정 메뉴
- **상단 네비게이션 바**: 현재 시스템 상태 표시 (시스템 상태, 활성 공정, 경고, 가동 시간)
- **다크 모드 테마**: 전체적으로 다크 테마로 디자인
- **카드 기반 레이아웃**: 중앙 본문 영역에 카드 형태의 섹션들

## 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 프로젝트 구조

```
manufacturing-dashboard/
├── app/
│   ├── layout.tsx      # 루트 레이아웃
│   ├── page.tsx        # 메인 페이지
│   └── globals.css     # 전역 스타일
├── components/
│   ├── Sidebar.tsx     # 사이드바 컴포넌트
│   ├── Navbar.tsx      # 네비게이션 바 컴포넌트
│   └── Card.tsx        # 카드 컴포넌트
└── package.json
```

## 기술 스택

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Lucide React (아이콘)
