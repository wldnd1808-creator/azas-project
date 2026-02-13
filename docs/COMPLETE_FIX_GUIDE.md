# 빌드 에러 완전 해결 가이드

## 문제 요약
1. **PowerShell 실행 정책 문제**: npm 스크립트 실행 불가
2. **npm 오프라인 모드**: 환경 변수에서 `offline=true` 설정
3. **패키지 누락**: `bcryptjs`, `mysql2` 등이 설치되지 않음

## 단계별 해결 방법

### 1단계: PowerShell 실행 정책 변경

**PowerShell을 관리자 권한으로 실행**한 후:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process -Force
```

또는 **CMD(명령 프롬프트)를 사용**하세요 (더 간단함)

### 2단계: 시스템 환경 변수 확인 및 수정

1. **Windows 키 + R** → `sysdm.cpl` 입력 → Enter
2. **"고급"** 탭 → **"환경 변수"** 클릭
3. **사용자 변수** 또는 **시스템 변수**에서 다음 변수 찾기:
   - `npm_config_offline`
   - `npm_config_prefer_offline`
   - `NPM_CONFIG_OFFLINE`
   - `NPM_CONFIG_PREFER_OFFLINE`
4. **모두 삭제**하거나 값을 `false`로 변경
5. **확인** 클릭하여 저장
6. **모든 터미널을 닫고 새로 열기**

### 3단계: 패키지 설치

**CMD(명령 프롬프트)**를 열고:

```cmd
cd c:\Users\gkstm\manufacturing-dashboard
npm install bcryptjs mysql2 @types/bcryptjs dotenv --save
```

또는 **PowerShell**에서 (실행 정책 변경 후):

```powershell
cd c:\Users\gkstm\manufacturing-dashboard
$env:npm_config_offline = $null
$env:npm_config_prefer_offline = $null
npm install bcryptjs mysql2 @types/bcryptjs dotenv --save
```

### 4단계: 빌드 테스트

```cmd
npm run build
```

또는 개발 서버 실행:

```cmd
npm run dev
```

## 확인 사항

패키지가 제대로 설치되었는지 확인:

```cmd
dir node_modules\bcryptjs
dir node_modules\mysql2
```

둘 다 폴더가 존재해야 합니다.

## 여전히 안 되면

1. **Node.js 재설치** 고려
2. **npm 캐시 완전 삭제**:
   ```cmd
   npm cache clean --force
   rmdir /s /q "%APPDATA%\npm-cache"
   ```
3. **프로젝트의 node_modules 삭제 후 재설치**:
   ```cmd
   rmdir /s /q node_modules
   del package-lock.json
   npm install
   ```

## 참고

- 환경 변수 변경 후 **반드시 새 터미널을 열어야** 적용됩니다
- CMD를 사용하면 PowerShell 실행 정책 문제를 피할 수 있습니다
- 관리자 권한이 필요한 경우가 많습니다
