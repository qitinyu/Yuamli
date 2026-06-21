## Yuamli

> 轻量级博客评论系统 —— 支持 GitHub OAuth 授权登录、游客登录、Markdown 渲染、站长管理面板与邮件通知

### 特性

- **双登录方式**：GitHub OAuth 在线授权登录 + 游客账号注册/登录
- **Markdown 支持**：评论内容支持 Markdown 基础语法渲染
- **评论折叠**：每条评论可独立折叠/展开
- **站长管理**：内置管理面板，支持评论删除、置顶、批量操作
- **邮件通知**：SMTP 邮件通知，新评论自动提醒站长回复
- **JSON 存储**：无需数据库，数据以 JSON 文件保存
- **Astro 集成**：提供 Astro 框架集成方案，支持全局配置
- **TypeScript**：全栈 TypeScript 开发，类型安全

### 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Express.js, jsonwebtoken, bcryptjs, nodemailer |
| 前端 | Preact, marked |
| 存储 | JSON 文件 |
| 语言 | TypeScript |

### 项目结构

```
yuamli/
├── src/
│   ├── types/          # TypeScript 类型定义
│   ├── server/         # 后端（Express + API 路由）
│   ├── client/         # 前端（Preact 组件）
│   │   ├── components/ # UI 组件
│   │   ├── utils/      # API 客户端、Markdown 工具
│   │   └── styles/     # 样式表
│   └── astro/          # Astro 集成模块
├── docs/
│   ├── usage.md        # 系统使用文档
│   └── astro-integration.md  # Astro 集成指南
├── data/               # JSON 数据存储目录
├── .env.example        # 环境变量模板
└── package.json
```

### 快速开始

```bash
# 1. 克隆仓库
git clone https://github.com/your-username/yuamli.git
cd yuamli

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env，填入 GitHub OAuth 等配置

# 4. 启动开发服务器
npm run dev
```

服务启动后：
- 评论系统 API：`http://localhost:3456`
- 健康检查：`http://localhost:3456/api/health`

### 环境配置

在项目根目录创建 `.env` 文件，参考 `.env.example`：

```env
PORT=1234
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://localhost:3456/api/auth/github/callback
ADMIN_PASSWORD=your_admin_password
JWT_SECRET=your_jwt_secret
```

#### GitHub OAuth 配置

1. 访问 [GitHub Developer Settings](https://github.com/settings/developers)
2. 点击 "New OAuth App"
3. 填写：
   - **Application name**: Yuamli Comment System
   - **Homepage URL**: `http://localhost:1234`
   - **Authorization callback URL**: `http://localhost:1234/api/auth/github/callback`
   - **YUAMLI_FRONTEND_URL**:'http://localhost:3456'
4. 获取 `Client ID` 和 `Client Secret` 填入 `.env`


### 文档

- [系统使用文档](docs/usage.md) — 完整的功能说明、API 文档、配置指南
- [Astro 集成解决方案](docs/astro-integration.md) — 两种集成模式、部署方案、Nginx 配置

## License

MIT
