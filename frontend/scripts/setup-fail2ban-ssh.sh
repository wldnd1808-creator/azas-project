#!/bin/bash
# Fail2ban 설치 및 SSH 보호 설정 (무차별 대입 공격 시 해당 IP 일시 차단)
# 사용법: bash setup-fail2ban-ssh.sh

set -e

echo "=== Fail2ban 설치 및 SSH jail 설정 ==="

# 1. 설치
sudo apt-get update
sudo apt-get install -y fail2ban

# 2. SSH 전용 설정 파일 생성 (기본 jail.local 덮어쓰지 않음)
sudo tee /etc/fail2ban/jail.d/sshd.local << 'EOF'
[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 5
findtime = 10m
bantime = 30m
EOF

# 3. 서비스 시작 및 활성화
sudo systemctl enable fail2ban
sudo systemctl restart fail2ban

# 4. 상태 확인
sleep 2
echo ""
echo "=== 적용된 jail 목록 ==="
sudo fail2ban-client status
echo ""
echo "=== sshd jail 상세 ==="
sudo fail2ban-client status sshd 2>/dev/null || true

echo ""
echo "설정 요약:"
echo "  - 10분 안에 5번 로그인 실패 → 해당 IP 30분 차단"
echo "  - 변경: /etc/fail2ban/jail.d/sshd.local 수정 후 sudo systemctl restart fail2ban"
echo "  - 차단 목록: sudo fail2ban-client status sshd"
echo "  - IP 차단 해제: sudo fail2ban-client set sshd unbanip <IP>"
