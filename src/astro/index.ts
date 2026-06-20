/* ============================================================
   Yuamli Astro 集成
   ============================================================
   在 astro.config.mjs 中引入后，自动注册 API 路由和提供组件
   ============================================================ */
import type { AstroIntegration } from 'astro';

export interface YuamliOptions {
  /** 后端 API 地址（独立部署时填写） */
  serverUrl?: string;
  /** GitHub OAuth Client ID */
  githubClientId: string;
  /** GitHub OAuth Client Secret */
  githubClientSecret: string;
  /** GitHub OAuth 回调地址 */
  githubCallbackUrl: string;
  /** 站长管理密码 */
  adminPassword: string;
  /** JWT 密钥 */
  jwtSecret?: string;
  /** 数据存储目录 */
  dataDir?: string;
  /** 服务端口（独立运行模式） */
  port?: number;
}

export default function yuamliIntegration(options: YuamliOptions): AstroIntegration {
  return {
    name: 'yuamli',
    hooks: {
      'astro:config:setup'({ addServerMiddleware, updateConfig, config }) {
        // 如果使用 Astro SSR，添加服务端中间件
        if (config.output === 'server' || config.output === 'hybrid') {
          addServerMiddleware({
            entrypoint: 'yuamli/astro/middleware',
            order: 'pre',
          });
        }

        // 传递配置给运行时
        updateConfig({
          vite: {
            define: {
              'import.meta.env.YUAMLI_SERVER_URL': JSON.stringify(options.serverUrl || ''),
              'import.meta.env.YUAMLI_OPTIONS': JSON.stringify(options),
            },
          },
        });
      },
    },
  };
}