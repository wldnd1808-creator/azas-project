# 백엔드(4000) 항상 실행하기

챗봇 등이 동작하려면 **백엔드 서버(포트 4000)** 가 떠 있어야 합니다.

## 방법 1: 프론트와 함께 한 번에 실행 (개발 시)

```bash
cd /home/ubuntu/frontend
npm run dev:with-backend
```

- 백엔드(4000)를 먼저 띄운 뒤 프론트(3000)를 실행합니다.
- 터미널을 닫으면 둘 다 종료됩니다.

## 방법 2: 백엔드만 별도 터미널에서 실행

```bash
cd /home/ubuntu/frontend
npm run backend
```

- 4000번만 계속 켜 두고, 다른 터미널에서 `npm run dev` 로 프론트만 실행할 때 사용합니다.

## 방법 3: PM2로 백엔드 항상 실행 (서버 재부팅 후에도 유지)

```bash
cd /home/ubuntu/frontend
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup   # 나오는 명령어를 복사해 한 번 실행하면 재부팅 후에도 자동 실행
```

- 백엔드가 백그라운드에서 계속 돌아갑니다.
- `pm2 status` 로 상태 확인, `pm2 logs backend-4000` 로 로그 확인.

## 연결 확인

- 백엔드: 브라우저에서 `http://3.34.166.82:4000/health` → `{"ok":true}` 나오면 정상.
- 프론트 `.env.local` 에 `NEXT_PUBLIC_API_BASE_URL=http://localhost:4000` 또는 `http://3.34.166.82:4000` 설정되어 있으면 챗봇이 백엔드에 연결됩니다.
