// PDF + Excel 파일 자동 감시 및 인덱싱 스크립트
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
// Google Generative AI는 백엔드로 전환되어 프론트엔드 스크립트에서는 사용하지 않음
// import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

// fetch polyfill for Node.js
if (typeof fetch === 'undefined') {
  global.fetch = (await import('node-fetch')).default;
}

const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');
const XLSX = require('xlsx');

// 지원하는 파일 확장자
const SUPPORTED_EXTENSIONS = ['.pdf', '.xlsx', '.xls'];

function isSupportedFile(filename) {
  const ext = path.extname(filename).toLowerCase();
  return SUPPORTED_EXTENSIONS.includes(ext);
}

/**
 * 엑셀 파일을 텍스트로 변환
 */
function excelToText(filePath) {
  const workbook = XLSX.readFile(filePath);
  const textParts = [];
  
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    
    if (data.length === 0) continue;
    
    textParts.push(`\n=== 시트: ${sheetName} ===\n`);
    
    const headers = data[0];
    if (headers && headers.length > 0) {
      textParts.push(`컬럼: ${headers.join(' | ')}\n`);
    }
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row.some(cell => cell !== '')) {
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

// Google Generative AI는 백엔드로 전환되어 프론트엔드 스크립트에서는 사용하지 않음
// const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
// if (!apiKey) {
//   console.error("GOOGLE_GENERATIVE_AI_API_KEY가 설정되지 않았습니다.");
//   process.exit(1);
// }
console.error("이 스크립트는 Google Generative AI를 사용하므로 현재 비활성화되었습니다. 백엔드 API를 사용하세요.");
process.exit(1);

const chromaPath = process.env.CHROMA_PATH || path.resolve(process.cwd(), ".chroma");
const collectionName = process.env.CHROMA_COLLECTION || "manufacturing_docs";
const docsDir = process.env.DOCS_DIR || path.resolve(process.cwd(), "documents");

function stableIdForChunk(filePath, chunkIndex) {
  const safe = filePath.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${safe}__chunk_${chunkIndex}`;
}

// 이미 인덱싱된 파일 추적
const indexedFiles = new Set();

async function indexDocFile(filePath) {
  // 이미 인덱싱 중이면 건너뛰기
  if (indexedFiles.has(filePath)) {
    return;
  }
  
  indexedFiles.add(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const typeLabel = ext === '.pdf' ? '📕 PDF' : '📗 Excel';
  
  try {
    console.log(`\n[인덱싱 시작] ${typeLabel} ${path.basename(filePath)}`);
    
    // API를 통해 인덱싱 시도 (개발 서버가 실행 중인 경우)
    // 5초 타임아웃으로 빠르게 실패하고 직접 인덱싱으로 폴백
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('http://localhost:3000/api/auto-index', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filePath }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`[✅ 완료] ${typeLabel} ${path.basename(filePath)} (${data.chunks}개 청크) - API 사용`);
        indexedFiles.delete(filePath);
        return;
      }
    } catch (apiError) {
      // API가 사용 불가능하면 직접 인덱싱
      if (apiError.name !== 'AbortError') {
        console.log(`[API 사용 불가] 직접 인덱싱 시도: ${path.basename(filePath)}`);
      }
    }
    
    // 직접 인덱싱 (API가 사용 불가능한 경우)
    const { SimpleVectorStore } = await import('../lib/simple-vector-store.js');
    const vectorStore = new SimpleVectorStore(chromaPath);
    await vectorStore.init();

    // Google Generative AI는 백엔드로 전환되어 사용하지 않음
    // const embeddings = new GoogleGenerativeAIEmbeddings({
    //   apiKey,
    //   modelName: 'models/gemini-embedding-001',
    // });
    throw new Error("이 스크립트는 비활성화되었습니다. 백엔드 API를 사용하세요.");

    let text = '';
    
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
      console.log(`[건너뜀] 텍스트가 없습니다: ${path.basename(filePath)}`);
      indexedFiles.delete(filePath);
      return;
    }

    const chunks = splitText(text, 1200, 200);
    const contents = chunks;
    const metadatas = chunks.map((_, idx) => ({ source: filePath, chunk: idx, fileType: ext }));
    const ids = chunks.map((_, idx) => stableIdForChunk(filePath, idx));

    const vectors = await embeddings.embedDocuments(contents);
    await vectorStore.add(ids, contents, metadatas, vectors);

    console.log(`[✅ 완료] ${typeLabel} ${path.basename(filePath)} (${chunks.length}개 청크)`);
  } catch (error) {
    console.error(`[❌ 오류] ${path.basename(filePath)}:`, error.message);
  } finally {
    indexedFiles.delete(filePath);
  }
}

async function watchDocuments() {
  console.log(`\n📁 문서 자동 인덱싱 시작`);
  console.log(`   지원 형식: PDF, Excel (xlsx, xls)`);
  console.log(`   감시 폴더: ${docsDir}`);
  console.log(`   벡터 저장소: ${chromaPath}\n`);

  // chokidar가 있으면 사용, 없으면 기본 fs.watch 사용
  let watcher;
  let useChokidar = false;
  
  try {
    const chokidar = await import('chokidar');
    watcher = chokidar.default.watch(docsDir, {
      ignored: /(^|[\/\\])\../, // 숨김 파일 무시
      persistent: true,
      ignoreInitial: false, // 초기 파일들도 처리
      awaitWriteFinish: {
        stabilityThreshold: 1000, // 파일이 1초간 변경되지 않으면 안정된 것으로 간주
        pollInterval: 100
      }
    });

    watcher.on('add', async (filePath) => {
      if (isSupportedFile(filePath)) {
        await indexDocFile(filePath);
      }
    });

    watcher.on('change', async (filePath) => {
      if (isSupportedFile(filePath)) {
        console.log(`\n[변경 감지] ${path.basename(filePath)} - 재인덱싱 중...`);
        indexedFiles.delete(filePath); // 재인덱싱을 위해 제거
        await indexDocFile(filePath);
      }
    });

    useChokidar = true;
    console.log('✅ chokidar를 사용한 파일 감시 활성화됨\n');
  } catch (e) {
    // chokidar가 없으면 기본 fs.watch 사용
    console.log('⚠️  chokidar가 설치되지 않았습니다. 기본 파일 감시를 사용합니다.');
    console.log('   더 나은 성능을 위해: npm install chokidar\n');
    
    try {
      // documents 폴더가 없으면 생성
      try {
        await fs.access(docsDir);
      } catch {
        await fs.mkdir(docsDir, { recursive: true });
        console.log(`📁 documents 폴더 생성: ${docsDir}\n`);
      }

      // 기본 fs.watch 사용 (Windows에서도 작동)
      const watcher = fs.watch(docsDir, { recursive: true }, async (eventType, filename) => {
        if (!filename) return;
        
        // Windows 경로 정규화
        const normalizedFilename = filename.toString().replace(/\\/g, '/');
        const filePath = path.resolve(docsDir, normalizedFilename);
        
        // 지원하는 파일만 처리
        if (!isSupportedFile(filePath)) return;
        
        // 짧은 지연 후 처리 (파일 쓰기 완료 대기)
        setTimeout(async () => {
          try {
            const stats = await fs.stat(filePath);
            if (stats.isFile()) {
              if (eventType === 'rename' || eventType === 'change') {
                // 새 파일 추가 또는 변경
                console.log(`\n[파일 감지] ${path.basename(filePath)} - 인덱싱 중...`);
                indexedFiles.delete(filePath); // 재인덱싱을 위해 제거
                await indexDocFile(filePath);
              }
            }
          } catch (err) {
            // 파일이 아직 생성 중이거나 삭제된 경우 무시
            if (err?.code !== 'ENOENT') {
              console.warn(`파일 처리 오류 (${path.basename(filePath)}):`, err?.message || err);
            }
          }
        }, 1000); // 1초로 증가하여 파일 쓰기 완료 대기
      });
      
      console.log('✅ 기본 파일 감시 활성화됨 (fs.watch 사용)\n');
      
      // 초기 인덱싱: 기존 문서 파일들 처리
      try {
        const files = await fs.readdir(docsDir, { withFileTypes: true });
        const docFiles = files
          .filter(file => file.isFile() && isSupportedFile(file.name))
          .map(file => path.join(docsDir, file.name));
        
        if (docFiles.length > 0) {
          const pdfCount = docFiles.filter(f => f.toLowerCase().endsWith('.pdf')).length;
          const excelCount = docFiles.length - pdfCount;
          console.log(`📄 기존 문서 ${docFiles.length}개 발견 (PDF: ${pdfCount}, Excel: ${excelCount}) - 인덱싱 시작...\n`);
          for (const filePath of docFiles) {
            await indexDocFile(filePath);
          }
          console.log(`\n✅ 초기 인덱싱 완료\n`);
        }
      } catch (err) {
        console.log('초기 파일 스캔 중 오류:', err.message);
      }
    } catch (watchError) {
      console.error('파일 감시 설정 실패:', watchError.message);
      process.exit(1);
    }
  }

  if (useChokidar) {
    // chokidar 사용 시 초기 인덱싱
    try {
      const files = await fs.readdir(docsDir, { withFileTypes: true });
      const docFiles = files
        .filter(file => file.isFile() && isSupportedFile(file.name))
        .map(file => path.join(docsDir, file.name));
      
      if (docFiles.length > 0) {
        const pdfCount = docFiles.filter(f => f.toLowerCase().endsWith('.pdf')).length;
        const excelCount = docFiles.length - pdfCount;
        console.log(`📄 기존 문서 ${docFiles.length}개 발견 (PDF: ${pdfCount}, Excel: ${excelCount}) - 인덱싱 시작...\n`);
        for (const filePath of docFiles) {
          await indexDocFile(filePath);
        }
        console.log(`\n✅ 초기 인덱싱 완료\n`);
      }
    } catch (err) {
      console.log('초기 파일 스캔 중 오류:', err.message);
    }
  }

  console.log('👀 파일 감시 중... (새 PDF/Excel 파일이 추가되면 자동으로 인덱싱됩니다)\n');

  // 프로세스 종료 시 정리
  process.on('SIGINT', () => {
    console.log('\n\n👋 파일 감시 종료');
    if (watcher && watcher.close) {
      watcher.close();
    }
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n\n👋 파일 감시 종료');
    if (watcher && watcher.close) {
      watcher.close();
    }
    process.exit(0);
  });
}

watchDocuments().catch((e) => {
  console.error('감시 스크립트 오류:', e);
  process.exit(1);
});
