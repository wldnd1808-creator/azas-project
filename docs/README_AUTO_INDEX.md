# PDF 자동 인덱싱 시스템 사용 가이드

## 개요

이 시스템은 `documents` 폴더에 PDF 파일을 추가하면 자동으로 LangChain을 사용하여 청킹하고, 임베딩하여 ChromaDB(SimpleVectorStore)에 저장합니다. 이후 챗봇이 해당 문서를 참고하여 답변할 수 있습니다.

## 사용 방법

### 방법 1: 자동 감지와 개발 서버 함께 실행 (권장)

```bash
npm run dev:watch
```

이 명령은 다음을 자동으로 수행합니다:
1. 기존 PDF 파일 인덱싱
2. Next.js 개발 서버 시작
3. PDF 파일 자동 감시 시작

### 방법 2: 수동 인덱싱

```bash
npm run index:docs
```

모든 PDF 파일을 수동으로 인덱싱합니다.

### 방법 3: API를 통한 인덱싱

개발 서버가 실행 중일 때:

```bash
# 모든 PDF 파일 자동 인덱싱
curl http://localhost:3000/api/auto-index

# 특정 파일 인덱싱
curl -X POST http://localhost:3000/api/auto-index \
  -H "Content-Type: application/json" \
  -d '{"filePath": "C:\\Users\\gkstm\\manufacturing-dashboard\\documents\\파일명.pdf"}'
```

## 작동 방식

1. **파일 감시**: `documents` 폴더를 감시하여 새 PDF 파일 추가를 감지
2. **자동 인덱싱**: 새 파일이 감지되면 자동으로 인덱싱 시작
3. **청킹**: PDF 텍스트를 1200자 단위로 분할 (200자 오버랩)
4. **임베딩**: Google Gemini Embedding API를 사용하여 벡터 생성
5. **저장**: SimpleVectorStore에 벡터 저장
6. **RAG**: 챗봇 질문 시 관련 문서 검색 및 답변 생성

## 파일 구조

- `documents/`: PDF 파일 저장 폴더
- `.chroma/`: 벡터 저장소 (자동 생성)
- `scripts/watch-docs.mjs`: 파일 감시 스크립트
- `scripts/index-docs.mjs`: 수동 인덱싱 스크립트
- `app/api/auto-index/route.ts`: API 인덱싱 엔드포인트

## 문제 해결

### 새 PDF 파일이 인덱싱되지 않는 경우

1. 파일 감시 스크립트가 실행 중인지 확인
2. `npm run dev:watch`로 재시작
3. 수동으로 인덱싱: `npm run index:docs`

### 챗봇이 문서를 찾지 못하는 경우

1. 인덱싱이 완료되었는지 확인
2. `.chroma/vectors.json` 파일 확인
3. 챗봇에 다시 질문 (인덱싱 후 약간의 지연 가능)

### 파일 감시가 작동하지 않는 경우

Windows에서 `fs.watch`가 불안정할 수 있습니다. 더 안정적인 감시를 위해:

```bash
npm install chokidar --save-dev
```

그 후 `npm run dev:watch` 재시작

## 참고

- PDF 파일은 텍스트가 추출 가능해야 합니다 (이미지만 있는 PDF는 인덱싱 불가)
- 인덱싱은 파일이 완전히 복사된 후에 시작됩니다 (약 1초 지연)
- 같은 파일을 여러 번 인덱싱하면 기존 데이터가 업데이트됩니다
