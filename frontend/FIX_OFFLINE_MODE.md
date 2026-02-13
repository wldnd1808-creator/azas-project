# npm 오프라인 모드 문제 해결

## 문제
환경 변수에서 `offline = true`가 설정되어 있어 npm이 오프라인 모드로 작동합니다.

## 해결 방법

### 방법 1: 환경 변수 직접 해제 (CMD 사용)

**명령 프롬프트(CMD)**를 열고:

```cmd
cd c:\Users\gkstm\manufacturing-dashboard
set npm_config_offline=
set npm_config_prefer_offline=
npm install bcryptjs mysql2 @types/bcryptjs dotenv --save
npm run build
```

### 방법 2: 시스템 환경 변수에서 제거

1. Windows 키 + R
2. `sysdm.cpl` 입력 후 Enter
3. "고급" 탭 → "환경 변수" 클릭
4. 사용자 변수 또는 시스템 변수에서 `npm_config_offline` 찾기
5. 삭제 또는 값을 `false`로 변경
6. **새로운 터미널**을 열고 다시 시도

### 방법 3: 사용자 .npmrc 파일 확인

사용자 홈 디렉토리의 `.npmrc` 파일 확인:
```
C:\Users\gkstm\.npmrc
```

이 파일에 `offline=true`가 있다면 삭제하거나 `offline=false`로 변경하세요.

### 방법 4: 임시 해결 (현재 세션만)

CMD에서:
```cmd
set npm_config_offline=
set npm_config_prefer_offline=
npm install bcryptjs mysql2 @types/bcryptjs dotenv --save
```

PowerShell에서:
```powershell
$env:npm_config_offline = $null
$env:npm_config_prefer_offline = $null
npm install bcryptjs mysql2 @types/bcryptjs dotenv --save
```

## 확인

설치가 완료되면 확인:
```cmd
dir node_modules\bcryptjs
dir node_modules\mysql2
```

둘 다 폴더가 존재해야 합니다.
