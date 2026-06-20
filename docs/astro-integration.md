# Yuamli Astro 集成指南

本文档介绍如何将 Yuamli 评论系统集成到 [Astro](https://astro.build/) 博客项目中。Yuamli 提供两种部署模式，你可以根据实际需求选择合适的方案。

## 目录

- [集成概述](#集成概述)
- [方案 A：独立服务器模式（推荐）](#方案-a独立服务器模式推荐)
- [方案 B：SSR 中间件模式](#方案-bssr-中间件模式)
- [Nginx 反向代理配置](#nginx-反向代理配置)
- [部署建议](#部署建议)
- [完整示例](#完整示例)
- [config.ts 全局配置说明](#configts-全局配置说明)

---

## 集成概述

Yuamli 与 Astro 的集成有两种部署模式，各有优劣：

### 方案 A：独立服务器模式（推荐）

```
┌─────────────┐         ┌──────────────────┐
│  Astro 博客  │ ──API──▶│  Yuamli 服务     │
│  (前端页面)  │ ◀──JSON──│  (Express :3456) │
└─────────────┘         └──────────────────┘
```

- Yuamli 作为独立的 Node.js 进程运行
- Astro 博客通过前端 JS 直接调用 Yuamli API
- 构建产物（`yuamli.js` + `yuamli.css`）嵌入到 Astro 页面中
- **优点**：部署简单、互不影响、易于独立升级
- **适用场景**：大多数博客部署场景

### 方案 B：SSR 中间件模式

```
┌──────────────────────────────┐
│  Astro SSR 服务器             │
│  ┌────────────┐ ┌──────────┐ │
│  │ Astro 页面  │ │ Yuamli   │ │
│  │            │ │ 中间件    │ │
│  └────────────┘ └──────────┘ │
└──────────────────────────────┘
```

- Yuamli 的 API 路由作为 Astro SSR 中间件嵌入
- 通过 `yuamliIntegration()` 函数在 `astro.config.mjs` 中配置
- **优点**：单进程部署、无需单独管理端口
- **适用场景**：Astro SSR 部署、对部署简洁性要求较高的场景

---

## 方案 A：独立服务器模式（推荐）

### 第一步：部署 Yuamli 服务端

#### 1.1 克隆并配置

```bash
git clone https://github.com/your-username/yuamli.git
cd yuamli
npm install
```

#### 1.2 创建 .env 文件

```env
PORT=3456
ADMIN_PASSWORD=your-strong-admin-password
JWT_SECRET=your-random-jwt-secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=https://yourdomain.com/api/auth/github/callback
YUAMLI_FRONTEND_URL=https://yourblog.com
```

#### 1.3 启动服务

**开发环境**：

```bash
npm run dev
```

**生产环境**：

```bash
npm run build
npm start
```

启动后确认服务正常运行：

```bash
curl http://localhost:3456/api/health
# 返回: {"success":true,"message":"Yuamli is running"}
```

### 第二步：构建客户端产物

```bash
npm run build
```

构建完成后，在 `dist/client/` 目录下会生成两个文件：

```
dist/client/
├── yuamli.js    # 评论系统 JavaScript（IIFE 格式）
└── yuamli.css   # 评论系统样式
```

这两个文件可以直接嵌入到任意网页中使用。

### 第三步：在 Astro 博客中引入客户端文件

将构建产物复制到 Astro 项目的 `public` 目录下：

```bash
cp dist/client/yuamli.js /path/to/your-astro-blog/public/
cp dist/client/yuamli.css /path/to/your-astro-blog/public/
```

或者在 Astro 项目的布局文件中直接引用 Yuamli 服务的静态资源路径。

### 第四步：在 Astro 页面中初始化评论系统

在你的 Astro 布局或页面中，添加 CSS 和 JS 引用，并调用初始化方法：

```astro
---
// src/layouts/BlogPost.astro
const { title, slug } = Astro.props;
---

<html>
  <head>
    <meta charset="utf-8" />
    <title>{title}</title>
    <!-- 引入 Yuamli 样式 -->
    <link rel="stylesheet" href="/yuamli.css" />
  </head>
  <body>
    <article>
      <h1>{title}</h1>
      <slot />  <!-- 文章内容 -->
    </article>

    <!-- 评论区容器 -->
    <div id="yuamli-comments"></div>

    <!-- 引入 Yuamli 脚本并初始化 -->
    <script src="/yuamli.js"></script>
    <script define:vars={{ pageId: slug }}>
      Yuamli.init({
        pageId: pageId,
        server: 'http://localhost:3456',  // 生产环境改为实际域名
      });
    </script>
  </body>
</html>
```

### 第五步：为每篇博客文章动态设置 pageId

`pageId` 是区分不同页面评论的关键标识。在 Astro 博客中，通常使用文章的 `slug` 或 `id` 作为 `pageId`：

```astro
---
// src/pages/blog/[...slug].astro
import BlogPost from '../../layouts/BlogPost.astro';

export async function getStaticPaths() {
  const posts = await Astro.glob('../content/blog/*.md');
  return posts.map((post) => ({
    params: { slug: post.frontmatter.slug },
    props: { post },
  }));
}

const { post } = Astro.props;
const { Content } = await post.render();
---

<BlogPost title={post.frontmatter.title} slug={post.frontmatter.slug}>
  <Content />
</BlogPost>
```

如果你使用内容集合（Content Collections），可以这样获取 slug：

```astro
---
// src/pages/blog/[slug].astro
import { getCollection } from 'astro:content';

export async function getStaticPaths() {
  const posts = await getCollection('blog');
  return posts.map((post) => ({
    params: { slug: post.slug },
    props: { post },
  }));
}

const { post } = Astro.props;
const { Content } = await post.render();
---

<html>
  <head>
    <title>{post.data.title}</title>
    <link rel="stylesheet" href="/yuamli.css" />
  </head>
  <body>
    <article>
      <h1>{post.data.title}</h1>
      <Content />
    </article>

    <div id="yuamli-comments"></div>

    <script src="/yuamli.js"></script>
    <script define:vars={{ pageId: post.slug }}>
      Yuamli.init({
        pageId: pageId,
        server: 'https://comments.yourblog.com',  // Yuamli 服务地址
        themeColor: '#4f46e5',   // 可选：自定义主题色
        maxLength: 10000,        // 可选：最大评论长度
      });
    </script>
  </body>
</html>
```

### Yuamli.init() 参数说明

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `pageId` | string | 是 | — | 当前页面的唯一标识 |
| `server` | string | 否 | `""`（同源） | Yuamli 后端 API 地址 |
| `themeColor` | string | 否 | `#4f46e5` | 主题色（CSS 颜色值） |
| `maxLength` | number | 否 | `10000` | 评论最大字符数 |

---

## 方案 B：SSR 中间件模式

此模式将 Yuamli 的 API 路由嵌入到 Astro 的 SSR 服务器中，无需单独运行 Yuamli 进程。

### 前提条件

Astro 必须以 SSR 或 Hybrid 模式运行：

```javascript
// astro.config.mjs
export default defineConfig({
  output: 'server',  // 或 'hybrid'
});
```

### 第一步：安装依赖

```bash
npm install yuamli
```

### 第二步：配置 Astro 集成

在 `astro.config.mjs` 中引入 Yuamli 集成：

```javascript
// astro.config.mjs
import { defineConfig } from 'astro';
import yuamliIntegration from 'yuamli/astro';

export default defineConfig({
  output: 'server',
  integrations: [
    yuamliIntegration({
      // GitHub OAuth 配置
      githubClientId: process.env.GITHUB_CLIENT_ID,
      githubClientSecret: process.env.GITHUB_CLIENT_SECRET,
      githubCallbackUrl: 'https://yourblog.com/api/auth/github/callback',
      // 站长配置
      adminPassword: process.env.ADMIN_PASSWORD,
      jwtSecret: process.env.JWT_SECRET,
      // 可选配置
      dataDir: './data/yuamli',
      port: 3456,
      // 独立部署时的后端地址（中间件模式下通常不需要）
      // serverUrl: 'http://localhost:3456',
    }),
  ],
});
```

### 第三步：在页面中使用评论组件

在需要评论系统的 Astro 页面中引入评论组件：

```astro
---
// src/pages/blog/[slug].astro
import { CommentSystem } from 'yuamli/astro/components';

export async function getStaticPaths() {
  const posts = await getCollection('blog');
  return posts.map((post) => ({
    params: { slug: post.slug },
    props: { post },
  }));
}

const { post } = Astro.props;
const { Content } = await post.render();
---

<html>
  <head>
    <title>{post.data.title}</title>
  </head>
  <body>
    <article>
      <h1>{post.data.title}</h1>
      <Content />
    </article>

    <!-- 使用 Yuamli 评论组件 -->
    <CommentSystem
      pageId={post.slug}
      server=""
      themeColor="#4f46e5"
      client:load
    />
  </body>
</html>
```

> **注意**：中间件模式目前为实验性功能，推荐大多数场景使用方案 A（独立服务器模式）以获得更好的稳定性和灵活性。

---

## Nginx 反向代理配置

在生产环境中，通常使用 Nginx 作为反向代理，将 Astro 博客和 Yuamli API 统一代理到同一个域名下。

### 基础配置

```nginx
server {
    listen 443 ssl http2;
    server_name yourblog.com;

    # SSL 证书配置
    ssl_certificate     /path/to/your/fullchain.pem;
    ssl_certificate_key /path/to/your/privkey.pem;

    # Astro 静态站点
    location / {
        root /path/to/your-astro-blog/dist;
        try_files $uri $uri/ /404.html;
    }

    # Yuamli API 代理
    location /api/ {
        proxy_pass http://127.0.0.1:3456;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Yuamli 管理面板
    location /admin.html {
        proxy_pass http://127.0.0.1:3456;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        root /path/to/your-astro-blog/dist;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

### 子域名配置（可选）

如果你希望将评论系统部署在子域名下（如 `comments.yourblog.com`）：

```nginx
# 主站：Astro 博客
server {
    listen 443 ssl http2;
    server_name yourblog.com;

    ssl_certificate     /path/to/your/fullchain.pem;
    ssl_certificate_key /path/to/your/privkey.pem;

    root /path/to/your-astro-blog/dist;
    try_files $uri $uri/ /404.html;
}

# 评论系统：Yuamli API
server {
    listen 443 ssl http2;
    server_name comments.yourblog.com;

    ssl_certificate     /path/to/your/fullchain.pem;
    ssl_certificate_key /path/to/your/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3456;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

使用子域名时，Astro 页面中初始化评论系统的 `server` 参数需要对应修改：

```javascript
Yuamli.init({
  pageId: post.slug,
  server: 'https://comments.yourblog.com',
});
```

同时需要在 Yuamli 的 `.env` 中配置 CORS：

> Yuamli 默认已启用 CORS（`origin: true, credentials: true`），支持跨域请求。但如果遇到问题，请确认 Nginx 代理正确转发了 `Origin` 和 `Cookie` 头。

---

## 部署建议

### 使用 PM2 进程管理

推荐使用 [PM2](https://pm2.keymetrics.io/) 来管理 Yuamli 服务进程，实现自动重启和日志管理：

```bash
# 安装 PM2
npm install -g pm2

# 启动 Yuamli 服务
pm2 start npm --name "yuamli" -- start

# 查看运行状态
pm2 status

# 查看日志
pm2 logs yuamli

# 设置开机自启
pm2 save
pm2 startup
```

也可以创建 PM2 配置文件 `ecosystem.config.cjs`：

```javascript
module.exports = {
  apps: [
    {
      name: 'yuamli',
      script: 'npm',
      args: 'start',
      cwd: '/path/to/yuamli',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'production',
        PORT: 3456,
      },
    },
  ],
};
```

然后使用 `pm2 start ecosystem.config.cjs` 启动。

### 启用 HTTPS

生产环境强烈建议使用 HTTPS：

1. 使用 [Let's Encrypt](https://letsencrypt.org/) 免费获取 SSL 证书
2. 使用 [Certbot](https://certbot.eff.org/) 自动管理证书续期

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d yourblog.com -d comments.yourblog.com

# 自动续期（Certbot 会自动设置定时任务）
sudo certbot renew --dry-run
```

### CDN 加速静态资源

可以将 `yuamli.js` 和 `yuamli.css` 上传到 CDN，加速全球访问：

```astro
<!-- 使用 CDN 加速 -->
<link rel="stylesheet" href="https://cdn.yourblog.com/yuamli/v1.0.0/yuamli.css" />
<script src="https://cdn.yourblog.com/yuamli/v1.0.0/yuamli.js"></script>
```

### 定期备份数据

设置定时任务定期备份 `data/` 目录：

```bash
# 每天凌晨 3 点备份数据
0 3 * * * cp -r /path/to/yuamli/data /path/to/backup/yuamli-data-$(date +\%Y\%m\%d)
```

---

## 完整示例

以下是一个完整的 Astro 博客页面，展示了如何集成 Yuamli 评论系统：

### 项目结构

```
my-astro-blog/
├── astro.config.mjs
├── package.json
├── public/
│   ├── yuamli.js          # Yuamli 构建产物
│   └── yuamli.css         # Yuamli 样式
├── src/
│   ├── config/
│   │   └── yuamli.ts      # Yuamli 全局配置
│   ├── layouts/
│   │   └── BlogPost.astro # 博客文章布局
│   ├── components/
│   │   └── CommentSection.astro  # 评论区域组件
│   ├── content/
│   │   └── blog/
│   │       ├── hello-world.md
│   │       └── my-second-post.md
│   └── pages/
│       ├── index.astro
│       └── blog/
│           └── [slug].astro
└── tsconfig.json
```

### 全局配置文件

```typescript
// src/config/yuamli.ts

/**
 * Yuamli 评论系统全局配置
 *
 * 开发环境使用 localhost，生产环境使用实际域名
 */
export const YUAMLI_CONFIG = {
  /** 后端 API 地址 */
  get server() {
    return import.meta.env.PROD
      ? 'https://comments.yourblog.com'
      : 'http://localhost:3456';
  },

  /** 主题色 */
  themeColor: '#4f46e5',

  /** 评论最大长度 */
  maxLength: 10000,
};
```

### 评论区域组件

```astro
---
// src/components/CommentSection.astro
// 这是一个可复用的评论区域组件
// 只需传入 pageId 即可在任意页面使用

import { YUAMLI_CONFIG } from '../config/yuamli';

interface Props {
  pageId: string;
}

const { pageId } = Astro.props;
---

<section class="yuamli-section">
  <h2 class="yuamli-title">评论</h2>
  <div id="yuamli-comments"></div>

  <link rel="stylesheet" href="/yuamli.css" />
  <script src="/yuamli.js"></script>
  <script define:vars={{ pageId, server: YUAMLI_CONFIG.server, themeColor: YUAMLI_CONFIG.themeColor, maxLength: YUAMLI_CONFIG.maxLength }}>
    Yuamli.init({
      pageId: pageId,
      server: server,
      themeColor: themeColor,
      maxLength: maxLength,
    });
  </script>
</section>

<style>
  .yuamli-section {
    margin-top: 3rem;
    padding-top: 2rem;
    border-top: 1px solid #e5e7eb;
  }
  .yuamli-title {
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 1.5rem;
  }
</style>
```

### 博客文章布局

```astro
---
// src/layouts/BlogPost.astro
import CommentSection from '../components/CommentSection.astro';

interface Props {
  title: string;
  date: Date;
  slug: string;
}

const { title, date, slug } = Astro.props;

const formattedDate = date.toLocaleDateString('zh-CN', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});
---

<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{title} - 我的博客</title>
  </head>
  <body>
    <header>
      <nav>
        <a href="/">首页</a>
        <a href="/blog">博客</a>
      </nav>
    </header>

    <main>
      <article class="blog-post">
        <header>
          <h1>{title}</h1>
          <time datetime={date.toISOString()}>{formattedDate}</time>
        </header>

        <div class="content">
          <slot />
        </div>
      </article>

      <!-- 评论区 -->
      <CommentSection pageId={slug} />
    </main>

    <footer>
      <p>&copy; 2024 我的博客. Powered by Astro & Yuamli.</p>
    </footer>
  </body>
</html>

<style>
  body {
    font-family: system-ui, -apple-system, sans-serif;
    max-width: 48rem;
    margin: 0 auto;
    padding: 1rem;
    color: #1a1a1a;
    line-height: 1.8;
  }
  .blog-post {
    padding: 2rem 0;
  }
  .blog-post h1 {
    font-size: 2rem;
    margin-bottom: 0.5rem;
  }
  .blog-post time {
    color: #6b7280;
    font-size: 0.875rem;
  }
</style>
```

### 博客文章页面

```astro
---
// src/pages/blog/[slug].astro
import { getCollection } from 'astro:content';
import BlogPost from '../../layouts/BlogPost.astro';

export async function getStaticPaths() {
  const posts = await getCollection('blog');
  return posts.map((post) => ({
    params: { slug: post.slug },
    props: { post },
  }));
}

const { post } = Astro.props;
const { Content } = await post.render();
---

<BlogPost title={post.data.title} date={post.data.date} slug={post.slug}>
  <Content />
</BlogPost>
```

### 文章 Frontmatter 示例

```markdown
---
title: "使用 Yuamli 为 Astro 博客添加评论系统"
date: 2024-12-15
slug: "yuamli-astro-integration"
tags: ["Astro", "Yuamli", "评论系统"]
---

这是一篇关于 Yuamli 评论系统的文章...

<!-- 页面底部会自动渲染评论区域 -->
```

---

## config.ts 全局配置说明

在 Astro 项目中创建一个集中管理 Yuamli 配置的文件，可以方便地在不同环境（开发/生产）之间切换配置。

### 推荐配置结构

```typescript
// src/config/yuamli.ts

/**
 * Yuamli 评论系统全局配置
 *
 * 集中管理评论系统的所有配置项
 * 支持根据环境自动切换
 */

/** Yuamli 配置接口 */
interface YuamliConfig {
  /** 后端 API 基础地址 */
  server: string;
  /** 主题色 */
  themeColor: string;
  /** 评论最大字符数 */
  maxLength: number;
}

/**
 * 开发环境配置
 */
const development: YuamliConfig = {
  server: 'http://localhost:3456',
  themeColor: '#4f46e5',
  maxLength: 10000,
};

/**
 * 生产环境配置
 */
const production: YuamliConfig = {
  server: 'https://comments.yourblog.com',
  themeColor: '#4f46e5',
  maxLength: 10000,
};

/**
 * 导出当前环境的配置
 *
 * Astro 在构建时会根据 mode 自动设置 import.meta.env.PROD
 * - `npm run dev`  → PROD = false → 使用 development 配置
 * - `npm run build` → PROD = true  → 使用 production 配置
 */
export const YUAMLI_CONFIG: YuamliConfig = import.meta.env.PROD
  ? production
  : development;

/**
 * 导出 pageId 生成策略
 *
 * 可根据你的需求自定义 pageId 的生成方式
 */
export function generatePageId(slug: string, category?: string): string {
  if (category) {
    return `${category}/${slug}`;
  }
  return slug;
}

/**
 * 导出初始化参数生成器
 *
 * 在 Astro 页面中调用此函数获取完整的初始化参数
 */
export function getYuamliInitOptions(pageId: string) {
  return {
    pageId,
    server: YUAMLI_CONFIG.server,
    themeColor: YUAMLI_CONFIG.themeColor,
    maxLength: YUAMLI_CONFIG.maxLength,
  };
}
```

### 在组件中使用全局配置

```astro
---
// src/components/CommentSection.astro
import { getYuamliInitOptions, generatePageId } from '../config/yuamli';

interface Props {
  slug: string;
  category?: string;
}

const { slug, category } = Astro.props;
const pageId = generatePageId(slug, category);
const initOptions = getYuamliInitOptions(pageId);
---

<section class="comments">
  <h2>评论</h2>
  <div id="yuamli-comments"></div>

  <link rel="stylesheet" href="/yuamli.css" />
  <script src="/yuamli.js"></script>
  <script define:vars={initOptions}>
    Yuamli.init(initOptions);
  </script>
</section>
```

### 环境变量增强（可选）

如果你希望通过环境变量进一步自定义配置，可以在 `src/config/yuamli.ts` 中读取环境变量：

```typescript
// src/config/yuamli.ts

interface YuamliConfig {
  server: string;
  themeColor: string;
  maxLength: number;
}

export const YUAMLI_CONFIG: YuamliConfig = {
  server: import.meta.env.YUAMLI_SERVER || (
    import.meta.env.PROD
      ? 'https://comments.yourblog.com'
      : 'http://localhost:3456'
  ),
  themeColor: import.meta.env.YUAMLI_THEME_COLOR || '#4f46e5',
  maxLength: parseInt(import.meta.env.YUAMLI_MAX_LENGTH || '10000', 10),
};
```

然后在 Astro 的 `.env` 文件中配置：

```env
# .env.production
YUAMLI_SERVER=https://comments.yourblog.com
YUAMLI_THEME_COLOR=#4f46e5
YUAMLI_MAX_LENGTH=10000
```

```env
# .env.development
YUAMLI_SERVER=http://localhost:3456
YUAMLI_THEME_COLOR=#4f46e5
YUAMLI_MAX_LENGTH=10000
```

同时在 `astro.config.mjs` 中声明这些变量：

```javascript
// astro.config.mjs
import { defineConfig } from 'astro';

export default defineConfig({
  vite: {
    define: {
      // 使这些环境变量在客户端脚本中可用
      'import.meta.env.YUAMLI_SERVER': JSON.stringify(process.env.YUAMLI_SERVER || ''),
      'import.meta.env.YUAMLI_THEME_COLOR': JSON.stringify(process.env.YUAMLI_THEME_COLOR || '#4f46e5'),
      'import.meta.env.YUAMLI_MAX_LENGTH': JSON.stringify(process.env.YUAMLI_MAX_LENGTH || '10000'),
    },
  },
});
```

> **提示**：这种方式的优点是配置完全通过环境变量管理，适合 CI/CD 流水线和多环境部署场景。缺点是需要额外在 Astro 配置中声明变量。对于大多数个人博客，直接使用 `import.meta.env.PROD` 判断环境已经足够。