import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from './config.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerDashboardSummary } from './routes/dashboard/summary.js';
import { registerDashboardAlerts } from './routes/dashboard/alerts.js';
import { registerDashboardRealtime } from './routes/dashboard/realtime.js';
import { registerDashboardCalendarMonth } from './routes/dashboard/calendar-month.js';
import { registerDashboardAnalytics } from './routes/dashboard/analytics.js';
import { registerDashboardLotStatus } from './routes/dashboard/lot-status.js';
import { registerDashboardLotDefectReport } from './routes/dashboard/lot-defect-report.js';
import { registerChatRoutes } from './routes/chat.js';

const app = Fastify({
  logger: true,
});

await app.register(cors, {
  origin: (origin, cb) => {
    // non-browser clients (curl, server-to-server)
    if (!origin) return cb(null, true);
    const allowed = new Set(
      config.corsOrigin
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    );
    // Vercel 도메인도 허용 (와일드카드 패턴 지원)
    const isVercelDomain = origin.includes('.vercel.app');
    const isAllowed = allowed.has(origin) || isVercelDomain;
    cb(null, isAllowed);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

app.get('/health', async () => ({ ok: true }));

await registerAuthRoutes(app);
await registerDashboardSummary(app);
await registerDashboardAlerts(app);
await registerDashboardRealtime(app);
await registerDashboardCalendarMonth(app);
await registerDashboardAnalytics(app);
await registerDashboardLotStatus(app);
await registerDashboardLotDefectReport(app);
await registerChatRoutes(app);

await app.listen({ port: config.port, host: '0.0.0.0' });

