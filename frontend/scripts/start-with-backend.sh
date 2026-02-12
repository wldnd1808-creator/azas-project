#!/bin/bash
# 백엔드(4000) 먼저 띄운 뒤 프론트(3000) 실행. Ctrl+C 시 둘 다 종료.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/../../backend/backend" 2>/dev/null && pwd)"

if [ -z "$BACKEND_DIR" ] || [ ! -f "$BACKEND_DIR/package.json" ]; then
  echo "백엔드 폴더를 찾을 수 없습니다. 백엔드(4000)는 수동으로 실행해 주세요."
  cd "$FRONTEND_DIR" && exec npm run dev:only
  exit 0
fi

cleanup() {
  echo ""
  echo "종료 중... 백엔드(4000) 프로세스 정리"
  [ -n "$BACKEND_PID" ] && kill $BACKEND_PID 2>/dev/null
  exit 0
}
trap cleanup INT TERM

cd "$BACKEND_DIR"
echo "백엔드 시작 (포트 4000)..."
npm run dev &
BACKEND_PID=$!
sleep 3
if ! kill -0 $BACKEND_PID 2>/dev/null; then
  echo "백엔드 시작 실패. 프론트만 실행합니다."
  BACKEND_PID=""
fi

cd "$FRONTEND_DIR"
echo "프론트엔드 시작 (포트 3000)..."
exec npm run dev:only
