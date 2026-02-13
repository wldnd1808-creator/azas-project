# 로그인 오류 해결 가이드

## "로그인 중 오류가 발생했습니다." 에러 해결

이 에러는 여러 원인이 있을 수 있습니다. 다음을 확인하세요:

### 1. 데이터베이스 연결 확인

`.env.local` 파일이 올바르게 설정되어 있는지 확인:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password  # MariaDB 비밀번호 입력 필요
DB_NAME=manufacturing_db
```

**중요**: `DB_PASSWORD`가 비어있으면 MariaDB에 비밀번호가 설정되어 있는 경우 연결이 실패합니다.

### 2. MariaDB 서버 실행 확인

MariaDB/MySQL 서버가 실행 중인지 확인:

```cmd
# Windows 서비스 확인
sc query MySQL80
# 또는
sc query MariaDB
```

서비스가 실행 중이 아니면 시작:
```cmd
net start MySQL80
# 또는
net start MariaDB
```

### 3. 데이터베이스 및 테이블 생성

MariaDB에 접속하여 데이터베이스와 테이블이 있는지 확인:

```sql
-- 데이터베이스 확인
SHOW DATABASES LIKE 'manufacturing_db';

-- 테이블 확인
USE manufacturing_db;
SHOW TABLES LIKE 'users';

-- 사용자 확인
SELECT * FROM users;
```

### 4. 테스트 사용자 생성

데이터베이스에 사용자가 없으면 생성 스크립트 실행:

```cmd
cd c:\Users\gkstm\manufacturing-dashboard
node scripts/create-test-user.js
```

또는 수동으로 생성:

```sql
USE manufacturing_db;

-- 비밀번호 '1234'의 bcrypt 해시 생성 후 삽입
-- Node.js에서: const bcrypt = require('bcryptjs'); const hash = await bcrypt.hash('1234', 10);
INSERT INTO users (employee_number, name, password, role) VALUES
('0001', '관리자', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin'),
('0002', '김철수', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'user'),
('0003', '이영희', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'user');
```

### 5. 개발 서버 재시작

환경 변수 변경 후 개발 서버를 재시작하세요:

```cmd
# 개발 서버 중지 (Ctrl+C)
# 그 다음 다시 시작
npm run dev
```

### 6. 서버 콘솔 로그 확인

개발 서버 콘솔에서 실제 에러 메시지를 확인하세요. 에러 메시지가 더 자세히 표시됩니다.

### 7. 일반적인 문제들

#### 문제: "ECONNREFUSED" 에러
- **원인**: MariaDB 서버가 실행되지 않음
- **해결**: MariaDB 서버 시작

#### 문제: "Access denied" 에러
- **원인**: 잘못된 사용자명 또는 비밀번호
- **해결**: `.env.local`의 `DB_USER`와 `DB_PASSWORD` 확인

#### 문제: "Unknown database" 에러
- **원인**: 데이터베이스가 생성되지 않음
- **해결**: `database/schema.sql` 실행하여 데이터베이스 생성

#### 문제: "Table doesn't exist" 에러
- **원인**: `users` 테이블이 없음
- **해결**: `database/schema.sql` 실행하여 테이블 생성

### 8. 빠른 테스트

데이터베이스 연결 테스트:

```cmd
node -e "require('dotenv').config({path:'.env.local'}); const mysql=require('mysql2/promise'); mysql.createConnection({host:process.env.DB_HOST,port:process.env.DB_PORT,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME}).then(c=>{console.log('✓ 연결 성공');c.end()}).catch(e=>console.error('✗ 연결 실패:',e.message))"
```

## 로그인 정보

- **관리자**: 사원번호 `0001`, 비밀번호 `1234`
- **사원**: 사원번호 `0002` 또는 `0003`, 비밀번호 `1234`
