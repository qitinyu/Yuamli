/* ============================================================
   Yuamli API 路由
   ============================================================ */
import { Router } from 'express';
import type { Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { JsonStore } from './storage.js';
import { AuthService } from './auth.js';
import { EmailService } from './email.js';
import type { ApiResponse, PublicUser, Comment, CreateCommentRequest, UpdateCommentRequest } from '../types/index.js';

export function createRoutes(store: JsonStore, auth: AuthService, email: EmailService): Router {
  const router = Router();

  /* ============================================================
     辅助函数
     ============================================================ */
  function ok<T>(res: Response, data: T, message?: string): void {
    res.json({ success: true, data, message } as ApiResponse<T>);
  }
  function fail(res: Response, error: string, status = 400): void {
    res.status(status).json({ success: false, error } as ApiResponse);
  }

  /* ============================================================
     认证相关路由
     ============================================================ */

  /** GET /api/auth/github - 获取 GitHub OAuth 授权跳转 URL */
  router.get('/api/auth/github', (req: Request, res: Response) => {
    // state 用于 CSRF 防护，简单用时间戳
    const state = Buffer.from(JSON.stringify({ t: Date.now() })).toString('base64url');
    res.cookie('yuamli_oauth_state', state, { httpOnly: true, maxAge: 600000, sameSite: 'lax' });
    const url = auth.getGitHubAuthUrl(state);
    res.json({ success: true, data: { url } });
  });

  /** GET /api/auth/github/callback - GitHub OAuth 回调 */
  router.get('/api/auth/github/callback', async (req: Request, res: Response) => {
    try {
      const { code, state } = req.query as { code?: string; state?: string };
      if (!code) return fail(res, '缺少授权码', 400);

      // 验证 state（简化处理，实际生产环境应严格校验）
      const savedState = req.cookies?.yuamli_oauth_state;
      if (state && savedState && state !== savedState) {
        return fail(res, 'State 验证失败，请重试', 403);
      }
      res.clearCookie('yuamli_oauth_state');

      const user = await auth.handleGitHubCallback(code, res);
      // 前端页面回调
      const frontendUrl = process.env.YUAMLI_FRONTEND_URL || '/';
      res.redirect(`${frontendUrl}?login=success`);
    } catch (e: any) {
      res.redirect(`/?login=error&msg=${encodeURIComponent(e.message)}`);
    }
  });

  /** POST /api/auth/register - 游客注册 */
  router.post('/api/auth/register', async (req: Request, res: Response) => {
    try {
      const user = await auth.registerGuest(req.body, res);
      ok(res, user, '注册成功');
    } catch (e: any) {
      fail(res, e.message);
    }
  });

  /** POST /api/auth/login - 游客登录 */
  router.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const user = await auth.loginGuest(req.body, res);
      ok(res, user, '登录成功');
    } catch (e: any) {
      fail(res, e.message);
    }
  });

  /** POST /api/auth/admin/login - 站长密码登录 */
  router.post('/api/auth/admin/login', (req: Request, res: Response) => {
    try {
      const { password } = req.body as { password?: string };
      if (!password) return fail(res, '请输入站长密码');
      const result = auth.verifyAdmin(password, res);
      ok(res, result, '站长登录成功');
    } catch (e: any) {
      fail(res, e.message, 403);
    }
  });

  /** POST /api/auth/logout - 登出 */
  router.post('/api/auth/logout', (req: Request, res: Response) => {
    auth.logout(res);
    ok(res, null, '已登出');
  });

  /** GET /api/auth/me - 获取当前用户信息 */
  router.get('/api/auth/me', (req: Request, res: Response) => {
    const user = (req as any).user as PublicUser | null;
    ok(res, user);
  });

  /* ============================================================
     评论相关路由
     ============================================================ */

  /** GET /api/comments?pageId=xxx - 获取某页面的评论列表 */
  router.get('/api/comments', (req: Request, res: Response) => {
    const { pageId, page = '1', pageSize = '50', sortBy = 'newest' } = req.query as any;
    if (!pageId) return fail(res, '缺少 pageId 参数');

    let comments = store.getCommentsByPageId(pageId as string);

    // 排序：置顶优先，然后按选择的方式
    comments.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // 分页
    const p = Math.max(1, parseInt(page, 10));
    const ps = Math.min(100, Math.max(1, parseInt(pageSize, 10)));
    const total = comments.length;
    const items = comments.slice((p - 1) * ps, p * ps);

    // 标记被折叠的评论内容（只返回前两行）
    const processed = items.map((c) => ({
      ...c,
      collapsed: c.collapsed,
    }));

    ok(res, { items: processed, total, page: p, pageSize: ps });
  });

  /** POST /api/comments - 发表评论（需登录） */
  router.post('/api/comments', (req: Request, res: Response) => {
    const user = (req as any).user as PublicUser | null;
    if (!user) return fail(res, '请先登录', 401);

    const { pageId, content, parentId, replyToUserId, replyToName } = req.body as CreateCommentRequest;
    if (!pageId || !content?.trim()) {
      return fail(res, '页面 ID 和评论内容不能为空');
    }
    if (content.length > 10000) {
      return fail(res, '评论内容不能超过 10000 字符');
    }

    const comment: Comment = {
      id: uuid(),
      pageId,
      userId: user.id,
      authorName: user.nickname,
      authorAvatar: user.avatar,
      parentId: parentId || null,
      replyToUserId: replyToUserId || null,
      replyToName: replyToName || null,
      content: content.trim(),
      pinned: false,
      collapsed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.addComment(comment);

    // 触发邮件通知
    const config = store.getAdminConfig();
    if (config.emailEnabled) {
      email.sendNewCommentNotification(config, comment).then((result) => {
        if (!result.success) {
          console.error('[Yuamli] 邮件通知发送失败:', result.error);
        }
      });
    }

    ok(res, comment, '评论发表成功');
  });

  /** PUT /api/comments/:id - 编辑评论（仅本人） */
  router.put('/api/comments/:id', (req: Request, res: Response) => {
    const user = (req as any).user as PublicUser | null;
    if (!user) return fail(res, '请先登录', 401);

    const { id } = req.params;
    const { content } = req.body as UpdateCommentRequest;
    if (!content?.trim()) return fail(res, '评论内容不能为空');

    const comment = store.getCommentById(id);
    if (!comment) return fail(res, '评论不存在', 404);
    if (comment.userId !== user.id) return fail(res, '只能编辑自己的评论', 403);

    const success = store.updateComment(id, { content: content.trim() });
    if (success) ok(res, store.getCommentById(id), '评论已更新');
    else fail(res, '更新失败');
  });

  /** DELETE /api/comments/:id - 删除评论（仅本人或站长） */
  router.delete('/api/comments/:id', (req: Request, res: Response) => {
    const user = (req as any).user as PublicUser | null;
    if (!user) return fail(res, '请先登录', 401);

    const { id } = req.params;
    const comment = store.getCommentById(id);
    if (!comment) return fail(res, '评论不存在', 404);

    // 站长可以删除任何评论，普通用户只能删除自己的
    if (user.role !== 'admin' && comment.userId !== user.id) {
      return fail(res, '只能删除自己的评论', 403);
    }

    const success = store.deleteComment(id);
    if (success) ok(res, null, '评论已删除');
    else fail(res, '删除失败');
  });

  /** POST /api/comments/:id/toggle - 折叠/展开评论（仅本人或站长） */
  router.post('/api/comments/:id/toggle', (req: Request, res: Response) => {
    const user = (req as any).user as PublicUser | null;
    if (!user) return fail(res, '请先登录', 401);

    const { id } = req.params;
    const comment = store.getCommentById(id);
    if (!comment) return fail(res, '评论不存在', 404);

    if (user.role !== 'admin' && comment.userId !== user.id) {
      return fail(res, '无权操作', 403);
    }

    store.updateComment(id, { collapsed: !comment.collapsed });
    ok(res, { collapsed: !comment.collapsed });
  });

  /* ============================================================
     站长管理路由（需要 admin 权限）
     ============================================================ */

  /** GET /api/admin/stats - 获取统计数据 */
  router.get('/api/admin/stats', (req: Request, res: Response) => {
    const comments = store.getComments();
    const users = store.getUsers();
    const pageIds = [...new Set(comments.map((c) => c.pageId))];
    ok(res, {
      totalComments: comments.length,
      totalUsers: users.length,
      totalPages: pageIds.length,
      recentComments: comments
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10),
    });
  });

  /** GET /api/admin/comments - 获取所有评论（支持分页、筛选） */
  router.get('/api/admin/comments', (req: Request, res: Response) => {
    const { page = '1', pageSize = '20', pageId, keyword } = req.query as any;
    let comments = store.getComments();

    if (pageId) {
      comments = comments.filter((c) => c.pageId === pageId);
    }
    if (keyword) {
      const kw = String(keyword).toLowerCase();
      comments = comments.filter(
        (c) =>
          c.authorName.toLowerCase().includes(kw) ||
          c.content.toLowerCase().includes(kw)
      );
    }

    comments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const p = Math.max(1, parseInt(page, 10));
    const ps = Math.min(100, Math.max(1, parseInt(pageSize, 10)));
    const total = comments.length;
    const items = comments.slice((p - 1) * ps, p * ps);

    ok(res, { items, total, page: p, pageSize: ps });
  });

  /** POST /api/admin/comments/batch-delete - 批量删除评论 */
  router.post('/api/admin/comments/batch-delete', (req: Request, res: Response) => {
    const { ids } = req.body as { ids: string[] };
    if (!Array.isArray(ids) || ids.length === 0) return fail(res, '请提供要删除的评论 ID 列表');

    let deleted = 0;
    for (const id of ids) {
      if (store.deleteComment(id)) deleted++;
    }
    ok(res, { deleted }, `已删除 ${deleted} 条评论`);
  });

  /** PUT /api/admin/comments/:id/pin - 置顶/取消置顶 */
  router.put('/api/admin/comments/:id/pin', (req: Request, res: Response) => {
    const { id } = req.params;
    const comment = store.getCommentById(id);
    if (!comment) return fail(res, '评论不存在', 404);

    store.updateComment(id, { pinned: !comment.pinned });
    ok(res, { pinned: !comment.pinned }, comment.pinned ? '已取消置顶' : '已置顶');
  });

  /** POST /api/admin/comments/batch-pin - 批量置顶 */
  router.post('/api/admin/comments/batch-pin', (req: Request, res: Response) => {
    const { ids } = req.body as { ids: string[] };
    if (!Array.isArray(ids) || ids.length === 0) return fail(res, '请提供要置顶的评论 ID 列表');

    let pinned = 0;
    for (const id of ids) {
      const c = store.getCommentById(id);
      if (c && !c.pinned) {
        store.updateComment(id, { pinned: true });
        pinned++;
      }
    }
    ok(res, { pinned }, `已置顶 ${pinned} 条评论`);
  });

  /** GET /api/admin/config - 获取管理配置 */
  router.get('/api/admin/config', (_req: Request, res: Response) => {
    const config = store.getAdminConfig();
    // 不返回完整 SMTP 密码，只返回掩码
    ok(res, {
      ...config,
      smtp: config.smtp
        ? { ...config.smtp, pass: config.smtp.pass ? '••••••' : '' }
        : null,
    });
  });

  /** PUT /api/admin/config - 更新管理配置（邮件通知等） */
  router.put('/api/admin/config', (req: Request, res: Response) => {
    const updates = req.body as Partial<import('../types/index.js').AdminConfig>;

    // 如果 SMTP 密码是掩码，则保留原密码
    if (updates.smtp?.pass === '••••••') {
      const current = store.getAdminConfig();
      if (current.smtp) {
        updates.smtp.pass = current.smtp.pass;
      }
    }

    const config = store.updateAdminConfig(updates);
    // 返回时再次掩码密码
    ok(res, {
      ...config,
      smtp: config.smtp
        ? { ...config.smtp, pass: config.smtp.pass ? '••••••' : '' }
        : null,
    }, '配置已更新');
  });

  /** POST /api/admin/config/test-email - 测试邮件发送 */
  router.post('/api/admin/config/test-email', async (req: Request, res: Response) => {
    // 测试时需要完整配置，从数据库获取
    const fullConfig = store.getAdminConfig();
    // 如果请求体中有新的 SMTP 配置，合并进来
    if (req.body.smtp) {
      fullConfig.smtp = { ...fullConfig.smtp, ...req.body.smtp } as any;
    }
    if (req.body.adminEmail) {
      fullConfig.adminEmail = req.body.adminEmail;
    }

    const result = await email.testEmail(fullConfig);
    if (result.success) ok(res, null, '测试邮件已发送');
    else fail(res, `测试失败：${result.error}`);
  });

  return router;
}