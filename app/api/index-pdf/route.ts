// PDF 수동 인덱싱 API 엔드포인트
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { createRequire } from 'module';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';

const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');

export const runtime = 'nodejs';

// 텍스트 분할 함수
function splitText(text: string, chunkSize = 1200, chunkOverlap = 200): string[] {
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    let end = start + chunkSize;
    
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf('.', end);
      const lastNewline = text.lastIndexOf('\n', end);
      const cutPoint = Math.max(lastPeriod, lastNewline);
      
      if (cutPoint > start + chunkSize * 0.5) {
        end = cutPoint + 1;
      }
    }
    
    chunks.push(text.slice(start, end).trim());
    start = end - chunkOverlap;
    
    if (start >= text.length) break;
  }
  
  return chunks;
}

function stableIdForChunk(filePath: string, chunkIndex: number): string {
  const safe = filePath.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${safe}__chunk_${chunkIndex}`;
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GOOGLE_GENERATIVE_AI_API_KEY가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    const { filePath } = await request.json();
    
    if (!filePath) {
      return NextResponse.json(
        { error: 'filePath가 필요합니다.' },
        { status: 400 }
      );
    }

    const chromaPath = process.env.CHROMA_PATH || path.resolve(process.cwd(), '.chroma');
    const docsDir = process.env.DOCS_DIR || path.resolve(process.cwd(), 'documents');
    
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(docsDir, filePath);
    
    // 파일 존재 확인
    try {
      await fs.access(fullPath);
    } catch {
      return NextResponse.json(
        { error: `파일을 찾을 수 없습니다: ${fullPath}` },
        { status: 404 }
      );
    }

    // PDF 파일인지 확인
    if (!fullPath.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'PDF 파일만 인덱싱할 수 있습니다.' },
        { status: 400 }
      );
    }

    // 벡터 저장소 초기화
    const { SimpleVectorStore } = await import('@/lib/simple-vector-store');
    const vectorStore = new SimpleVectorStore(chromaPath);
    await vectorStore.init();

    // Embeddings
    const embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey,
      modelName: 'models/gemini-embedding-001',
    });

    // PDF 읽기 및 파싱
    const buf = await fs.readFile(fullPath);
    const parser = new PDFParse({ data: buf });
    const parsed = await parser.getText();
    const text = (parsed.text || '').replace(/\u0000/g, '').trim();
    
    if (!text) {
      return NextResponse.json(
        { error: 'PDF에서 텍스트를 추출할 수 없습니다.' },
        { status: 400 }
      );
    }

    // 텍스트 분할
    const chunks = splitText(text, 1200, 200);
    const contents = chunks;
    const metadatas = chunks.map((_, idx) => ({ source: fullPath, chunk: idx }));
    const ids = chunks.map((_, idx) => stableIdForChunk(fullPath, idx));

    // 임베딩 생성 및 저장
    const vectors = await embeddings.embedDocuments(contents);
    await vectorStore.add(ids, contents, metadatas, vectors);

    return NextResponse.json({
      success: true,
      message: `인덱싱 완료: ${path.basename(fullPath)} (${chunks.length}개 청크)`,
      chunks: chunks.length,
    });
  } catch (error: any) {
    console.error('PDF 인덱싱 오류:', error);
    return NextResponse.json(
      { error: `인덱싱 실패: ${error.message || error.toString()}` },
      { status: 500 }
    );
  }
}

// GET: documents 폴더의 모든 PDF 파일 목록 및 인덱싱 상태 확인
export async function GET() {
  try {
    const docsDir = process.env.DOCS_DIR || path.resolve(process.cwd(), 'documents');
    const chromaPath = process.env.CHROMA_PATH || path.resolve(process.cwd(), '.chroma');
    
    // PDF 파일 목록 가져오기
    let pdfFiles: string[] = [];
    try {
      const files = await fs.readdir(docsDir, { withFileTypes: true });
      pdfFiles = files
        .filter(file => file.isFile() && file.name.toLowerCase().endsWith('.pdf'))
        .map(file => path.join(docsDir, file.name));
    } catch (e: any) {
      return NextResponse.json({
        error: `documents 폴더를 읽을 수 없습니다: ${e.message}`,
        files: [],
      });
    }

    // 인덱싱된 파일 확인
    let indexedFiles: Set<string> = new Set();
    try {
      const { SimpleVectorStore } = await import('@/lib/simple-vector-store');
      const vectorStore = new SimpleVectorStore(chromaPath);
      await vectorStore.init();
      
      // 벡터 저장소에서 모든 메타데이터 읽기
      const dataFile = path.join(chromaPath, 'vectors.json');
      try {
        const content = await fs.readFile(dataFile, 'utf-8');
        const data = JSON.parse(content);
        data.forEach((item: any) => {
          if (item.metadata?.source) {
            indexedFiles.add(item.metadata.source);
          }
        });
      } catch {
        // 파일이 없으면 빈 Set 유지
      }
    } catch (e) {
      console.warn('벡터 저장소 확인 실패:', e);
    }

    const fileStatus = pdfFiles.map(filePath => ({
      path: filePath,
      name: path.basename(filePath),
      indexed: indexedFiles.has(filePath),
    }));

    return NextResponse.json({
      success: true,
      files: fileStatus,
      total: pdfFiles.length,
      indexed: fileStatus.filter(f => f.indexed).length,
    });
  } catch (error: any) {
    console.error('파일 목록 조회 오류:', error);
    return NextResponse.json(
      { error: `조회 실패: ${error.message || error.toString()}` },
      { status: 500 }
    );
  }
}
