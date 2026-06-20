# Yuamli 使用文档

## 目录

- [系统简介](#系统简介)
- [快速开始](#快速开始)
- [环境配置](#环境配置)
- [GitHub OAuth 配置](#github-oauth-配置)
- [评论系统使用](#评论系统使用)
- [站长管理面板](#站长管理面板)
- [邮件通知配置](#邮件通知配置)
- [API 接口文档](#api-接口文档)
- [数据存储说明](#数据存储说明)
- [常见问题](#常见问题)

---

## 系统简介

Yuamli 是一个轻量级博客评论系统，专为个人博客和中小型网站设计。它无需传统数据库，使用 JSON 文件存储数据，部署简单、配置灵活。

### 核心特性

| 特性 | 说明 |
|------|------|
| **JSON 文件存储** | 无需安装数据库，数据以 JSON 文件形式保存在本地 |
| **GitHub OAuth 登录** | 完整的 OAuth 授权流程，点击后跳转至 GitHub 进行授权 |
| **游客登录/注册** | 支持使用邮箱或 QQ 号注册和登录 |
| **Markdown 渲染** | 评论内容支持 Markdown 基本语法（加粗、斜体、代码、链接、列表、引用等） |
| **评论折叠/展开** | 长评论可手动折叠或展开，提升阅读体验 |
| **站长管理面板** | 密码保护的管理后台，支持删除、置顶、批量操作、筛选搜索 |
| **邮件通知** | 新评论时通过 SMTP 发送邮件通知站长，支持自定义邮件模板 |
| **Astro 集成** | 支持作为独立服务或 Astro SSR 中间件两种部署模式 |

### 技术栈

- **后端**：Express.js、bcryptjs、jsonwebtoken、marked、nodemailer、uuid
- **前端**：Preact、marked、自定义 CSS
- **存储**：JSON 文件（comments.json、users.json、sessions.json、admin-config.json）
- **默认端口**：3456

---

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/your-username/yuamli.git
cd yuamli
```

### 2. 安装依赖

```bash
npm install
```

> 要求 Node.js >= 18.0.0

### 3. 配置环境变量

在项目根目录创建 `.env` 文件：

```env
PORT=3456
ADMIN_PASSWORD=your-secure-password
JWT_SECRET=your-jwt-secret-key
```

### 4. 启动开发服务器

```bash
npm run dev
```

启动成功后会看到以下输出：

```
[Yuamli] 评论系统服务已启动: http://localhost:3456
[Yuamli] 管理面板: http://localhost:3456/admin.html
[Yuamli] API 健康检查: http://localhost:3456/api/health
```

### 5. 构建前端资源（生产部署）

```bash
npm run build
```

构建后会在 `dist/client/` 目录生成 `yuamli.js` 和 `yuamli.css`，可直接嵌入到任意网页中。

### 6. 生产环境启动

```bash
npm start
```

---

## 环境配置

Yuamli 通过 `.env` 文件或环境变量进行配置。以下为所有可配置项的详细说明：

| 变量名 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| `PORT` | 否 | `3456` | 服务监听端口 |
| `GITHUB_CLIENT_ID` | 否 | `""` | GitHub OAuth App 的 Client ID |
| `GITHUB_CLIENT_SECRET` | 否 | `""` | GitHub OAuth App 的 Client Secret |
| `GITHUB_CALLBACK_URL` | 否 | `http://localhost:3456/api/auth/github/callback` | GitHub OAuth 回调地址 |
| `ADMIN_PASSWORD` | 是 | `yuamli-admin-123` | 站长管理面板登录密码（**请务必修改**） |
| `JWT_SECRET` | 是 | `yuamli-default-secret` | JWT 签名密钥（**请务必修改**） |
| `ADMIN_EMAIL` | 否 | `""` | 站长接收通知的邮箱地址 |
| `SMTP_HOST` | 否 | `""` | SMTP 服务器地址 |
| `SMTP_PORT` | 否 | `""` | SMTP 服务器端口 |
| `SMTP_SECURE` | 否 | `""` | 是否使用 SSL/TLS（`true` / `false`） |
| `SMTP_USER` | 否 | `""` | SMTP 登录用户名（通常为邮箱地址） |
| `SMTP_PASS` | 否 | `""` | SMTP 登录密码或授权码 |
| `DATA_DIR` | 否 | `./data` | JSON 数据文件存储目录 |
| `YUAMLI_FRONTEND_URL` | 否 | `/` | GitHub OAuth 登录成功后的前端跳转地址 |

### 示例 .env 文件

```env
# 服务配置
PORT=3456
DATA_DIR=./data

# 站长配置（请修改为强密码）
ADMIN_PASSWORD=MyStr0ngP@ssw0rd!
JWT_SECRET=a-random-long-string-for-jwt-signing

# GitHub OAuth 配置
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=https://yourdomain.com/api/auth/github/callback

# 前端地址（OAuth 回调后跳转）
YUAMLI_FRONTEND_URL=https://yourblog.com

# 邮件通知配置（可选）
ADMIN_EMAIL=admin@yourblog.com
SMTP_HOST=smtp.qq.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your_email@qq.com
SMTP_PASS=your_smtp_authorization_code
```

---

## GitHub OAuth 配置

Yuamli 支持完整的 GitHub OAuth 授权登录流程：用户点击 GitHub 登录后，系统会跳转到 GitHub 进行授权，授权成功后自动回调和登录。

### 第一步：创建 GitHub OAuth App

1. 登录 GitHub，进入 **Settings** → **Developer settings** → **OAuth Apps**
2. 点击 **New OAuth App**
3. 填写应用信息：

   | 字段 | 填写内容 | 示例 |
   |------|----------|------|
   | **Application name** | 应用名称 | `My Blog Comments` |
   | **Homepage URL** | 博客首页地址 | `https://yourblog.com` |
   | **Authorization callback URL** | OAuth 回调地址 | `https://yourblog.com/api/auth/github/callback` |

4. 点击 **Register application**

### 第二步：获取 Client ID 和 Client Secret

1. 在创建好的 OAuth App 详情页中，复制 **Client ID**
2. 点击 **Generate a new client secret**，复制生成的 **Client Secret**

### 第三步：配置环境变量

将获取到的信息填入 `.env` 文件：

```env
GITHUB_CLIENT_ID=Ov23liAbCdEfGhIjKlMn
GITHUB_CLIENT_SECRET=1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t
GITHUB_CALLBACK_URL=https://yourblog.com/api/auth/github/callback
```

### 第四步：配置前端跳转地址

设置 `YUAMLI_FRONTEND_URL` 为你的博客前端地址，确保 OAuth 授权成功后能正确跳转回前端页面：

```env
YUAMLI_FRONTEND_URL=https://yourblog.com
```

> **注意**：如果使用 Nginx 反向代理，确保回调 URL 与实际访问地址一致。

---

## 评论系统使用

### 登录方式

评论系统右上角提供**登录按钮**，点击后会弹出一个浮动模态框，模态框顶部有 **登录** 和 **注册** 两个标签页：

#### GitHub 登录

1. 点击评论区的 **登录** 按钮
2. 在弹出的模态框中，点击 **GitHub 登录** 按钮
3. 系统自动跳转至 GitHub 授权页面
4. 在 GitHub 上点击 **Authorize** 授权
5. 授权成功后自动跳回博客页面并完成登录

#### 游客注册

1. 点击 **登录** 按钮，切换到 **注册** 标签页
2. 填写以下信息：
   - **账号**：输入邮箱或 QQ 号（输入框显示 "请输入邮箱/QQ号" 占位提示）
   - **密码**：设置登录密码
   - **昵称**：设置显示名称
3. 点击 **注册** 按钮完成注册（注册后自动登录）

#### 游客登录

1. 点击 **登录** 按钮，确保在 **登录** 标签页
2. 输入注册时使用的账号（邮箱/QQ号）和密码
3. 点击 **登录** 按钮

### 发表评论

1. 登录后，在评论输入框中输入评论内容
2. 支持 Markdown 语法（详见下方语法参考）
3. 评论内容最长 10000 个字符
4. 点击 **发送** 按钮发表评论

### 回复评论

在任意评论下方点击 **回复** 按钮，输入框会自动定位到该评论下方并显示回复目标。

### Markdown 语法支持

评论内容支持以下 Markdown 语法：

| 语法 | 效果 | 示例 |
|------|------|------|
| **加粗** | **粗体文字** | `**粗体文字**` |
| *斜体* | *斜体文字* | `*斜体文字*` |
| `行内代码` | `code` | `` `code` `` |
| 代码块 | 代码块 | ` ```js\ncode\n``` ` |
| [链接](url) | [链接](https://example.com) | `[链接](https://example.com)` |
| - 无序列表 | 列表项 | `- 列表项` |
| 1. 有序列表 | 列表项 | `1. 列表项` |
| > 引用 | 引用块 | `> 引用内容` |

### 评论折叠/展开

- 评论过长时，可以点击 **折叠** 按钮将评论内容收起
- 折叠后的评论会显示摘要内容，点击 **展开** 即可恢复完整内容
- 仅评论作者本人和站长可以操作折叠/展开

---

## 站长管理面板

### 访问管理面板

1. 在浏览器中访问 `http://localhost:3456/admin.html`（或你的部署域名 + `/admin.html`）
2. 输入站长密码（即 `.env` 中配置的 `ADMIN_PASSWORD`）
3. 点击 **登录** 进入管理面板

### 面板功能

#### 统计概览

管理面板首页展示以下统计数据：

- **评论总数**：系统中所有评论的数量
- **用户总数**：已注册用户数量
- **页面总数**：有评论的页面数量
- **最近评论**：最新 10 条评论列表

#### 评论管理

| 功能 | 说明 |
|------|------|
| **查看评论** | 分页浏览所有页面的评论，显示评论者、内容、时间 |
| **搜索评论** | 通过关键词搜索评论者昵称或评论内容 |
| **按页面筛选** | 选择特定 `pageId` 查看该页面的所有评论 |
| **删除评论** | 删除单条评论 |
| **批量删除** | 勾选多条评论后一键批量删除 |
| **置顶/取消置顶** | 将重要评论置顶显示在评论列表顶部 |
| **批量置顶** | 勾选多条评论后一键批量置顶 |

#### 邮件通知配置

在管理面板中可以配置新评论的邮件通知功能：

1. **启用/禁用邮件通知**：通过开关控制是否发送通知
2. **站长邮箱**：设置接收通知的邮箱地址
3. **SMTP 配置**：
   - SMTP 服务器地址
   - SMTP 端口
   - 是否启用 SSL/TLS
   - SMTP 用户名
   - SMTP 密码
4. **邮件模板**：自定义邮件主题和正文（支持变量替换）
5. **测试邮件**：发送一封测试邮件验证配置是否正确

---

## 邮件通知配置

### SMTP 配置说明

Yuamli 使用 [nodemailer](https://nodemailer.com/) 发送邮件。你需要配置一个 SMTP 服务来发送通知邮件。

### QQ 邮箱配置示例

#### 1. 开启 QQ 邮箱 SMTP 服务

1. 登录 QQ 邮箱网页版
2. 进入 **设置** → **账户**
3. 找到 **POP3/IMAP/SMTP/Exchange/CardDAV/CalDAV服务**
4. 开启 **IMAP/SMTP 服务**
5. 按提示使用手机发送短信验证
6. 获取 **授权码**（16 位字符串，保存好，后续配置需要用到）

#### 2. 配置管理面板

在管理面板的邮件配置区域填写：

| 配置项 | 值 |
|--------|-----|
| 站长邮箱 | `你的QQ号@qq.com` |
| SMTP 服务器 | `smtp.qq.com` |
| SMTP 端口 | `465` |
| 启用 SSL | `true` |
| SMTP 用户名 | `你的QQ号@qq.com` |
| SMTP 密码 | （填入刚才获取的授权码） |

#### 3. 或通过 .env 文件配置

```env
ADMIN_EMAIL=your_qq@qq.com
SMTP_HOST=smtp.qq.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your_qq@qq.com
SMTP_PASS=你的QQ邮箱授权码
```

### 邮件模板变量

邮件主题和正文支持以下变量，发送时自动替换为实际内容：

| 变量 | 替换为 | 示例值 |
|------|--------|--------|
| `{authorName}` | 评论者昵称 | `张三` |
| `{createdAt}` | 评论时间（中文格式） | `2024/12/15 14:30:00` |
| `{contentSnippet}` | 评论内容摘要（前 100 字） | `这篇文章写得很好，尤其是...` |

### 默认邮件模板

**默认主题**：

```
【Yuamli】您的博客有新的评论待回复
```

**默认正文**：

```
您好，站长！

您的博客有新的评论待回复。

评论摘要：
- 评论者：{authorName}
- 评论时间：{createdAt}
- 评论内容：{contentSnippet}

请及时登录管理面板查看并回复。

—— Yuamli 评论系统
```

### 其他邮箱 SMTP 参考

| 邮箱服务商 | SMTP 服务器 | 端口 | SSL |
|-----------|-------------|------|-----|
| QQ 邮箱 | `smtp.qq.com` | 465 | true |
| 163 邮箱 | `smtp.163.com` | 465 | true |
| Gmail | `smtp.gmail.com` | 465 | true |
| Outlook | `smtp.office365.com` | 587 | false（STARTTLS） |

> **提示**：配置完成后，务必点击 **发送测试邮件** 按钮验证配置是否正确。

---

## API 接口文档

所有 API 响应遵循统一格式：

```json
{
  "success": true,
  "data": {},
  "message": "操作成功"
}
```

失败时：

```json
{
  "success": false,
  "error": "错误描述信息"
}
```

### 认证接口

#### GET /api/auth/github

获取 GitHub OAuth 授权跳转 URL。

**响应示例**：

```json
{
  "success": true,
  "data": {
    "url": "https://github.com/login/oauth/authorize?client_id=xxx&state=xxx"
  }
}
```

---

#### GET /api/auth/github/callback

GitHub OAuth 回调地址（由 GitHub 重定向调用，非前端直接调用）。

**Query 参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| `code` | string | GitHub 授权码 |
| `state` | string | CSRF 防护 state |

**行为**：验证授权码，登录/注册用户，设置 Cookie，重定向至前端页面。

---

#### POST /api/auth/register

游客注册。

**请求体**：

```json
{
  "account": "user@example.com",
  "password": "123456",
  "nickname": "昵称"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `account` | string | 是 | 邮箱或 QQ 号 |
| `password` | string | 是 | 密码 |
| `nickname` | string | 是 | 显示昵称 |

**响应示例**：

```json
{
  "success": true,
  "data": {
    "id": "uuid-xxx",
    "nickname": "昵称",
    "avatar": "",
    "source": "guest",
    "role": "user"
  },
  "message": "注册成功"
}
```

---

#### POST /api/auth/login

游客登录。

**请求体**：

```json
{
  "account": "user@example.com",
  "password": "123456"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `account` | string | 是 | 注册时使用的账号 |
| `password` | string | 是 | 密码 |

**响应示例**：

```json
{
  "success": true,
  "data": {
    "id": "uuid-xxx",
    "nickname": "昵称",
    "avatar": "",
    "source": "guest",
    "role": "user"
  },
  "message": "登录成功"
}
```

---

#### POST /api/auth/admin/login

站长密码登录。

**请求体**：

```json
{
  "password": "your-admin-password"
}
```

**响应示例**：

```json
{
  "success": true,
  "data": { "role": "admin" },
  "message": "站长登录成功"
}
```

---

#### POST /api/auth/logout

登出当前用户。

**响应示例**：

```json
{
  "success": true,
  "message": "已登出"
}
```

---

#### GET /api/auth/me

获取当前登录用户信息（需携带 Cookie）。

**响应示例（已登录）**：

```json
{
  "success": true,
  "data": {
    "id": "uuid-xxx",
    "nickname": "张三",
    "avatar": "https://avatars.githubusercontent.com/u/12345?v=4",
    "source": "github",
    "role": "user"
  }
}
```

**响应示例（未登录）**：

```json
{
  "success": true,
  "data": null
}
```

---

### 评论接口

#### GET /api/comments

获取指定页面的评论列表。

**Query 参数**：

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `pageId` | string | 是 | — | 页面唯一标识 |
| `page` | number | 否 | `1` | 页码 |
| `pageSize` | number | 否 | `50` | 每页数量（最大 100） |
| `sortBy` | string | 否 | `newest` | 排序方式：`newest`（最新）、`oldest`（最早） |

**响应示例**：

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "comment-uuid",
        "pageId": "my-blog-post",
        "userId": "user-uuid",
        "authorName": "张三",
        "authorAvatar": "https://avatars.githubusercontent.com/u/12345?v=4",
        "parentId": null,
        "replyToUserId": null,
        "replyToName": null,
        "content": "写得很棒！",
        "pinned": false,
        "collapsed": false,
        "createdAt": "2024-12-15T06:30:00.000Z",
        "updatedAt": "2024-12-15T06:30:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 50
  }
}
```

---

#### POST /api/comments

发表评论（**需登录**）。

**请求体**：

```json
{
  "pageId": "my-blog-post",
  "content": "这是一条评论",
  "parentId": null,
  "replyToUserId": null,
  "replyToName": null
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `pageId` | string | 是 | 页面唯一标识 |
| `content` | string | 是 | 评论内容（Markdown，最长 10000 字符） |
| `parentId` | string | 否 | 父评论 ID（回复时填写） |
| `replyToUserId` | string | 否 | 回复目标用户 ID |
| `replyToName` | string | 否 | 回复目标用户名 |

**响应示例**：

```json
{
  "success": true,
  "data": { "id": "new-comment-uuid", ... },
  "message": "评论发表成功"
}
```

---

#### PUT /api/comments/:id

编辑评论（**仅本人可操作**）。

**请求体**：

```json
{
  "content": "修改后的评论内容"
}
```

---

#### DELETE /api/comments/:id

删除评论（本人可删除自己的评论，站长可删除任何评论）。

**响应示例**：

```json
{
  "success": true,
  "message": "评论已删除"
}
```

---

#### POST /api/comments/:id/toggle

折叠/展开评论（仅本人或站长可操作）。

**响应示例**：

```json
{
  "success": true,
  "data": { "collapsed": true }
}
```

---

### 管理接口（需站长权限）

#### GET /api/admin/stats

获取统计数据。

**响应示例**：

```json
{
  "success": true,
  "data": {
    "totalComments": 128,
    "totalUsers": 45,
    "totalPages": 23,
    "recentComments": [...]
  }
}
```

---

#### GET /api/admin/comments

获取所有评论（支持分页和筛选）。

**Query 参数**：

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `page` | number | 否 | `1` | 页码 |
| `pageSize` | number | 否 | `20` | 每页数量 |
| `pageId` | string | 否 | — | 按页面 ID 筛选 |
| `keyword` | string | 否 | — | 搜索关键词（匹配昵称或内容） |

---

#### POST /api/admin/comments/batch-delete

批量删除评论。

**请求体**：

```json
{
  "ids": ["comment-id-1", "comment-id-2", "comment-id-3"]
}
```

**响应示例**：

```json
{
  "success": true,
  "data": { "deleted": 3 },
  "message": "已删除 3 条评论"
}
```

---

#### PUT /api/admin/comments/:id/pin

置顶或取消置顶评论。

**响应示例**：

```json
{
  "success": true,
  "data": { "pinned": true },
  "message": "已置顶"
}
```

---

#### POST /api/admin/comments/batch-pin

批量置顶评论。

**请求体**：

```json
{
  "ids": ["comment-id-1", "comment-id-2"]
}
```

---

#### GET /api/admin/config

获取管理配置（SMTP 密码以掩码 `••••••` 返回）。

---

#### PUT /api/admin/config

更新管理配置。

**请求体**：

```json
{
  "emailEnabled": true,
  "adminEmail": "admin@blog.com",
  "smtp": {
    "host": "smtp.qq.com",
    "port": 465,
    "secure": true,
    "user": "admin@qq.com",
    "pass": "authorization_code"
  },
  "emailSubject": "【Yuamli】您的博客有新的评论待回复",
  "emailBody": "您好，站长！\n\n您的博客有新的评论待回复。\n\n评论摘要：\n- 评论者：{authorName}\n- 评论时间：{createdAt}\n- 评论内容：{contentSnippet}\n\n请及时登录管理面板查看并回复。\n\n—— Yuamli 评论系统"
}
```

> **注意**：更新时如果 `smtp.pass` 传入的是掩码 `••••••`，系统会保留原密码不变。

---

#### POST /api/admin/config/test-email

发送测试邮件。

**请求体**（可选，用于覆盖当前配置进行测试）：

```json
{
  "smtp": {
    "host": "smtp.qq.com",
    "port": 465,
    "secure": true,
    "user": "admin@qq.com",
    "pass": "authorization_code"
  },
  "adminEmail": "admin@blog.com"
}
```

**响应示例**：

```json
{
  "success": true,
  "message": "测试邮件已发送"
}
```

---

### 健康检查

#### GET /api/health

**响应示例**：

```json
{
  "success": true,
  "message": "Yuamli is running"
}
```

---

## 数据存储说明

Yuamli 使用 JSON 文件存储所有数据，无需安装数据库。数据文件存放在 `DATA_DIR` 指定的目录下（默认为 `./data`）。

### 文件结构

```
data/
├── comments.json      # 所有评论数据
├── users.json         # 所有用户数据
├── sessions.json      # 用户会话数据（JWT Token）
└── admin-config.json  # 站长管理配置
```

### comments.json

```json
[
  {
    "id": "uuid-string",
    "pageId": "my-blog-post-slug",
    "userId": "user-uuid",
    "authorName": "张三",
    "authorAvatar": "https://avatars.githubusercontent.com/u/12345?v=4",
    "parentId": null,
    "replyToUserId": null,
    "replyToName": null,
    "content": "这是一条评论内容（原始 Markdown）",
    "pinned": false,
    "collapsed": false,
    "createdAt": "2024-12-15T06:30:00.000Z",
    "updatedAt": "2024-12-15T06:30:00.000Z"
  }
]
```

### users.json

```json
[
  {
    "id": "uuid-string",
    "source": "github",
    "role": "user",
    "githubId": 12345,
    "githubLogin": "zhangsan",
    "nickname": "张三",
    "avatar": "https://avatars.githubusercontent.com/u/12345?v=4",
    "email": "zhangsan@example.com",
    "website": null,
    "createdAt": "2024-12-15T06:30:00.000Z",
    "lastLoginAt": "2024-12-15T06:30:00.000Z"
  }
]
```

游客用户示例：

```json
{
  "id": "uuid-string",
  "source": "guest",
  "role": "user",
  "account": "user@example.com",
  "passwordHash": "$2a$10$...",
  "nickname": "访客小王",
  "avatar": "",
  "createdAt": "2024-12-15T06:30:00.000Z",
  "lastLoginAt": "2024-12-15T06:30:00.000Z"
}
```

### sessions.json

```json
[
  {
    "userId": "uuid-string",
    "role": "user",
    "token": "jwt-token-string",
    "createdAt": "2024-12-15T06:30:00.000Z"
  }
]
```

### admin-config.json

```json
{
  "emailEnabled": false,
  "adminEmail": "",
  "smtp": null,
  "emailSubject": "【Yuamli】您的博客有新的评论待回复",
  "emailBody": "您好，站长！\n\n您的博客有新的评论待回复。\n\n..."
}
```

> **提示**：首次启动时，系统会自动创建 `data` 目录和所有必需的 JSON 文件。建议将 `data/` 目录添加到版本控制忽略列表中（`.gitignore`），避免敏感数据泄露。

---

## 常见问题

### Q1: 启动后访问端口无响应？

- 确认 Node.js 版本 >= 18.0.0
- 检查端口 3456 是否被其他程序占用，可通过 `.env` 中的 `PORT` 变量更换端口
- 查看终端是否有报错信息

### Q2: GitHub OAuth 登录跳转后报错？

- 检查 `GITHUB_CLIENT_ID` 和 `GITHUB_CLIENT_SECRET` 是否正确
- 确认 `GITHUB_CALLBACK_URL` 与 GitHub OAuth App 中配置的完全一致（包括协议、域名、端口、路径）
- 如果使用反向代理，确保 `YUAMLI_FRONTEND_URL` 设置为实际的前端访问地址

### Q3: 邮件通知发送失败？

- 确认 SMTP 服务器地址和端口正确
- QQ 邮箱需要使用 **授权码** 而非登录密码
- 检查 `SMTP_SECURE` 设置是否正确（端口 465 通常为 `true`，端口 587 通常为 `false`）
- 在管理面板中使用 **发送测试邮件** 功能验证配置

### Q4: 评论数据存储在哪里？

所有数据存储在 `DATA_DIR` 目录（默认 `./data`）下的 JSON 文件中。首次启动时会自动创建。

### Q5: 如何备份数据？

直接复制整个 `data/` 目录即可完成备份。建议定期备份。

### Q6: 如何修改站长密码？

修改 `.env` 文件中的 `ADMIN_PASSWORD` 变量，然后重启服务即可。

### Q7: 评论内容支持哪些 Markdown 语法？

支持基本的 Markdown 语法，包括：**加粗**、*斜体*、`行内代码`、代码块、[链接](url)、无序列表、有序列表、引用块等。

### Q8: 生产环境推荐如何部署？

推荐使用 [PM2](https://pm2.keymetrics.io/) 进程管理器来运行 Yuamli 服务：

```bash
npm install -g pm2
pm2 start npm --name "yuamli" -- start
pm2 save
pm2 startup
```

同时建议配合 Nginx 反向代理使用，并启用 HTTPS。详见 [Astro 集成文档](./astro-integration.md) 中的部署建议章节。

### Q9: 支持嵌入到非 Astro 的网站吗？

支持。执行 `npm run build` 构建 `dist/client/yuamli.js` 和 `dist/client/yuamli.css` 后，在任何网页中引入这两个文件并调用 `Yuamli.init()` 即可。详细步骤请参考 [Astro 集成文档](./astro-integration.md) 中方案 A 的说明。