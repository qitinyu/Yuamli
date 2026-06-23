# Yuamli 留言系统 — 部署与操作文档

> **版本**: V-1.0.0
> **作者**: [你的名字/GitHub 用户名]
> **许可**: [MIT / 自定义许可]
> **简介**: 基于 Next.js 16 的轻量级留言/评论系统，支持 GitHub OAuth 登录、无限制嵌套回复、Markdown 语法、后台管理、JSON 文件存储。

---

## 目录

- [功能特性](#功能特性)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [GitHub 仓库上传指南](#github-仓库上传指南)
- [环境变量配置](#环境变量配置)
- [本地开发](#本地开发)
- [部署到 Cloudflare Pages](#部署到-cloudflare-pages)
- [配置说明](#配置说明)
- [后台管理](#后台管理)
- [API 接口文档](#api-接口文档)
- [常见问题](#常见问题)
- [更新日志](#更新日志)

---

## 功能特性

- **用户系统**: QQ 号注册登录（主）、邮箱注册（辅）、GitHub OAuth 第三方登录
- **评论系统**: 无限制嵌套回复、Markdown 语法支持、评论折叠/展开
- **管理后台**: 密码保护、留言批量管理（删除/置顶/精华）、用户管理、邮箱通知设置
- **安全性**: Cookie 会话、管理员独立会话、密码哈希
- **UI 设计**: 响应式布局、shadcn/ui 组件库、深色模式支持
- **存储**: 纯 JSON 文件存储，无需数据库

---

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Next.js | 16 (App Router) | 全栈框架 |
| React | 19 | UI 渲染 |
| TypeScript | 5 | 类型安全 |
| Tailwind CSS | 4 | 样式系统 |
| shadcn/ui | new-york | UI 组件库 |
| Zustand | 5 | 状态管理 |
| react-markdown | 10 | Markdown 渲染 |
| date-fns | 4 | 时间格式化 |

---

## 项目结构

```
yuamli/
├── src/                          # 源代码
│   ├── app/                      # Next.js App Router
│   │   ├── page.tsx              # 主页面
│   │   ├── layout.tsx            # 根布局
│   │   ├── globals.css           # 全局样式
│   │   └── api/                  # API 路由
│   │       ├── auth/
│   │       │   ├── login/        # 登录
│   │       │   ├── register/     # 注册
│   │       │   ├── session/      # 会话管理
│   │       │   └── github/       # GitHub OAuth
│   │       │       ├── route.ts          # Token 交换
│   │       │       └── callback/route.ts # 授权回调
│   │       ├── comments/
│   │       │   ├── route.ts      # 留言列表( GET ) / 新建( POST )
│   │       │   └── [id]/route.ts # 编辑( PUT ) / 删除( DELETE )
│   │       └── admin/
│   │           ├── route.ts      # 管理员登录/数据
│   │           ├── notify/route.ts    # 通知设置
│   │           └── comments/route.ts  # 批量留言管理
│   ├── components/
│   │   ├── comment-system/       # 留言系统组件
│   │   │   ├── AuthModal.tsx     # 登录/注册弹窗
│   │   │   ├── CommentForm.tsx   # 留言编辑器
│   │   │   ├── CommentItem.tsx   # 单条留言（递归渲染）
│   │   │   ├── CommentList.tsx   # 留言列表 + 折叠
│   │   │   └── AdminPanel.tsx    # 后台管理面板
│   │   └── ui/                   # shadcn/ui 基础组件
│   ├── lib/
│   │   ├── storage.ts            # JSON 文件读写
│   │   ├── auth.ts               # 会话/密码工具
│   │   └── utils.ts              # 通用工具
│   ├── store/
│   │   └── use-comment-store.ts  # Zustand 全局状态
│   └── hooks/                    # React Hooks
├── data/                         # JSON 数据文件
│   ├── comments.json             # 留言数据
│   ├── users.json                # 用户数据
│   └── config.json               # 站点配置
├── public/                       # 静态资源
│   ├── logo.svg
│   └── robots.txt
├── .env.example                  # 环境变量模板
├── .gitignore                    # Git 忽略规则
├── package.json                  # 项目依赖
├── next.config.ts                # Next.js 配置
├── tsconfig.json                 # TypeScript 配置
├── tailwind.config.ts            # Tailwind 配置
├── postcss.config.mjs            # PostCSS 配置
├── components.json               # shadcn/ui 配置
└── Caddyfile                     # Caddy 反向代理配置（可选）
```

---

## GitHub 仓库上传指南

### 需要上传的文件 ✅

| 文件/目录 | 说明 |
|-----------|------|
| `src/` | 所有源代码（含 UI 组件） |
| `data/` | JSON 数据文件（初始数据） |
| `public/` | 静态资源（logo、robots.txt） |
| `.env.example` | 环境变量模板（**不含密钥**） |
| `.gitignore` | Git 忽略规则 |
| `package.json` | 项目依赖声明 |
| `next.config.ts` | Next.js 框架配置 |
| `tsconfig.json` | TypeScript 配置 |
| `tailwind.config.ts` | Tailwind CSS 配置 |
| `postcss.config.mjs` | PostCSS 配置 |
| `components.json` | shadcn/ui 配置 |
| `Caddyfile` | 反向代理配置（可选） |

### 不要上传的文件 ❌

| 文件/目录 | 原因 |
|-----------|------|
| `.env` | **包含数据库路径等本地配置** |
| `.env.local` | **包含 GitHub OAuth 密钥等敏感信息** |
| `node_modules/` | 依赖包，体积 340MB+，`npm install` 会自动生成 |
| `.next/` | 构建缓存，每次 build 自动生成 |
| `bun.lock` / `pnpm-lock.yaml` | 只保留你使用的包管理器的锁文件 |
| `prisma/` | 未使用的 Prisma 配置 |
| `upload/` | 临时上传目录 |
| `scripts/` | 开发脚本（如有） |

### 上传步骤

```bash
# 1. 在项目根目录初始化 Git（如果还没有）
git init

# 2. 添加所有文件（.gitignore 会自动排除不需要的）
git add .

# 3. 查看将要提交的文件（确认没有 .env / node_modules）
git status

# 4. 提交
git commit -m "Yuamli V-1.0.0 初始版本"

# 5. 关联 GitHub 远程仓库（替换为你的仓库地址）
git remote add origin https://github.com/你的用户名/你的仓库名.git

# 6. 推送
git branch -M main
git push -u origin main
```

---

## 环境变量配置

复制 `.env.example` 为 `.env.local`，填入你的值：

```bash
cp .env.example .env.local
```

### 变量说明

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `NEXT_PUBLIC_GITHUB_CLIENT_ID` | 是 | GitHub OAuth App 的 Client ID（前端公开） |
| `GITHUB_CLIENT_ID` | 是 | 同上（后端使用） |
| `GITHUB_CLIENT_SECRET` | 是 | GitHub OAuth App 的 Client Secret（**保密**） |

### 如何获取 GitHub OAuth 凭据

1. 前往 [GitHub Developer Settings](https://github.com/settings/developers)
2. 点击 **New OAuth App**
3. 填写信息：
   - **Application name**: `Yuamli 留言系统`（可自定义）
   - **Homepage URL**: `http://localhost:3000`（本地）或 `https://你的域名`（生产）
   - **Authorization callback URL**: `http://localhost:3000/api/auth/github/callback`（本地）或 `https://你的域名/api/auth/github/callback`（生产）
4. 点击 **Register application**
5. 记录 **Client ID** 和 **Client Secret**

---

## 本地开发

```bash
# 1. 安装依赖
npm install
# 或 pnpm install / bun install

# 2. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入 GitHub OAuth 凭据

# 3. 启动开发服务器
npm run dev

# 4. 打开浏览器访问
# http://localhost:3000
```

### 构建生产版本

```bash
npm run build
npm start
```

---

## 部署到 Cloudflare Pages

### 前提条件

- GitHub 仓库已创建并推送代码
- Cloudflare 账户已注册

### 部署步骤

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Workers & Pages** → **Create**
3. 选择 **Pages** → **Connect to Git**
4. 选择你的 GitHub 仓库
5. 配置构建设置：
   - **Framework preset**: `Next.js`
   - **Build command**: `npm run build`
   - **Build output directory**: `.next`
6. 在 **Environment variables** 中添加：
   - `NEXT_PUBLIC_GITHUB_CLIENT_ID` = 你的 Client ID
   - `GITHUB_CLIENT_ID` = 你的 Client ID
   - `GITHUB_CLIENT_SECRET` = 你的 Client Secret
7. 点击 **Save and Deploy**

### 部署后注意事项

- 更新 GitHub OAuth App 的 **Authorization callback URL** 为你的 Cloudflare Pages 域名
- Cloudflare Pages 域名格式：`https://your-project.pages.dev`
- 回调 URL：`https://your-project.pages.dev/api/auth/github/callback`

---

## 配置说明

### 站点配置 (`data/config.json`)

```json
{
  "adminPassword": "g10hvh",
  "adminEmail": "",
  "notifyEnabled": false,
  "notifyTemplate": "您收到一条新留言：\n\n{author}：{content}\n\n时间：{time}",
  "siteName": "Yuamli"
}
```

| 字段 | 说明 |
|------|------|
| `adminPassword` | 管理员密码哈希（默认 `admin123` 的哈希值为 `g10hvh`） |
| `adminEmail` | 站长邮箱（用于接收通知） |
| `notifyEnabled` | 是否启用新留言邮件通知 |
| `notifyTemplate` | 通知邮件内容模板，支持变量：`{author}` 作者、`{content}` 内容、`{time}` 时间 |
| `siteName` | 站点名称 |

### 修改管理员密码

> ⚠️ 当前使用简单哈希，仅适合演示。生产环境建议使用 bcrypt 等安全哈希。

1. 在浏览器控制台计算新密码的哈希：
   ```javascript
   // 简单哈希函数（与后端一致）
   function simpleHash(str) {
     let hash = 0;
     for (let i = 0; i < str.length; i++) {
       const char = str.charCodeAt(i);
       hash = (hash << 5) - hash + char;
       hash |= 0;
     }
     return Math.abs(hash).toString(36);
   }
   simpleHash("你的新密码")
   ```
2. 将输出的哈希值填入 `data/config.json` 的 `adminPassword` 字段

---

## 后台管理

### 进入后台

点击页面右上角的 🛡️ 盾牌图标，输入管理密码（默认 `admin123`）。

### 功能说明

#### 邮箱通知

- 设置站长邮箱地址
- 开启/关闭新留言通知
- 编辑通知邮件内容模板（支持 `{author}`、`{content}`、`{time}` 变量）

#### 用户管理

- 查看所有注册用户列表
- 显示用户名、类型（游客/GitHub）、邮箱、注册时间

#### 留言批量管理

- 查看所有留言（含回复）
- 勾选留言后执行批量操作：
  - **批量置顶** / **取消置顶**
  - **批量设为精华** / **取消精华**
  - **批量删除**（会同时删除所有子回复）

---

## API 接口文档

### 认证相关

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/auth/register` | 注册（QQ 号必填，邮箱可选） |
| `POST` | `/api/auth/login` | 登录（支持 `remember` 字段，30天免登录） |
| `GET` | `/api/auth/session` | 获取当前会话 |
| `POST` | `/api/auth/session` | 退出登录 |
| `GET` | `/api/auth/github/callback` | GitHub OAuth 回调（服务端处理） |
| `POST` | `/api/auth/github` | GitHub Token 交换 |

### 留言相关

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/comments` | 获取留言树（递归嵌套） |
| `POST` | `/api/comments` | 发表留言/回复 |
| `PUT` | `/api/comments/[id]` | 编辑内容 / 置顶 / 精华 |
| `DELETE` | `/api/comments/[id]` | 删除留言及所有子回复 |

### 管理相关

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/admin` | 管理员登录 |
| `GET` | `/api/admin` | 获取用户列表 + 配置 |
| `DELETE` | `/api/admin` | 退出管理 |
| `POST` | `/api/admin/notify` | 保存通知设置 |
| `GET` | `/api/admin/comments` | 获取所有留言（管理用） |
| `POST` | `/api/admin/comments` | 批量操作（delete/pin/unpin/feature/unfeature） |

---

## 常见问题

### Q: GitHub 登录后没有显示已登录？

检查以下几点：
1. `.env.local` 中是否同时配置了 `NEXT_PUBLIC_GITHUB_CLIENT_ID`、`GITHUB_CLIENT_ID` 和 `GITHUB_CLIENT_SECRET`
2. GitHub OAuth App 的 **Authorization callback URL** 是否与实际部署域名一致
3. 环境变量是否在部署平台（如 Cloudflare Pages）中也配置了

### Q: 评论嵌套层级有限制吗？

无限制。系统使用递归树构建器，支持任意深度的嵌套回复。

### Q: 如何备份数据？

直接备份 `data/` 目录下的三个 JSON 文件即可：
- `comments.json` — 所有留言
- `users.json` — 所有用户
- `config.json` — 站点配置

### Q: 部署到 Cloudflare Pages 后 JSON 文件存储能用吗？

Cloudflare Pages 的构建产物是只读的。如果需要写入功能，需要：
- 使用 Cloudflare Workers + KV/D1 存储，或
- 使用外部数据库（如 Supabase、Turso），或
- 部署到支持写入的平台（如 VPS、Railway、Fly.io）

### Q: 默认管理员密码是什么？

`admin123`。请务必在生产环境中修改。

---

## 更新日志

### V-1.0.0 (2026-06-23)

- ✅ 初始版本发布
- ✅ QQ 号注册登录（主）、邮箱注册（辅）
- ✅ GitHub OAuth 第三方登录
- ✅ 无限制嵌套回复
- ✅ Markdown 语法支持
- ✅ 评论折叠/展开（首条留言默认展开）
- ✅ 后台管理：用户管理、留言批量管理（删除/置顶/精华）
- ✅ 邮箱通知设置 + 自定义邮件模板
- ✅ "记住我"登录（30天免登录）
- ✅ 响应式布局 + 深色模式

---

<!--

  TODO: 根据你的实际情况编辑以下内容

  - [ ] 修改作者信息（顶部）
  - [ ] 修改许可协议
  - [ ] 修改 GitHub OAuth 回调 URL 为你的实际域名
  - [ ] 修改默认管理员密码
  - [ ] 添加你的自定义域名（如有）
  - [ ] 补充你的部署平台信息
  - [ ] 添加截图/演示链接（如有）

-->