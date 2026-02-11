# 텔레그램 알림 설정

## 1. 봇 토큰 발급
1. 텔레그램에서 [@BotFather](https://t.me/BotFather) 검색
2. `/newbot` 입력 후 봇 생성
3. 발급받은 **토큰** 복사 (예: `123456789:ABCdefGHI...`)

## 2. Chat ID 확인
1. 봇과 대화 시작
2. 브라우저에서 `https://api.telegram.org/bot<토큰>/getUpdates` 접속
3. 응답의 `message.chat.id` 값 복사

## 3. .env.local 설정
`manufacturing-dashboard` 폴더에 `.env.local` 파일 생성:

```
TELEGRAM_BOT_TOKEN=발급받은_토큰
TELEGRAM_CHAT_ID=채팅_ID
```

※ 설정하지 않으면 텔레그램 전송은 건너뛰고, 습도 시뮬레이션만 동작합니다.
