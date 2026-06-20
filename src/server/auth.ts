/* ============================================================
   Yuamli 认证模块 —— GitHub OAuth + 游客登录 + 站长验证
   ============================================================ */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import type { User, Session, PublicUser, GitHubUserInfo, GuestRegisterRequest, GuestLoginRequest } from '../types/index.js';
import { JsonStore } from './storage.js';

export class AuthService {
  private store: JsonStore;
  private jwtSecret: string;
  private githubClientId: string;
  private githubClientSecret: string;
  private githubCallbackUrl: string;
  private adminPassword: string;

  constructor(store: JsonStore, config: {
    jwtSecret: string;
    githubClientId: string;
    githubClientSecret: string;
    githubCallbackUrl: string;
    adminPassword: string;
  }) {
    this.store = store;
    this.jwtSecret = config.jwtSecret;
    this.githubClientId = config.githubClientId;
    this.githubClientSecret = config.githubClientSecret;
    this.githubCallbackUrl = config.githubCallbackUrl;
    this.adminPassword = config.adminPassword;
  }

  /* -------- 工具方法 -------- */

  /** 生成 JWT token */
  private generateToken(userId: string, role: string): string {
    return jwt.sign({ userId, role }, this.jwtSecret, { expiresIn: '30d' });
  }

  /** 创建会话并设置 cookie */
  private createSession(res: Response, user: User): void {
    const token = this.generateToken(user.id, user.role);
    const session: Session = {
      userId: user.id,
      role: user.role,
      token,
      createdAt: new Date().toISOString(),
    };
    this.store.addSession(session);
    res.cookie('yuamli_token', token, {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 天
      sameSite: 'lax',
      path: '/',
    });
  }

  /** 脱敏用户信息 */
  toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      nickname: user.nickname,
      avatar: user.avatar,
      email: user.email,
      website: user.website,
      source: user.source,
      role: user.role,
    };
  }

  /* -------- GitHub OAuth 授权登录 -------- */

  /** 获取 GitHub 授权 URL，前端直接跳转 */
  getGitHubAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.githubClientId,
      redirect_uri: this.githubCallbackUrl,
      scope: 'read:user user:email',
      ...(state ? { state } : {}),
    });
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  /** 处理 GitHub OAuth 回调：用 code 换取 access_token，再获取用户信息 */
  async handleGitHubCallback(code: string, res: Response): Promise<PublicUser> {
    // 第一步：用 code 换取 access_token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: this.githubClientId,
        client_secret: this.githubClientSecret,
        code,
      }),
    });
    const tokenData = await tokenRes.json() as { access_token?: string; error?: string };
    if (!tokenData.access_token) {
      throw new Error(`GitHub OAuth token exchange failed: ${tokenData.error || 'unknown'}`);
    }

    // 第二步：用 access_token 获取用户信息
    const userRes = await fetch('https://api.github.com/user', {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}`, 'Accept': 'application/json' },
    });
    const ghUser = await userRes.json() as GitHubUserInfo;

    // 第三步：查找或创建用户
    let user = this.store.getUserByGithubId(ghUser.id);
    if (!user) {
      user = {
        id: crypto.randomUUID(),
        source: 'github',
        role: 'user',
        githubId: ghUser.id,
        githubLogin: ghUser.login,
        nickname: ghUser.name || ghUser.login,
        avatar: ghUser.avatar_url,
        email: ghUser.email || undefined,
        website: ghUser.html_url,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };
      this.store.addUser(user);
    } else {
      // 更新登录时间和信息
      this.store.updateUser(user.id, {
        nickname: ghUser.name || ghUser.login,
        avatar: ghUser.avatar_url,
        lastLoginAt: new Date().toISOString(),
      });
      user = this.store.getUserById(user.id)!;
    }

    this.createSession(res, user);
    return this.toPublicUser(user);
  }

  /* -------- 游客注册 -------- */

  async registerGuest(body: GuestRegisterRequest, res: Response): Promise<PublicUser> {
    const { account, password, nickname } = body;

    if (!account || !password || !nickname) {
      throw new Error('账号、密码和昵称不能为空');
    }
    if (password.length < 4) {
      throw new Error('密码长度不能少于 4 位');
    }

    // 检查账号是否已被注册
    const existing = this.store.getUserByAccount(account);
    if (existing) {
      throw new Error('该账号已被注册');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user: User = {
      id: crypto.randomUUID(),
      source: 'guest',
      role: 'user',
      account,
      passwordHash,
      nickname,
      avatar: `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(nickname)}`,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    this.store.addUser(user);
    this.createSession(res, user);
    return this.toPublicUser(user);
  }

  /* -------- 游客登录 -------- */

  async loginGuest(body: GuestLoginRequest, res: Response): Promise<PublicUser> {
    const { account, password } = body;
    if (!account || !password) {
      throw new Error('账号和密码不能为空');
    }

    const user = this.store.getUserByAccount(account);
    if (!user || !user.passwordHash) {
      throw new Error('账号或密码错误');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new Error('账号或密码错误');
    }

    this.store.updateUser(user.id, { lastLoginAt: new Date().toISOString() });
    this.createSession(res, this.store.getUserById(user.id)!);
    return this.toPublicUser(this.store.getUserById(user.id)!);
  }

  /* -------- 站长登录 -------- */

  verifyAdmin(password: string, res: Response): { token: string } {
    if (password !== this.adminPassword) {
      throw new Error('站长密码错误');
    }
    // 查找或创建 admin 用户
    let admin = this.store.getUsers().find((u) => u.role === 'admin');
    if (!admin) {
      admin = {
        id: crypto.randomUUID(),
        source: 'guest',
        role: 'admin',
        account: 'admin',
        nickname: '站长',
        avatar: '',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };
      this.store.addUser(admin);
    }
    this.store.updateUser(admin.id, { lastLoginAt: new Date().toISOString() });
    const token = this.generateToken(admin.id, 'admin');
    const session: Session = {
      userId: admin.id,
      role: 'admin',
      token,
      createdAt: new Date().toISOString(),
    };
    this.store.addSession(session);
    res.cookie('yuamli_token', token, {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      sameSite: 'lax',
      path: '/',
    });
    return { token };
  }

  /* -------- 登出 -------- */

  logout(res: Response): void {
    const token = req => req.cookies?.yuamli_token;
    if (token) {
      this.store.removeSession(token);
    }
    res.clearCookie('yuamli_token');
  }

  /* -------- 中间件：可选认证（有 token 则解析，无则放行） -------- */

  optionalAuth(req: Request, _res: Response, next: NextFunction): void {
    const token = req.cookies?.yuamli_token;
    if (!token) {
      (req as any).user = null;
      next();
      return;
    }
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as { userId: string; role: string };
      const session = this.store.getSessionByToken(token);
      if (!session) {
        (req as any).user = null;
        next();
        return;
      }
      const user = this.store.getUserById(decoded.userId);
      (req as any).user = user ? this.toPublicUser(user) : null;
    } catch {
      (req as any).user = null;
    }
    next();
  }

  /* -------- 中间件：必须登录 -------- */

  requireAuth(req: Request, res: Response, next: NextFunction): void {
    this.optionalAuth(req, res, () => {
      if (!(req as any).user) {
        res.status(401).json({ success: false, error: '请先登录' });
        return;
      }
      next();
    });
  }

  /* -------- 中间件：必须为站长 -------- */

  requireAdmin(req: Request, res: Response, next: NextFunction): void {
    this.optionalAuth(req, res, () => {
      const user = (req as any).user as PublicUser | null;
      if (!user || user.role !== 'admin') {
        res.status(403).json({ success: false, error: '需要站长权限' });
        return;
      }
      next();
    });
  }
}