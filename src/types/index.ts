/* ============================================================
   Yuamli 类型定义
   ============================================================ */

/** 用户来源类型 */
export type UserSource = 'github' | 'guest';

/** 用户角色 */
export type UserRole = 'user' | 'admin';

/** GitHub 用户信息（从 GitHub API 获取） */
export interface GitHubUserInfo {
  id: number;
  login: string;
  avatar_url: string;
  name: string | null;
  email: string | null;
  bio: string | null;
  html_url: string;
}

/** 用户记录 */
export interface User {
  id: string;
  source: UserSource;
  role: UserRole;
  /** 游客登录时的账号（邮箱/QQ号等） */
  account?: string;
  /** 游客登录时的密码哈希 */
  passwordHash?: string;
  /** GitHub 用户 ID */
  githubId?: number;
  githubLogin?: string;
  /** 显示名称 */
  nickname: string;
  /** 头像 URL */
  avatar: string;
  /** 邮箱 */
  email?: string;
  /** 个人主页 */
  website?: string;
  /** 注册时间 */
  createdAt: string;
  /** 最后登录时间 */
  lastLoginAt: string;
}

/** 评论状态 */
export interface Comment {
  id: string;
  /** 所属页面标识（如文章 slug） */
  pageId: string;
  /** 评论者用户 ID */
  userId: string;
  /** 评论者昵称（冗余存储，方便展示） */
  authorName: string;
  /** 评论者头像（冗余存储） */
  authorAvatar: string;
  /** 父评论 ID（为空则是顶级评论） */
  parentId: string | null;
  /** 回复的目标用户 ID */
  replyToUserId: string | null;
  /** 回复的目标用户名 */
  replyToName: string | null;
  /** 评论内容（原始 Markdown） */
  content: string;
  /** 是否置顶 */
  pinned: boolean;
  /** 是否已折叠 */
  collapsed: boolean;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}

/** 会话数据 */
export interface Session {
  userId: string;
  role: UserRole;
  token: string;
  createdAt: string;
}

/** 站长管理配置（持久化存储） */
export interface AdminConfig {
  /** 邮件通知是否启用 */
  emailEnabled: boolean;
  /** 站长接收通知的邮箱 */
  adminEmail: string;
  /** SMTP 配置 */
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
  } | null;
  /** 自定义邮件主题模板 */
  emailSubject: string;
  /** 自定义邮件正文模板 */
  emailBody: string;
}

/** 默认管理配置 */
export const DEFAULT_ADMIN_CONFIG: AdminConfig = {
  emailEnabled: false,
  adminEmail: '',
  smtp: null,
  emailSubject: '【Yuamli】您的博客有新的评论待回复',
  emailBody: `您好，站长！

您的博客有新的评论待回复。

评论摘要：
- 评论者：{authorName}
- 评论时间：{createdAt}
- 评论内容：{contentSnippet}

请及时登录管理面板查看并回复。

—— Yuamli 评论系统`,
};

/** 登录请求体 */
export interface GuestLoginRequest {
  account: string;
  password: string;
}

/** 注册请求体 */
export interface GuestRegisterRequest {
  account: string;
  password: string;
  nickname: string;
}

/** 创建评论请求体 */
export interface CreateCommentRequest {
  pageId: string;
  content: string;
  parentId?: string;
  replyToUserId?: string;
  replyToName?: string;
}

/** 更新评论请求体 */
export interface UpdateCommentRequest {
  content: string;
}

/** API 统一响应格式 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

/** 用户信息（返回给前端的脱敏数据） */
export interface PublicUser {
  id: string;
  nickname: string;
  avatar: string;
  email?: string;
  website?: string;
  source: UserSource;
  role: UserRole;
}

/** 评论列表查询参数 */
export interface CommentQueryParams {
  pageId: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'newest' | 'oldest' | 'pinned';
}