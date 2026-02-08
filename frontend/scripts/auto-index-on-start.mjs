// 개발 서버 시작 시 자동으로 PDF 인덱싱을 실행하는 스크립트
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function checkAndIndex() {
  const docsDir = process.env.DOCS_DIR || path.resolve(process.cwd(), 'documents');
  
  try {
    // documents 폴더 확인
    await fs.access(docsDir);
    
    // PDF 파일 확인
    const files = await fs.readdir(docsDir, { withFileTypes: true });
    const pdfFiles = files.filter(file => 
      file.isFile() && file.name.toLowerCase().endsWith('.pdf')
    );
    
    if (pdfFiles.length > 0) {
      console.log(`\n📄 PDF 파일 ${pdfFiles.length}개 발견 - 자동 인덱싱 시작...\n`);
      
      // 인덱싱 스크립트 실행
      const indexProcess = spawn('npm', ['run', 'index:docs'], {
        stdio: 'inherit',
        shell: true,
        cwd: process.cwd()
      });
      
      indexProcess.on('exit', (code) => {
        if (code === 0) {
          console.log('\n✅ 자동 인덱싱 완료\n');
        } else {
          console.log(`\n⚠️  인덱싱 중 오류 발생 (코드: ${code})\n`);
        }
      });
      
      indexProcess.on('error', (err) => {
        console.error('인덱싱 스크립트 실행 오류:', err);
      });
    } else {
      console.log('\n📁 PDF 파일이 없습니다. documents 폴더에 PDF를 추가하면 자동으로 인덱싱됩니다.\n');
    }
  } catch (e) {
    console.log(`\n⚠️  documents 폴더 확인 실패: ${e.message}\n`);
  }
}

// 즉시 실행
checkAndIndex();
