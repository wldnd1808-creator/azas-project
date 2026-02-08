#!/bin/bash
# MariaDB root 비밀번호를 원격 접속(%, 3.34.166.82)에도 동일하게 설정
# 실행: sudo bash fix-mariadb-root-remote.sh

NEW_PASSWORD="${1:-AZAZPROJECT}"

echo "root 계정 비밀번호 설정: $NEW_PASSWORD"
sudo mysql << EOF
-- localhost (로컬 접속)
ALTER USER 'root'@'localhost' IDENTIFIED BY '$NEW_PASSWORD';

-- % (어떤 IP에서든 접속) - 있으면 변경, 없으면 생성
GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' IDENTIFIED BY '$NEW_PASSWORD' WITH GRANT OPTION;

FLUSH PRIVILEGES;
SELECT user, host FROM mysql.user WHERE user='root';
EOF
echo "완료. 앱 재시작 후 로그인 다시 시도하세요."
