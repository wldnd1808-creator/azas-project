#!/bin/bash
# Cloudflare Quick Tunnel로 HTTPS 주소 발급
# 사용법: ./scripts/start-https-tunnel.sh
# (Next.js는 이미 3000 포트에서 실행 중이어야 함)

set -e
PORT="${PORT:-3000}"

if ! command -v cloudflared &>/dev/null; then
  echo "cloudflared가 설치되어 있지 않습니다."
  echo "Ubuntu/Debian: curl -L -o cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb && sudo dpkg -i cloudflared.deb"
  echo "자세한 내용: docs/HTTPS_SETUP.md"
  exit 1
fi

echo "로컬 http://localhost:${PORT} 을 HTTPS로 터널링합니다..."
echo "아래에 나오는 https://xxxx.trycloudflare.com 주소로 접속하면 됩니다."
echo ""
cloudflared tunnel --url "http://localhost:${PORT}"
