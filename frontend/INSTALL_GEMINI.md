# Gemini API 챗봇 설정 가이드

## 패키지 설치

npm 오프라인 모드 문제가 있는 경우, 다음 방법으로 패키지를 설치하세요:

### 방법 1: CMD 사용 (권장)

```cmd
cd c:\Users\gkstm\manufacturing-dashboard
set npm_config_offline=
npm install @google/generative-ai
```

### 방법 2: 환경 변수 해제 후 설치

PowerShell에서:
```powershell
$env:npm_config_offline = $null
cd c:\Users\gkstm\manufacturing-dashboard
npm install @google/generative-ai
```

## 환경 변수 확인

`.env.local` 파일에 다음이 포함되어 있는지 확인:

```env
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSyDLu4IBntIa6Z3P4uIXw5wuIcTsHvPB05U
```

## 기능

- Gemini API를 사용한 AI 챗봇
- MariaDB 사용자 정보를 참고하여 개인화된 답변 제공
- 대화 히스토리 유지 (최근 10개 메시지)
- 로딩 상태 표시

## 사용 방법

1. 챗봇 열기 버튼 클릭
2. 메시지 입력 후 전송
3. Gemini API가 사용자 정보를 참고하여 답변 생성

## 문제 해결

패키지 설치가 안 되는 경우:
1. 시스템 환경 변수에서 `npm_config_offline` 삭제
2. 새로운 터미널 열기
3. 위의 설치 명령 실행
