// 개발 서버와 파일 감시를 함께 시작하는 스크립트
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 개발 서버와 PDF 자동 인덱싱을 시작합니다...\n');

  // 먼저 기존 PDF 파일 인덱싱
  const indexProcess = spawn('npm', ['run', 'index:docs'], {
  stdio: 'inherit',
  shell: true,
  cwd: process.cwd()
});

indexProcess.on('exit', (code) => {
  if (code === 0) {
    console.log('\n✅ 초기 인덱싱 완료 - 개발 서버 시작 중...\n');
  }
  
  // Next.js 개발 서버 시작
  const nextDev = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true,
    cwd: process.cwd()
  });
  
  // 파일 감시 스크립트 시작
  const watchDocs = spawn('npm', ['run', 'watch:docs'], {
    stdio: 'inherit',
    shell: true,
    cwd: process.cwd()
  });
  
  // 프로세스 종료 처리
  const cleanup = () => {
    console.log('\n\n👋 모든 프로세스 종료 중...');
    nextDev.kill();
    watchDocs.kill();
    process.exit(0);
  };
  
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  
  // 프로세스 오류 처리
  nextDev.on('error', (err) => {
    console.error('Next.js 개발 서버 오류:', err);
    cleanup();
  });
  
  watchDocs.on('error', (err) => {
    console.error('파일 감시 스크립트 오류:', err);
  });
  
  nextDev.on('exit', (code) => {
    console.log(`\nNext.js 개발 서버 종료 (코드: ${code})`);
    cleanup();
  });
  
  watchDocs.on('exit', (code) => {
    console.log(`\n파일 감시 스크립트 종료 (코드: ${code})`);
  });
});

indexProcess.on('error', (err) => {
  console.error('인덱싱 스크립트 실행 오류:', err);
  // 오류가 나도 개발 서버는 시작
  const nextDev = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true,
    cwd: process.cwd()
  });
});

// 파일 감시 스크립트 시작
const watchDocs = spawn('node', ['scripts/watch-docs.mjs'], {
  stdio: 'inherit',
  shell: true,
  cwd: process.cwd()
});

// 프로세스 종료 처리
const cleanup = () => {
  console.log('\n\n👋 모든 프로세스 종료 중...');
  nextDev.kill();
  watchDocs.kill();
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// 프로세스 오류 처리
nextDev.on('error', (err) => {
  console.error('Next.js 개발 서버 오류:', err);
  cleanup();
});

watchDocs.on('error', (err) => {
  console.error('파일 감시 스크립트 오류:', err);
  // 파일 감시 실패해도 개발 서버는 계속 실행
});

nextDev.on('exit', (code) => {
  console.log(`\nNext.js 개발 서버 종료 (코드: ${code})`);
  cleanup();
});

watchDocs.on('exit', (code) => {
  console.log(`\n파일 감시 스크립트 종료 (코드: ${code})`);
  // 개발 서버는 계속 실행
});
