## Yuamli

> 轻量级留言系统 —— 支持第三方 OAuth 登录、邮箱游客登录、嵌套回复、Markdown 渲染、后台管理与数据备份

当前版本：**v1.1.3**

### 特性

- **登录方式**：GitHub / GitCode OAuth 授权登录；邮箱 + 验证码免密登录（邮箱即账号，验证码即身份）
- **嵌套回复**：无限层级嵌套，递归树形渲染
- **Markdown 支持**：留言内容支持 Markdown 基础语法，支持实时预览
- **表情面板**：内置经典颜文字与常用表情，点击插入到光标位置
- **个人网址**：留言时可附带站点地址，展示在昵称旁
- **后台管理**：内置管理面板，支持留言批量管理（删除 / 置顶 / 精华）、单条与统一回复、用户管理、更新日志编辑
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

### V-1.1.3 (2026-10-27)

- **登录**：游客登录改为邮箱验证码免密登录，移除密码输入框（验证码即身份，首次使用自动注册、再次使用直接登录），简化登录面板

### V-1.1.2 (2026-10-27)

- **后台布局**：改为左侧侧边栏设计，桌面端常驻、移动端点击顶栏 logo 展开抽屉；导航、刷新、退出均收进侧边栏
- **个性化**：系统设置新增「个性化」卡片，主题色并入其中；新增「后台标题模式」——单图标（40×40px，支持 URL 或本地选取）、单文本（自定义标题），勾选其一显示其一、勾选二者均显示

### V-1.1.1 (2026-10-27)

- **后台导航**：重排为「留言管理 / 用户列表 / 更新日志 / 评论设置 / 系统设置」，数据备份并入系统设置，不再单独入口
- **布局**：评论设置与系统设置改为双列网格卡片，大屏下全宽铺满
- **修复**：Vercel 等 Serverless 环境下「后台能登录但保存全部失败」的问题——缺少 `AUTH_SECRET` 时给出明确提示；SMTP 授权码不再明文回传；各类保存失败均返回可执行的错误信息

### V-1.1.0 (2026-10-26)

- **安全**：会话与管理员 Cookie 改为 HMAC-SHA256 签名，附带过期时间；密码由弱哈希升级为 scrypt（兼容旧数据校验）
- **登录渠道**：保留 GitHub + GitCode，移除 Gitee
- **调整**：邮箱登录并入「游客登录」，账号为邮箱 + 自定义密码 + 验证码；忘记密码时用验证码直接重置
- **样式**：留言表单改为信息区 / 内容区 / 展示区三段式，展示区新增表情与颜文字面板、个人网址
- **图标**：全站（含后台）favicon 统一为图床图标 `https://img.yqamm.top/MIHOYO/950cb3bf.webp`
- **清理**：删除未使用的组件、接口与依赖，版本号统一为 v1.1.0

### V-1.0.8

- 重新排列留言区下方功能区，增加留言区预设编辑功能

### V-1.0.7

- 更新日志独立文件编辑、主题色热切换、logo 修复、预设修复、按钮对齐优化

更多日志请在[管理后台](https://yuamli.yqamm.top/admin)查看

### 快速开始

```bash
# 1. 克隆仓库
git clone https://github.com/your-username/yuamli.git
cd yuamli

# 2. 安装依赖
pnpm install

# 3. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local：至少填写 AUTH_SECRET，以及需要启用的 OAuth 凭据

# 4. 启动开发服务器
pnpm dev
```

打开 http://localhost:3000 即可访问。首次访问时 `data/` 目录下会自动创建 JSON 数据文件。

### 环境变量

复制 `.env.example` 为 `.env.local`，按需填写：

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `AUTH_SECRET` | 是 | 登录态 Cookie 的签名密钥，至少 16 位随机字符串，可用 `openssl rand -hex 32` 生成 |
| `NEXT_PUBLIC_GITHUB_CLIENT_ID` | 使用 GitHub 登录时必填 | GitHub OAuth App 的 Client ID（前端公开） |
| `GITHUB_CLIENT_ID` | 使用 GitHub 登录时必填 | 同上（后端使用） |
| `GITHUB_CLIENT_SECRET` | 使用 GitHub 登录时必填 | GitHub OAuth App 的 Client Secret（保密） |
| `GITCODE_CLIENT_ID` / `GITCODE_CLIENT_SECRET` | 使用 GitCode 登录时必填 | GitCode OAuth 应用凭据 |
| `KV_REST_API_URL` | 仅 Vercel 部署 | Vercel KV 连接地址，创建 KV 后自动注入，无需手动填写 |
| `KV_REST_API_TOKEN` | 仅 Vercel 部署 | Vercel KV 认证 Token，创建 KV 后自动注入，无需手动填写 |

> **注意**：`AUTH_SECRET` 一旦更换，所有用户与管理员都需要重新登录。
> `KV_REST_API_URL` 和 `KV_REST_API_TOKEN` 在 Vercel Storage 中创建 KV 实例后会自动注入到项目中，**不要手动在 Settings → Environment Variables 中添加这两个变量**。

#### 邮箱登录说明

邮箱登录复用后台配置的 SMTP 服务（后台 → 设置 → 邮件通知）。未配置 SMTP 时，游客登录会提示「站长尚未配置邮件服务」。

- 首次使用某个邮箱 → 自动创建账号并登录
- 已有账号 → 获取验证码后直接登录

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
3. 在 **Settings → Environment Variables** 中添加 `AUTH_SECRET` 与 OAuth 相关变量
   - ⚠️ **务必给 Production 和 Preview 都勾选**，否则预览域名下会出现「能登录、但保存全部失败」
   - 添加/修改变量后必须 **Redeploy** 才会生效
4. 在 **Storage** 标签中创建 **KV (Redis)** 实例，区域建议选 Singapore
5. 创建完成后 Vercel 会自动注入 `KV_REST_API_URL` 和 `KV_REST_API_TOKEN`
6. 更新 GitHub OAuth App 的 callback URL 为 Vercel 分配的域名
7. 重新部署生效

#### 自建服务器

1. `pnpm build && pnpm start` 或使用 Caddy / Nginx 反向代理
2. 项目根目录附带了 `Caddyfile` 可直接使用
3. 数据存储在 `data/` 目录下的 JSON 文件中

#### 常见故障：后台「保存失败」

后台所有保存都失败时，按提示文案对号入座：

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| 提示「管理员登录状态已失效」或「未配置 AUTH_SECRET」 | Serverless 环境没有稳定的签名密钥，Cookie 跨实例验签失败 | 在环境变量中配置 `AUTH_SECRET`（16 位以上随机串），Production 与 Preview 都要配，然后重新部署 |
| 提示「配置写入失败」 | 文件系统只读（Vercel）或 `data/` 无写权限 | Vercel：在 Storage 创建 KV 并关联项目后重新部署；自建：`chown`/`chmod` 给运行用户写权限 |
| 提示「SMTP 连接失败: 535 …」 | 授权码错误 / 未开启 SMTP 服务 / 授权码过期 | 用邮箱的「SMTP 授权码」而非登录密码；在邮箱设置中开启 POP3/SMTP 服务 |
| 提示「SMTP 连接失败: ETIMEDOUT」 | 端口被封锁 | 把端口从 465 改成 587 再试 |

### 项目结构

```
src/
├── app/
│   ├── page.tsx                    # 留言主页面
│   ├── layout.tsx                  # 根布局
│   ├── globals.css                 # 全局样式与主题变量
│   ├── admin/page.tsx              # 后台管理页
│   └── api/
│       ├── auth/
│       │   ├── [provider]/route.ts          # OAuth 跳转（github / gitcode）
│       │   ├── [provider]/callback/route.ts # OAuth 回调
│       │   ├── email/send/route.ts          # 发送登录验证码
│       │   ├── guest/route.ts               # 邮箱游客：免密注册 / 登录
│       │   └── session/route.ts             # 会话查询 / 退出
│       ├── comments/
│       │   ├── route.ts            # 留言列表 / 新建留言
│       │   └── [id]/route.ts       # 编辑 / 删除单条留言
│       ├── admin/
│       │   ├── route.ts            # 管理员认证 / 改密 / 数据
│       │   ├── changelog/route.ts  # 更新日志
│       │   ├── comments/route.ts   # 批量留言管理
│       │   ├── data/route.ts       # 数据导出 / 导入
│       │   ├── identity/route.ts   # 管理员身份绑定
│       │   └── notify/route.ts     # 通知设置与测试
│       └── config/route.ts         # 公开站点配置
├── components/
│   ├── comment-system/             # 留言系统业务组件
│   └── ui/                         # shadcn/ui 基础组件
├── lib/
│   ├── adapter.ts                  # 存储适配器（JSON / KV 自动切换，零 SDK）
│   ├── auth.ts                     # 签名 Cookie 会话、scrypt 密码、管理员鉴权
│   ├── email.ts                    # SMTP 发信
│   ├── emoji.ts                    # 表情 / 颜文字素材
│   ├── oauth.ts                    # GitHub / GitCode OAuth
│   ├── storage.ts                  # 数据读写业务逻辑
│   ├── theme.ts                    # 主题色预设
│   └── utils.ts                    # 通用工具
├── store/
│   └── use-comment-store.ts        # Zustand 全局状态
└── hooks/                          # React Hooks
```

### 默认管理员密码

初始管理员密码定义在 `src/lib/adapter.ts` 的 `DEFAULT_CONFIG` 中，请在首次部署后立即通过后台面板修改。

### 安全建议

- 生产环境务必设置 `AUTH_SECRET`，不使用默认值
- 首次部署后立刻修改管理员密码
- 数据文件（`data/*.json`、`.env.local`）不要提交到公开仓库
- 如需多实例部署，建议改用 Vercel KV 等外部存储，避免 JSON 文件的并发写入冲突

### License

[MIT](./LICENSE) © 2026 YuQi
