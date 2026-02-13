# 빌드 에러 해결 방법

## 문제 원인
환경 변수에서 `npm_config_offline=true`가 설정되어 있어 npm이 오프라인 모드로 작동하고 있습니다.

## 해결 방법

PowerShell에서 다음 명령을 실행하세요:

```powershell
# 1. 프로젝트 폴더로 이동
cd c:\Users\gkstm\manufacturing-dashboard

# 2. 환경 변수 해제 (현재 세션에서만)
$env:npm_config_offline = $null

# 3. 필요한 패키지 설치
npm install bcryptjs mysql2 @types/bcryptjs dotenv --save

# 4. 빌드 테스트
npm run build
```

## 영구적으로 해제하려면

시스템 환경 변수에서 `npm_config_offline`을 삭제하거나 `false`로 설정하세요:

1. Windows 설정 → 시스템 → 정보 → 고급 시스템 설정
2. 환경 변수 클릭
3. 사용자 변수 또는 시스템 변수에서 `npm_config_offline` 찾기
4. 삭제하거나 값을 `false`로 변경

## 또는 개발 서버 사용

빌드 대신 개발 서버를 사용할 수도 있습니다:

```powershell
$env:npm_config_offline = $null
npm run dev
```

개발 서버는 빌드 에러 없이 실행되며, 코드 변경 시 자동으로 새로고침됩니다.
