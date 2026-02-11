# 패키지 설치 가이드

현재 npm이 오프라인 모드로 설정되어 있어 패키지 설치가 불가능합니다.

## 해결 방법

1. **PowerShell을 관리자 권한으로 실행**하세요.

2. 프로젝트 폴더로 이동:
   ```powershell
   cd c:\Users\gkstm\manufacturing-dashboard
   ```

3. npm 캐시 설정 확인 및 수정:
   ```powershell
   npm config get cache
   npm config set cache ""
   npm config delete prefer-offline
   ```

4. 패키지 설치:
   ```powershell
   npm install bcryptjs mysql2 @types/bcryptjs dotenv --save
   ```

5. 또는 모든 패키지 재설치:
   ```powershell
   npm install
   ```

6. 빌드 테스트:
   ```powershell
   npm run build
   ```

## 대안: 개발 서버 사용

프로덕션 빌드 대신 개발 서버를 사용할 수도 있습니다:
```powershell
npm run dev
```

개발 서버는 빌드 에러 없이 실행되며, 코드 변경 시 자동으로 새로고침됩니다.
