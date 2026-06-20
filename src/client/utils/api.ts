/* ============================================================
   Yuamli API 客户端
   ============================================================ */
import type { ApiResponse, PublicUser, Comment, CreateCommentRequest, AdminConfig } from '../../types/index.js';

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl || '';
  }

  private async request<T>(path: string, options?: RequestInit): Promise<ApiResponse<T>> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    return res.json();
  }

  /* -------- 认证 -------- */

  async getGitHubAuthUrl(): Promise<ApiResponse<{ url: string }>> {
    return this.request('/api/auth/github');
  }

  async register(data: { account: string; password: string; nickname: string }): Promise<ApiResponse<PublicUser>> {
    return this.request('/api/auth/register', { method: 'POST', body: JSON.stringify(data) });
  }

  async login(data: { account: string; password: string }): Promise<ApiResponse<PublicUser>> {
    return this.request('/api/auth/login', { method: 'POST', body: JSON.stringify(data) });
  }

  async adminLogin(password: string): Promise<ApiResponse<{ token: string }>> {
    return this.request('/api/auth/admin/login', { method: 'POST', body: JSON.stringify({ password }) });
  }

  async logout(): Promise<ApiResponse> {
    return this.request('/api/auth/logout', { method: 'POST' });
  }

  async getMe(): Promise<ApiResponse<PublicUser>> {
    return this.request('/api/auth/me');
  }

  /* -------- 评论 -------- */

  async getComments(pageId: string, page = 1, pageSize = 50): Promise<ApiResponse<{ items: Comment[]; total: number; page: number; pageSize: number }>> {
    return this.request(`/api/comments?pageId=${encodeURIComponent(pageId)}&page=${page}&pageSize=${pageSize}`);
  }

  async createComment(data: CreateCommentRequest): Promise<ApiResponse<Comment>> {
    return this.request('/api/comments', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateComment(id: string, content: string): Promise<ApiResponse<Comment>> {
    return this.request(`/api/comments/${id}`, { method: 'PUT', body: JSON.stringify({ content }) });
  }

  async deleteComment(id: string): Promise<ApiResponse> {
    return this.request(`/api/comments/${id}`, { method: 'DELETE' });
  }

  async toggleComment(id: string): Promise<ApiResponse<{ collapsed: boolean }>> {
    return this.request(`/api/comments/${id}/toggle`, { method: 'POST' });
  }

  /* -------- 站长管理 -------- */

  async getAdminStats(): Promise<ApiResponse<any>> {
    return this.request('/api/admin/stats');
  }

  async getAdminComments(params: { page?: number; pageSize?: number; pageId?: string; keyword?: string } = {}): Promise<ApiResponse<{ items: Comment[]; total: number }>> {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.pageSize) q.set('pageSize', String(params.pageSize));
    if (params.pageId) q.set('pageId', params.pageId);
    if (params.keyword) q.set('keyword', params.keyword);
    return this.request(`/api/admin/comments?${q.toString()}`);
  }

  async batchDeleteComments(ids: string[]): Promise<ApiResponse<{ deleted: number }>> {
    return this.request('/api/admin/comments/batch-delete', { method: 'POST', body: JSON.stringify({ ids }) });
  }

  async pinComment(id: string): Promise<ApiResponse<{ pinned: boolean }>> {
    return this.request(`/api/admin/comments/${id}/pin`, { method: 'PUT' });
  }

  async batchPinComments(ids: string[]): Promise<ApiResponse<{ pinned: number }>> {
    return this.request('/api/admin/comments/batch-pin', { method: 'POST', body: JSON.stringify({ ids }) });
  }

  async getAdminConfig(): Promise<ApiResponse<AdminConfig>> {
    return this.request('/api/admin/config');
  }

  async updateAdminConfig(config: Partial<AdminConfig>): Promise<ApiResponse<AdminConfig>> {
    return this.request('/api/admin/config', { method: 'PUT', body: JSON.stringify(config) });
  }

  async testEmail(config?: Partial<AdminConfig>): Promise<ApiResponse> {
    return this.request('/api/admin/config/test-email', { method: 'POST', body: JSON.stringify(config || {}) });
  }
}

// 全局单例（通过 init 初始化）
let _api: ApiClient | null = null;

export function initApi(baseUrl: string = ''): ApiClient {
  _api = new ApiClient(baseUrl);
  return _api;
}

export function getApi(): ApiClient {
  if (!_api) throw new Error('ApiClient 未初始化，请先调用 initApi()');
  return _api;
}