import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
// Google Generative AI는 백엔드로 전환되어 프론트엔드 스크립트에서는 사용하지 않음
// import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
// SimpleVectorStore는 TypeScript이므로 동적 import 사용

const require = createRequire(import.meta.url);
// pdf-parse 2.4.5에서는 PDFParse 클래스 사용
const { PDFParse } = require('pdf-parse');
// xlsx for Excel files
const XLSX = require('xlsx');

// .env.local 파일 로드
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(process.cwd(), '.env.local');

try {
  const envContent = await fs.readFile(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        process.env[key.trim()] = value;
      }
    }
  });
} catch (e) {
  console.warn('.env.local 파일을 읽을 수 없습니다. 환경 변수를 직접 설정하세요.');
}

// 간단한 텍스트 분할 함수
function splitText(text, chunkSize = 1200, chunkOverlap = 200) {
  const chunks = [];
  let start = 0;
  
  while (start < text.length) {
    let end = start + chunkSize;
    
    // 문장 경계에서 자르기 시도
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

/**
 * PDF -> ChromaDB 인덱싱 스크립트
 *
 * 필요:
 * - Chroma 서버 실행 (기본: http://localhost:8000)
 *   예) docker run -p 8000:8000 chromadb/chroma
 *
 * 환경변수:
 * - GOOGLE_GENERATIVE_AI_API_KEY (필수)
 * - CHROMA_URL (기본: http://localhost:8000)
 * - CHROMA_COLLECTION (기본: manufacturing_docs)
 * - DOCS_DIR (기본: <repo>/docs)
 */

// Google Generative AI는 백엔드로 전환되어 프론트엔드 스크립트에서는 사용하지 않음
// const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
// if (!apiKey) {
//   console.error("GOOGLE_GENERATIVE_AI_API_KEY가 설정되지 않았습니다.");
//   process.exit(1);
// }
console.error("이 스크립트는 Google Generative AI를 사용하므로 현재 비활성화되었습니다. 백엔드 API를 사용하세요.");
process.exit(1);

// ChromaDB를 로컬 파일 기반으로 사용 (Docker 서버 불필요)
const chromaPath = process.env.CHROMA_PATH || path.resolve(process.cwd(), ".chroma");
const collectionName = process.env.CHROMA_COLLECTION || "manufacturing_docs";
const docsDir = process.env.DOCS_DIR || path.resolve(process.cwd(), "documents");

// 지원하는 파일 확장자
const SUPPORTED_EXTENSIONS = ['.pdf', '.xlsx', '.xls'];

function isSupportedFile(filename) {
  const ext = path.extname(filename).toLowerCase();
  return SUPPORTED_EXTENSIONS.includes(ext);
}

async function listDocFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const out = [];
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...(await listDocFiles(full)));
    else if (ent.isFile() && isSupportedFile(ent.name)) out.push(full);
  }
  return out;
}

/**
 * 엑셀 파일을 텍스트로 변환
 * 각 시트의 데이터를 구조화된 텍스트로 만듦
 */
function excelToText(filePath) {
  const workbook = XLSX.readFile(filePath);
  const textParts = [];
  
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    
    if (data.length === 0) continue;
    
    textParts.push(`\n=== 시트: ${sheetName} ===\n`);
    
    // 첫 행을 헤더로 사용
    const headers = data[0];
    if (headers && headers.length > 0) {
      textParts.push(`컬럼: ${headers.join(' | ')}\n`);
    }
    
    // 데이터 행들
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row.some(cell => cell !== '')) {
        // 헤더가 있으면 "헤더: 값" 형식으로
        if (headers && headers.length > 0) {
          const rowText = row.map((cell, idx) => {
            const header = headers[idx] || `Col${idx + 1}`;
            return `${header}: ${cell}`;
          }).filter(s => !s.endsWith(': ')).join(', ');
          if (rowText) textParts.push(`행${i}: ${rowText}\n`);
        } else {
          textParts.push(`행${i}: ${row.join(' | ')}\n`);
        }
      }
    }
  }
  
  return textParts.join('');
}

function stableIdForChunk(filePath, chunkIndex) {
  // Chroma ids는 유니크면 됨. 파일경로를 안전한 문자열로 만들고 chunkIndex를 붙임.
  const safe = filePath.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${safe}__chunk_${chunkIndex}`;
}

async function main() {
  console.log(`\n📄 문서 인덱싱 시작`);
  console.log(`   지원 형식: PDF, Excel (xlsx, xls)`);
  console.log(`   폴더: ${docsDir}`);
  console.log(`   벡터 저장소: ${chromaPath}\n`);
  
  // 간단한 파일 기반 벡터 저장소 사용 (서버 불필요)
  const { SimpleVectorStore } = await import('../lib/simple-vector-store.js');
  const vectorStore = new SimpleVectorStore(chromaPath);
  await vectorStore.init();

  // Embeddings (Gemini) - 백엔드로 전환되어 사용하지 않음
  // const embeddings = new GoogleGenerativeAIEmbeddings({
  //   apiKey,
  //   modelName: 'models/gemini-embedding-001', // 최신 임베딩 모델 사용
  // });
  throw new Error("이 스크립트는 비활성화되었습니다. 백엔드 API를 사용하세요.");

  // 문서 파일 목록 (PDF + Excel)
  let docFiles = [];
  try {
    docFiles = await listDocFiles(docsDir);
  } catch (e) {
    console.error(`DOCS_DIR를 읽을 수 없습니다: ${docsDir}`);
    console.error(e);
    process.exit(1);
  }

  if (docFiles.length === 0) {
    console.log(`문서가 없습니다: ${docsDir}`);
    return;
  }

  const pdfCount = docFiles.filter(f => f.toLowerCase().endsWith('.pdf')).length;
  const excelCount = docFiles.filter(f => /\.(xlsx|xls)$/i.test(f)).length;

  console.log(`Chroma (로컬): ${chromaPath}`);
  console.log(`Collection: ${collectionName}`);
  console.log(`문서 파일: ${docFiles.length}개 (PDF: ${pdfCount}, Excel: ${excelCount})\n`);

  for (const filePath of docFiles) {
    const ext = path.extname(filePath).toLowerCase();
    let text = '';

    try {
      if (ext === '.pdf') {
        // PDF 처리
        const buf = await fs.readFile(filePath);
        const parser = new PDFParse({ data: buf });
        const parsed = await parser.getText();
        text = (parsed.text || "").replace(/\u0000/g, "").trim();
      } else if (ext === '.xlsx' || ext === '.xls') {
        // Excel 처리
        text = excelToText(filePath);
      }

      if (!text) {
        console.log(`SKIP(empty): ${filePath}`);
        continue;
      }

      // 텍스트 분할
      const chunks = splitText(text, 1200, 200);
      const contents = chunks;
      const metadatas = chunks.map((_, idx) => ({ source: filePath, chunk: idx, fileType: ext }));
      const ids = chunks.map((_, idx) => stableIdForChunk(filePath, idx));

      // embed in batches
      const vectors = await embeddings.embedDocuments(contents);

      // 벡터 저장소에 추가
      await vectorStore.add(ids, contents, metadatas, vectors);

      const typeLabel = ext === '.pdf' ? '📕 PDF' : '📗 Excel';
      console.log(`✅ 인덱싱 완료: ${typeLabel} ${path.basename(filePath)} (${chunks.length}개 청크)`);
    } catch (err) {
      console.error(`❌ 오류 (${path.basename(filePath)}):`, err.message);
    }
  }

  console.log(`\n✅ 모든 문서 인덱싱 완료!`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

