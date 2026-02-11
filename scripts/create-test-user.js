// 테스트 사용자 생성 스크립트
// 사용법: node scripts/create-test-user.js

const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function createTestUsers() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'manufacturing_db',
  });

  try {
    // 테스트 사용자 데이터
    const testUsers = [
      { employeeNumber: '0001', name: '관리자', password: '1234', role: 'admin' },
      { employeeNumber: '0002', name: '김철수', password: '1234', role: 'user' },
      { employeeNumber: '0003', name: '이영희', password: '1234', role: 'user' },
    ];

    for (const user of testUsers) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      
      await connection.execute(
        `INSERT INTO users (employee_number, name, password, role) 
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), password=VALUES(password), role=VALUES(role)`,
        [user.employeeNumber, user.name, hashedPassword, user.role]
      );
      
      console.log(`✓ 사용자 생성/업데이트: ${user.name} (${user.employeeNumber})`);
    }

    console.log('\n모든 테스트 사용자가 생성되었습니다.');
    console.log('로그인 정보:');
    console.log('  관리자: 사원번호 0001, 비밀번호 1234');
    console.log('  사원: 사원번호 0002 또는 0003, 비밀번호 1234');
  } catch (error) {
    console.error('오류 발생:', error);
  } finally {
    await connection.end();
  }
}

createTestUsers();
