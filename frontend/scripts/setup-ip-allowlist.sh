#!/bin/bash
# Lightsail 등: 여러 컴퓨터가 쓰는 IP만 허용 (UFW)
# 사용: ALLOW_IPS="IP1 IP2 IP3" [ALLOW_MARIADB=1] ./setup-ip-allowlist.sh

set -e

# ========== 허용할 IP (공백 구분, 여러 컴퓨터에서 쓰는 IP 전부) ==========
# 예: ALLOW_IPS="123.45.67.89 98.76.54.32"
ALLOW_IPS="${ALLOW_IPS:-}"

# 3306(MariaDB)도 이 IP들만 허용할지 (원격 DB 접속 시 1, 같은 서버만 쓰면 0 또는 비움)
ALLOW_MARIADB="${ALLOW_MARIADB:-0}"

if [ -z "$ALLOW_IPS" ]; then
  echo "사용법:"
  echo "  ALLOW_IPS=\"사무실IP 집IP\" ./setup-ip-allowlist.sh"
  echo "  (MariaDB 원격 허용) ALLOW_IPS=\"1.2.3.4\" ALLOW_MARIADB=1 ./setup-ip-allowlist.sh"
  echo ""
  echo "허용할 IP 확인: 브라우저에서 '내 IP' 검색 또는 curl ifconfig.me"
  exit 1
fi

echo "허용할 IP: $ALLOW_IPS"
echo "MariaDB(3306) 허용: $([ "$ALLOW_MARIADB" = "1" ] && echo "예" || echo "아니오")"
read -p "위 IP만 허용하고 UFW를 켜겠습니다. 계속할까요? (y/N) " confirm
[[ "$confirm" != "y" && "$confirm" != "Y" ]] && exit 0

sudo ufw default deny incoming
sudo ufw default allow outgoing

for ip in $ALLOW_IPS; do
  sudo ufw allow from "$ip" to any port 22 comment "SSH $ip"
  sudo ufw allow from "$ip" to any port 80 comment "HTTP $ip"
  sudo ufw allow from "$ip" to any port 443 comment "HTTPS $ip"
  if [ "$ALLOW_MARIADB" = "1" ]; then
    sudo ufw allow from "$ip" to any port 3306 comment "MariaDB $ip"
  fi
done

sudo ufw allow from 127.0.0.1
sudo ufw allow from ::1

sudo ufw --force enable

echo ""
echo "적용된 규칙:"
sudo ufw status numbered
