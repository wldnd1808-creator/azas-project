#!/bin/bash
# 백엔드(4000)만 실행. 별도 터미널에서 실행하거나 pm2로 띄울 때 사용.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/../../backend/backend" 2>/dev/null && pwd)"
if [ -z "$BACKEND_DIR" ] || [ ! -f "$BACKEND_DIR/package.json" ]; then
  echo "백엔드 폴더를 찾을 수 없습니다."
  exit 1
fi
cd "$BACKEND_DIR"
echo "백엔드 시작 (포트 4000): $BACKEND_DIR"
exec npm run dev
