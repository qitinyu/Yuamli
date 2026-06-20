/* ============================================================
   Yuamli Express 服务器主入口
   ============================================================ */
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { JsonStore } from './storage.js';
import { AuthService } from './auth.js';
import { EmailService } from './email.js';
import { createRoutes } from './routes.js';

function env(key: string, fallback = ''): string {
  return process.env[key] || fallback;
}

export function createApp(config?: {
  port?: number;
  dataDir?: string;
  githubClientId?: string;
  githubClientSecret?: string;
  githubCallbackUrl?: string;
  adminPassword?: string;
  jwtSecret?: string;
  frontendUrl?: string;
}) {
  const app = express();

  const PORT = config?.port || parseInt(env('PORT', '3456'), 10);
  const DATA_DIR = config?.dataDir || env('DATA_DIR', './data');
  const GITHUB_CLIENT_ID = config?.githubClientId || env('GITHUB_CLIENT_ID', '');
  const GITHUB_CLIENT_SECRET = config?.githubClientSecret || env('GITHUB_CLIENT_SECRET', '');
  const GITHUB_CALLBACK_URL = config?.githubCallbackUrl || env('GITHUB_CALLBACK_URL', `http://localhost:${PORT}/api/auth/github/callback`);
  const ADMIN_PASSWORD = config?.adminPassword || env('ADMIN_PASSWORD', 'yuamli-admin-123');
  const JWT_SECRET = config?.jwtSecret || env('JWT_SECRET', 'yuamli-default-secret');
  const FRONTEND_URL = config?.frontendUrl || env('YUAMLI_FRONTEND_URL', '/');

  process.env.YUAMLI_FRONTEND_URL = FRONTEND_URL;

  // 初始化存储
  const store = new JsonStore(DATA_DIR);

  // 初始化服务
  const authService = new AuthService(store, {
    jwtSecret: JWT_SECRET,
    githubClientId: GITHUB_CLIENT_ID,
    githubClientSecret: GITHUB_CLIENT_SECRET,
    githubCallbackUrl: GITHUB_CALLBACK_URL,
    adminPassword: ADMIN_PASSWORD,
  });
  const emailService = new EmailService();

  // 中间件
  app.use(cors({
    origin: true,
    credentials: true,
  }));
  app.use(express.json());
  app.use(cookieParser());

  // 静态文件（构建后的前端资源）
  app.use(express.static('public'));

  // 可选认证中间件（所有路由都经过，有 token 则解析用户）
  app.use(authService.optionalAuth.bind(authService));

  // 注册路由
  app.use(createRoutes(store, authService, emailService));

  // 健康检查
  app.get('/api/health', (_req, res) => {
    res.json({ success: true, message: 'Yuamli is running' });
  });

  return { app, PORT, store };
}

/* 直接运行时启动服务器 */
const isMainModule = process.argv[1]?.endsWith('index.ts') || process.argv[1]?.endsWith('index.js');
if (isMainModule) {
  const { app, PORT } = createApp();
  app.listen(PORT, () => {
    console.log(`[Yuamli] 评论系统服务已启动: http://localhost:${PORT}`);
    console.log(`[Yuamli] 管理面板: http://localhost:${PORT}/admin.html`);
    console.log(`[Yuamli] API 健康检查: http://localhost:${PORT}/api/health`);
  });
}

export default createApp;