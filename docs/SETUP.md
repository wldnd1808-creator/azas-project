# 설치 및 실행 가이드

## 1. Node.js 설치 확인

터미널에서 다음 명령어로 Node.js가 설치되어 있는지 확인하세요:

```powershell
node --version
npm --version
```

두 명령어 모두 버전 번호를 출력하면 정상적으로 설치된 것입니다.

## 2. Node.js가 설치되어 있지 않은 경우

1. https://nodejs.org 접속
2. LTS 버전 다운로드 (권장)
3. 설치 프로그램 실행
4. 설치 완료 후 **터미널을 재시작**하세요

## 3. 프로젝트 의존성 설치

프로젝트 디렉토리에서 다음 명령어를 실행하세요:

```powershell
cd C:\Users\gkstm\manufacturing-dashboard
npm install
```

## 4. 개발 서버 실행

의존성 설치가 완료되면 다음 명령어로 개발 서버를 실행하세요:

```powershell
npm run dev
```

서버가 시작되면 다음과 같은 메시지가 표시됩니다:

```
  ▲ Next.js 14.x.x
  - Local:        http://localhost:3000
  - Network:      http://192.168.x.x:3000
```

브라우저에서 `http://localhost:3000`을 열어 대시보드를 확인하세요.

## 문제 해결

### "Connection Failed" 오류가 계속 발생하는 경우

1. **포트 3000이 이미 사용 중인지 확인**
   ```powershell
   netstat -ano | findstr :3000
   ```
   다른 프로세스가 포트를 사용 중이면 종료하거나 다른 포트를 사용하세요:
   ```powershell
   npm run dev -- -p 3001
   ```

2. **의존성 재설치**
   ```powershell
   Remove-Item -Recurse -Force node_modules
   Remove-Item package-lock.json
   npm install
   ```

3. **캐시 정리**
   ```powershell
   Remove-Item -Recurse -Force .next
   npm run dev
   ```

### Node.js를 찾을 수 없는 경우

- 터미널을 완전히 종료하고 다시 시작하세요
- 시스템을 재시작하세요
- Node.js 설치 경로가 PATH 환경 변수에 추가되었는지 확인하세요
