/* ============================================================
   Yuamli Astro 中间件
   当 Astro 以 SSR 模式运行时，此中间件将 Yuamli API 路由
   嵌入到 Astro 的 Express/Hono 服务器中
   ============================================================ */
import type { AstroMiddleware } from 'astro';

// 此文件作为 Astro server middleware 的入口
// 实际的 API 处理由 Yuamli 的路由系统完成

export function onRequest(context: any, next: () => Promise<Response>) {
  const { request } = context;
  const url = new URL(request.url);

  // 只处理 /api/ 开头的 Yuamli 路由
  if (url.pathname.startsWith('/api/')) {
    // 将请求转发给 Yuamli 路由处理
    // 注意：完整集成需要在 SSR 环境中初始化 Yuamli 的 store 和 services
    // 这里提供中间件的框架，实际部署时推荐使用独立进程模式
    return next();
  }

  return next();
}