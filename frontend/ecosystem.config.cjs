/**
 * PM2로 백엔드(4000) 항상 실행
 * 사용법: frontend 폴더에서
 *   pm2 start ecosystem.config.cjs
 *   pm2 save && pm2 startup  # 재부팅 후에도 자동 실행
 */
const path = require('path');
const backendDir = path.resolve(__dirname, '..', 'backend', 'backend');
module.exports = {
  apps: [
    {
      name: 'backend-4000',
      cwd: backendDir,
      script: 'npx',
      args: 'tsx watch src/index.ts',
      interpreter: 'none',
      autorestart: true,
      watch: false,
      max_restarts: 10,
      env: { NODE_ENV: 'development' },
    },
  ],
};
