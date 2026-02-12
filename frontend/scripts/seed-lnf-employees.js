/**
 * L&F 사원 샘플 데이터를 MariaDB users 테이블에 입력
 * - data/lnf-employees-sample.csv 사용
 * - 비밀번호 초기값: 1234 (bcrypt 해시)
 * - role: 관리자 → admin, 일반사원 → user
 *
 * 사용법: node scripts/seed-lnf-employees.js
 * (AUTH_DB_* 또는 DB_* 환경변수 사용, .env.local 로드)
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const DEFAULT_PASSWORD = '1234';

async function main() {
  const csvPath = path.join(__dirname, '..', 'data', 'lnf-employees-sample.csv');
  if (!fs.existsSync(csvPath)) {
    console.error('CSV 파일이 없습니다. 먼저 실행하세요: node scripts/generate-lnf-employees.mjs');
    process.exit(1);
  }

  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.trim().split('\n').slice(1); // 헤더 제외
  const records = lines.map((line) => {
    const [emp_id, name, role, dept] = line.split(',');
    return {
      emp_id: emp_id?.trim() || '',
      name: name?.trim() || '',
      role: role?.trim() === '관리자' ? 'admin' : 'user',
      dept: dept?.trim() || '',
    };
  }).filter((r) => r.emp_id);

  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  const useAuthDb =
    process.env.AUTH_DB_HOST != null || process.env.AUTH_DB_NAME != null;
  const dbName = useAuthDb ? (process.env.AUTH_DB_NAME || 'manufacturing_db') : (process.env.DB_NAME || 'manufacturing_db');
  const config = {
    host: useAuthDb ? (process.env.AUTH_DB_HOST || 'localhost') : (process.env.DB_HOST || 'localhost'),
    port: parseInt(
      useAuthDb ? (process.env.AUTH_DB_PORT || process.env.DB_PORT || '3306') : (process.env.DB_PORT || '3306'),
      10
    ),
    user: useAuthDb ? (process.env.AUTH_DB_USER || 'root') : (process.env.DB_USER || 'root'),
    password: useAuthDb ? (process.env.AUTH_DB_PASSWORD ?? '') : (process.env.DB_PASSWORD ?? ''),
  };

  // DB/테이블 없으면 생성
  let conn = await mysql.createConnection({ ...config });
  try {
    await conn.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    await conn.execute(`USE \`${dbName}\``);
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_number VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'user') DEFAULT 'user' NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_employee_number (employee_number)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } finally {
    await conn.end();
  }

  conn = await mysql.createConnection({ ...config, database: dbName });

  try {
    for (const r of records) {
      await conn.execute(
        `INSERT INTO users (employee_number, name, password, role)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), password=VALUES(password), role=VALUES(role)`,
        [r.emp_id, r.name, hashedPassword, r.role]
      );
    }
    console.log('✓ L&F 사원 데이터 시드 완료');
    console.log(`  - 총 ${records.length}명 처리`);
    console.log(`  - 초기 비밀번호: ${DEFAULT_PASSWORD}`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('오류:', err.message);
  process.exit(1);
});
