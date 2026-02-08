# manufacturing-dashboard-backend

Fastify 기반 API 서버입니다. 프론트(Next.js/Vercel)와 분리 운영을 전제로 합니다.

## 로컬 실행

```bash
cd backend
npm install
npm run dev
```

기본 포트는 `4000` 입니다.

## 환경변수

`.env`(또는 시스템 환경변수)로 설정합니다. 예시는 `.env.example` 참고.

필수/권장:
- `JWT_SECRET`: JWT 서명 키
- `CORS_ORIGIN`: 허용할 프론트 Origin (기본: `https://azas-project.vercel.app`)
- `AUTH_DB_*`: users / lot_defect_reports 테이블이 있는 DB (미설정 시 `DB_*` 사용)
- **공정 데이터(대시보드)**: MariaDB `project` DB의 `preprocessing` 테이블을 쓰려면  
  **`DB_NAME=project`** 또는 **`PROCESS_DB_NAME=project`** 를 반드시 설정하세요.  
  `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`는 MariaDB 접속 정보로 맞춰 주세요.
- `GOOGLE_GENERATIVE_AI_API_KEY`: LOT 불량 리포트 생성에 필요(선택)

## 대시보드에 데이터가 안 뜰 때 (Lightsail + project.preprocessing)

1. **백엔드 서버(Lightsail) 환경변수**  
   - `DB_NAME=project` 또는 `PROCESS_DB_NAME=project`  
   - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`가 MariaDB 접속에 맞는지 확인
2. **MariaDB**  
   - `project` DB 존재, `preprocessing` 테이블 존재  
   - 백엔드에서 쓰는 DB 사용자에게 `project` DB 접근 권한이 있는지 확인
3. **방화벽**  
   - Lightsail에서 백엔드 포트(예: 4000) 열려 있는지, Vercel 프론트에서 해당 URL로 요청 가능한지 확인
4. **Vercel**  
   - `NEXT_PUBLIC_API_BASE_URL`이 백엔드 HTTPS 주소(예: `https://<Lightsail-IP 또는 도메인>:4000` 또는 터널 URL)로 설정되어 있는지 확인

## 프론트 연결

프론트(Next.js)에서 아래 환경변수를 설정합니다.

- `NEXT_PUBLIC_API_BASE_URL=https://<backend-https-url>`

예: Cloudflare Quick Tunnel 사용 시 터널이 만들어주는 `https://....trycloudflare.com` 를 넣으면 됩니다.

## HTTPS (도메인 없이 빠르게)

Vercel 프론트에서 Mixed Content 없이 호출하려면 **백엔드도 HTTPS**여야 합니다.

가장 쉬운 방법: Cloudflare Quick Tunnel

```bash
cloudflared tunnel --url http://localhost:4000
```

출력되는 `https://....trycloudflare.com` 를 `NEXT_PUBLIC_API_BASE_URL`로 사용하세요.

