# PowerShell 실행 정책 문제 해결

## 문제
PowerShell에서 npm 명령을 실행할 수 없습니다:
```
이 시스템에서 스크립트를 실행할 수 없으므로 C:\Program Files\nodejs\npm.ps1 파일을 로드할 수 없습니다.
```

## 해결 방법

### 방법 1: PowerShell 실행 정책 변경 (권장)

PowerShell을 **관리자 권한으로 실행**한 후:

```powershell
# 현재 프로세스에서만 실행 정책 변경 (안전함)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process -Force

# 프로젝트 폴더로 이동
cd c:\Users\gkstm\manufacturing-dashboard

# 환경 변수 해제
$env:npm_config_offline = $null

# 패키지 설치
npm install bcryptjs mysql2 @types/bcryptjs dotenv --save

# 빌드 테스트
npm run build
```

### 방법 2: CMD 사용 (더 간단)

PowerShell 대신 **명령 프롬프트(CMD)**를 사용하세요:

1. Windows 키 + R
2. `cmd` 입력 후 Enter
3. 다음 명령 실행:

```cmd
cd c:\Users\gkstm\manufacturing-dashboard
set npm_config_offline=
npm install bcryptjs mysql2 @types/bcryptjs dotenv --save
npm run build
```

### 방법 3: 영구적으로 실행 정책 변경 (주의 필요)

PowerShell을 **관리자 권한으로 실행**한 후:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

이렇게 하면 현재 사용자에 대해서만 실행 정책이 변경됩니다.

## 참고

- `-Scope Process`: 현재 PowerShell 세션에서만 적용 (가장 안전)
- `-Scope CurrentUser`: 현재 사용자에게만 적용
- `-Scope LocalMachine`: 모든 사용자에게 적용 (관리자 권한 필요)

## 설치 후 확인

패키지가 제대로 설치되었는지 확인:

```powershell
Test-Path node_modules\bcryptjs
Test-Path node_modules\mysql2
```

둘 다 `True`를 반환해야 합니다.
