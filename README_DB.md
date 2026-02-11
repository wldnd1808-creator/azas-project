# MariaDB 데이터베이스 설정 가이드

## 1. 환경 변수 설정

`.env.local` 파일에 다음 정보를 입력하세요:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=manufacturing_db
```

## 2. 데이터베이스 및 테이블 생성

MariaDB에 접속하여 다음 SQL을 실행하세요:

```sql
CREATE DATABASE IF NOT EXISTS manufacturing_db;
USE manufacturing_db;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_number VARCHAR(50) UNIQUE NOT NULL COMMENT '사원번호',
  name VARCHAR(100) NOT NULL COMMENT '이름',
  password VARCHAR(255) NOT NULL COMMENT '비밀번호 (bcrypt 해시)',
  role ENUM('admin', 'user') DEFAULT 'user' NOT NULL COMMENT '역할: admin(관리자), user(사원)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_employee_number (employee_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 3. 테스트 사용자 생성

### 방법 1: 스크립트 사용 (권장)

```bash
npm install
node scripts/create-test-user.js
```

### 방법 2: 수동 생성

Node.js에서 bcryptjs를 사용하여 비밀번호를 해시한 후 데이터베이스에 삽입:

```javascript
const bcrypt = require('bcryptjs');
const hash = await bcrypt.hash('1234', 10);
// 생성된 hash 값을 데이터베이스에 저장
```

또는 SQL로 직접 삽입 (비밀번호: 1234):

```sql
-- 비밀번호 '1234'의 bcrypt 해시 (실제로는 스크립트로 생성 권장)
INSERT INTO users (employee_number, name, password, role) VALUES
('0001', '관리자', '$2a$10$rOzJqZqZqZqZqZqZqZqZqOqZqZqZqZqZqZqZqZqZqZqZqZqZqZ', 'admin'),
('0002', '김철수', '$2a$10$rOzJqZqZqZqZqZqZqZqZqOqZqZqZqZqZqZqZqZqZqZqZqZqZqZ', 'user'),
('0003', '이영희', '$2a$10$rOzJqZqZqZqZqZqZqZqZqOqZqZqZqZqZqZqZqZqZqZqZqZqZqZ', 'user');
```

## 4. 패키지 설치

```bash
npm install
```

필요한 패키지:
- `mysql2`: MariaDB/MySQL 연결
- `bcryptjs`: 비밀번호 해싱
- `dotenv`: 환경 변수 관리

## 5. 로그인 테스트

1. 개발 서버 실행: `npm run dev`
2. 로그인 버튼 클릭
3. 테스트 계정으로 로그인:
   - **관리자**: 사원번호 `0001`, 비밀번호 `1234` → 관리자 대시보드로 이동
   - **사원**: 사원번호 `0002` 또는 `0003`, 비밀번호 `1234` → 사원 페이지로 이동

## 역할별 페이지

- **관리자 (admin)**: `/` - 관리자 대시보드 (공지사항 작성/수정 가능)
- **사원 (user)**: `/employee` - 사원 전용 대시보드
