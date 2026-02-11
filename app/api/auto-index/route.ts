// PDF 자동 인덱싱 API 엔드포인트 (파일 감시용)
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { createRequire } from 'module';

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

// POST: 특정 파일 인덱싱
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
    const { GoogleGenerativeAIEmbeddings } = await import('@langchain/google-genai');
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

// GET: documents 폴더의 모든 PDF 파일 자동 인덱싱
export async function GET() {
  try {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GOOGLE_GENERATIVE_AI_API_KEY가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

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
        indexed: [],
      });
    }

    if (pdfFiles.length === 0) {
      return NextResponse.json({
        success: true,
        message: '인덱싱할 PDF 파일이 없습니다.',
        indexed: [],
      });
    }

    // 벡터 저장소 초기화
    const { SimpleVectorStore } = await import('@/lib/simple-vector-store');
    const vectorStore = new SimpleVectorStore(chromaPath);
    await vectorStore.init();

    // Embeddings
    const { GoogleGenerativeAIEmbeddings } = await import('@langchain/google-genai');
    const embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey,
      modelName: 'models/gemini-embedding-001',
    });

    const indexed: Array<{ file: string; chunks: number }> = [];
    const errors: Array<{ file: string; error: string }> = [];

    // 각 PDF 파일 인덱싱
    for (const filePath of pdfFiles) {
      try {
        const buf = await fs.readFile(filePath);
        const parser = new PDFParse({ data: buf });
        const parsed = await parser.getText();
        const text = (parsed.text || '').replace(/\u0000/g, '').trim();
        
        if (!text) {
          errors.push({ file: path.basename(filePath), error: '텍스트가 없습니다' });
          continue;
        }

        const chunks = splitText(text, 1200, 200);
        const contents = chunks;
        const metadatas = chunks.map((_, idx) => ({ source: filePath, chunk: idx }));
        const ids = chunks.map((_, idx) => stableIdForChunk(filePath, idx));

        const vectors = await embeddings.embedDocuments(contents);
        await vectorStore.add(ids, contents, metadatas, vectors);

        indexed.push({ file: path.basename(filePath), chunks: chunks.length });
      } catch (error: any) {
        errors.push({ file: path.basename(filePath), error: error.message || error.toString() });
      }
    }

    return NextResponse.json({
      success: true,
      message: `${indexed.length}개 파일 인덱싱 완료`,
      indexed,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('자동 인덱싱 오류:', error);
    return NextResponse.json(
      { error: `인덱싱 실패: ${error.message || error.toString()}` },
      { status: 500 }
    );
  }
}
