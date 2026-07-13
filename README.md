## Yuamli

> 轻量级留言系统 —— 支持 GitHub OAuth 登录、游客注册登录、嵌套回复、Markdown 渲染、后台管理与数据备份

### 特性

- **双登录方式**：GitHub OAuth 授权登录 + 游客账号注册/登录（QQ 号 + 密码）
- **嵌套回复**：无限层级嵌套，递归树形渲染
- **Markdown 支持**：留言内容支持 Markdown 基础语法，支持实时预览
- **后台管理**：内置管理面板，支持留言批量管理（删除 / 置顶 / 精华）、用户管理
- **数据备份**：一键导出全部数据为 JSON，支持覆盖 / 合并两种导入模式
- **灵活存储**：本地开发使用 JSON 文件存储，部署到 Vercel 时自动切换至 Vercel KV（Redis REST API）
- **响应式 UI**：基于 shadcn/ui 组件库，适配移动端与桌面端

### 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Next.js 16 (App Router, Turbopack) |
| 前端 | React 19, TypeScript, Tailwind CSS 4 |
| UI | shadcn/ui (new-york) |
| 状态管理 | Zustand 5 |
| Markdown | react-markdown 10 |
| 存储 | 本地 JSON 文件 / Vercel KV (Redis REST API, 零 SDK) |
| 部署 | Vercel（推荐）/ 自建服务器 |

## 更新日志
### V-1.0.6 (2026-07-13) 

- **修复**: 后台密码无法在线修改
- **增加**: 后台统一回复/集中单独回复功能
- **增加**: 后台页脚编辑功能
- **增加**: 留言区自定义预设
- **增加**: 前后台热刷新
- 更多日志请在[管理后台](https://yuamli.yqamm.top/admin)查看

### 快速开始

```bash
# 1. 克隆仓库
git clone https://github.com/your-username/yuamli.git
cd yuamli

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local，填入 GitHub OAuth 凭据（参见下方说明）

# 4. 启动开发服务器
npm run dev
```

打开 http://localhost:3000 即可访问。首次访问时 `data/` 目录下会自动创建 JSON 数据文件。

### 环境变量

复制 `.env.example` 为 `.env.local`，按需填写：

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `NEXT_PUBLIC_GITHUB_CLIENT_ID` | 使用 GitHub 登录时必填 | GitHub OAuth App 的 Client ID（前端公开） |
| `GITHUB_CLIENT_ID` | 使用 GitHub 登录时必填 | 同上（后端使用） |
| `GITHUB_CLIENT_SECRET` | 使用 GitHub 登录时必填 | GitHub OAuth App 的 Client Secret（保密） |
| `KV_REST_API_URL` | 仅 Vercel 部署 | Vercel KV 连接地址，创建 KV 后自动注入，无需手动填写 |
| `KV_REST_API_TOKEN` | 仅 Vercel 部署 | Vercel KV 认证 Token，创建 KV 后自动注入，无需手动填写 |

> **注意**：`KV_REST_API_URL` 和 `KV_REST_API_TOKEN` 在 Vercel Storage 中创建 KV 实例后会自动注入到项目中，**不要手动在 Settings → Environment Variables 中添加这两个变量**。正确做法是在 Storage 标签页中创建 KV 并关联到当前项目。

#### GitHub OAuth 配置

1. 前往 [GitHub Developer Settings](https://github.com/settings/developers)
2. 点击 **New OAuth App**
3. 填写：
   - **Application name**：`Yuamli`（可自定义）
   - **Homepage URL**：`http://localhost:3000`（本地）或 `https://你的域名`（生产）
   - **Authorization callback URL**：`http://localhost:3000/api/auth/github/callback`（本地）或 `https://你的域名/api/auth/github/callback`（生产）
4. 记录 **Client ID** 和 **Client Secret**，填入 `.env.local`

### 部署

#### Vercel 部署（推荐）

1. 将代码推送到 GitHub 仓库
2. 在 [Vercel](https://vercel.com) 导入该仓库
3. 在 **Settings → Environment Variables** 中添加 GitHub OAuth 的三个变量
4. 在 **Storage** 标签中创建 **KV (Redis)** 实例，区域建议选 Singapore
5. 创建完成后 Vercel 会自动注入 `KV_REST_API_URL` 和 `KV_REST_API_TOKEN`
6. 更新 GitHub OAuth App 的 callback URL 为 Vercel 分配的域名
7. 重新部署生效

详细步骤请参阅 [整体操作流程.md](./整体操作流程.md)。

#### 自建服务器

1. `npm run build && npm start` 或使用 Caddy / Nginx 反向代理
2. 项目根目录附带了 `Caddyfile` 可直接使用
3. 数据存储在 `data/` 目录下的 JSON 文件中

### 项目结构

```
src/
├── app/
│   ├── page.tsx                    # 主页面
│   ├── layout.tsx                  # 根布局
│   ├── globals.css                 # 全局样式
│   └── api/
│       ├── auth/
│       │   ├── login/route.ts      # 游客登录
│       │   ├── register/route.ts   # 游客注册
│       │   ├── session/route.ts    # 会话查询 / 退出
│       │   └── github/
│       │       ├── route.ts        # GitHub Token 交换
│       │       └── callback/route.ts # GitHub OAuth 回调
│       ├── comments/
│       │   ├── route.ts            # 留言列表 / 新建留言
│       │   └── [id]/route.ts       # 编辑 / 删除单条留言
│       └── admin/
│           ├── route.ts            # 管理员认证 / 数据
│           ├── data/route.ts       # 数据导出 / 导入
│           ├── notify/route.ts     # 通知设置
│           └── comments/route.ts   # 批量留言管理
├── components/
│   ├── comment-system/             # 留言系统业务组件
│   └── ui/                         # shadcn/ui 基础组件
├── lib/
│   ├── adapter.ts                  # 存储适配器（JSON / KV 自动切换，零 SDK）
│   ├── auth.ts                     # 会话与密码工具
│   ├── storage.ts                  # 数据读写业务逻辑
│   └── utils.ts                    # 通用工具
├── store/
│   └── use-comment-store.ts        # Zustand 全局状态
└── hooks/                          # React Hooks
```

### 默认管理员密码

请在首次部署后通过后台面板修改默认密码。

### License

[MIT](./LICENSE) © 2026 YuQi