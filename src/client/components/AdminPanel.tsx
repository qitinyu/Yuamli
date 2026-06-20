import { h, Component } from 'preact';
import { getApi } from '../utils/api.js';
import { renderMarkdown, sanitizeHtml } from '../utils/markdown.js';
import type { Comment, AdminConfig } from '../../types/index.js';

interface Props {
  onClose: () => void;
  onCommentDeleted: (id: string) => void;
  onCommentUpdated: (comment: Comment) => void;
  onRefreshList: () => void;
}

type AdminTab = 'stats' | 'comments' | 'email' | 'admin-login';

interface State {
  tab: AdminTab;
  // 管理面板登录
  adminPassword: string;
  adminLogging: boolean;
  adminError: string;
  // 统计
  stats: any;
  // 评论管理
  allComments: Comment[];
  totalComments: number;
  commentPage: number;
  commentPageSize: number;
  filterPageId: string;
  filterKeyword: string;
  selectedIds: Set<string>;
  selectAll: boolean;
  loading: boolean;
  // 邮件配置
  emailConfig: AdminConfig | null;
  emailSaving: boolean;
  emailTesting: boolean;
  emailMessage: string;
  // 管理面板是否已通过站长验证
  isAdmin: boolean;
}

export class AdminPanel extends Component<Props, State> {
  state: State = {
    tab: 'stats',
    adminPassword: '',
    adminLogging: false,
    adminError: '',
    stats: null,
    allComments: [],
    totalComments: 0,
    commentPage: 1,
    commentPageSize: 20,
    filterPageId: '',
    filterKeyword: '',
    selectedIds: new Set(),
    selectAll: false,
    loading: false,
    emailConfig: null,
    emailSaving: false,
    emailTesting: false,
    emailMessage: '',
    isAdmin: false,
  };

  private api = getApi();

  async componentDidMount() {
    // 检查是否已通过站长验证（从 cookie 获取的用户信息判断）
    try {
      const res = await this.api.getMe();
      if (res.success && res.data && res.data.role === 'admin') {
        this.setState({ isAdmin: true });
        this.loadStats();
        this.loadComments();
        this.loadEmailConfig();
      }
    } catch {}
  }

  loadStats = async () => {
    try {
      const res = await this.api.getAdminStats();
      if (res.success) this.setState({ stats: res.data });
    } catch {}
  };

  loadComments = async () => {
    this.setState({ loading: true });
    try {
      const res = await this.api.getAdminComments({
        page: this.state.commentPage,
        pageSize: this.state.commentPageSize,
        pageId: this.state.filterPageId || undefined,
        keyword: this.state.filterKeyword || undefined,
      });
      if (res.success && res.data) {
        this.setState({
          allComments: res.data.items,
          totalComments: res.data.total,
          loading: false,
          selectedIds: new Set(),
          selectAll: false,
        });
      }
    } catch {
      this.setState({ loading: false });
    }
  };

  loadEmailConfig = async () => {
    try {
      const res = await this.api.getAdminConfig();
      if (res.success) this.setState({ emailConfig: res.data });
    } catch {}
  };

  handleAdminLogin = async (e: Event) => {
    e.preventDefault();
    const { adminPassword } = this.state;
    if (!adminPassword) return;

    this.setState({ adminLogging: true, adminError: '' });
    try {
      const res = await this.api.adminLogin(adminPassword);
      if (res.success) {
        this.setState({ isAdmin: true, tab: 'stats', adminPassword: '' });
        this.loadStats();
        this.loadComments();
        this.loadEmailConfig();
      } else {
        this.setState({ adminError: res.error || '登录失败' });
      }
    } catch (e: any) {
      this.setState({ adminError: e.message });
    } finally {
      this.setState({ adminLogging: false });
    }
  };

  handleBatchDelete = async () => {
    const { selectedIds } = this.state;
    if (selectedIds.size === 0) return;
    if (!confirm(`确定要删除选中的 ${selectedIds.size} 条评论吗？`)) return;

    try {
      const res = await this.api.batchDeleteComments([...selectedIds]);
      if (res.success) {
        this.loadComments();
        this.props.onRefreshList();
      }
    } catch {}
  };

  handleBatchPin = async () => {
    const { selectedIds } = this.state;
    if (selectedIds.size === 0) return;

    try {
      const res = await this.api.batchPinComments([...selectedIds]);
      if (res.success) {
        this.loadComments();
        this.props.onRefreshList();
      }
    } catch {}
  };

  toggleSelect = (id: string) => {
    this.setState((prev) => {
      const newSet = new Set(prev.selectedIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return { selectedIds: newSet, selectAll: false };
    });
  };

  toggleSelectAll = () => {
    this.setState((prev) => {
      if (prev.selectAll) {
        return { selectedIds: new Set(), selectAll: false };
      }
      const allIds = prev.allComments.map((c) => c.id);
      return { selectedIds: new Set(allIds), selectAll: true };
    });
  };

  handleDeleteOne = async (id: string) => {
    if (!confirm('确定删除该评论？')) return;
    try {
      await this.api.deleteComment(id);
      this.loadComments();
      this.props.onCommentDeleted(id);
    } catch {}
  };

  handlePinOne = async (id: string) => {
    try {
      const res = await this.api.pinComment(id);
      if (res.success) {
        this.loadComments();
        this.props.onRefreshList();
      }
    } catch {}
  };

  handleSaveEmailConfig = async (e: Event) => {
    e.preventDefault();
    const { emailConfig } = this.state;
    if (!emailConfig) return;

    this.setState({ emailSaving: true, emailMessage: '' });
    try {
      const res = await this.api.updateAdminConfig(emailConfig);
      if (res.success) {
        this.setState({ emailConfig: res.data, emailSaving: false, emailMessage: '配置已保存' });
      }
    } catch {
      this.setState({ emailSaving: false, emailMessage: '保存失败' });
    }
  };

  handleTestEmail = async () => {
    this.setState({ emailTesting: true, emailMessage: '' });
    try {
      const res = await this.api.testEmail(this.state.emailConfig || undefined);
      if (res.success) {
        this.setState({ emailTesting: false, emailMessage: '测试邮件已发送，请检查收件箱' });
      } else {
        this.setState({ emailTesting: false, emailMessage: `发送失败：${res.error}` });
      }
    } catch (e: any) {
      this.setState({ emailTesting: false, emailMessage: `发送失败：${e.message}` });
    }
  };

  formatTime = (iso: string) => {
    return new Date(iso).toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  };

  render() {
    const {
      tab, adminPassword, adminLogging, adminError, isAdmin,
      stats, allComments, totalComments, commentPage, commentPageSize,
      filterPageId, filterKeyword, selectedIds, selectAll, loading,
      emailConfig, emailSaving, emailTesting, emailMessage,
    } = this.state;

    return (
      <div class="yuamli-admin">
        {/* 管理面板头部 */}
        <div class="yuamli-admin-header">
          <div class="yuamli-admin-title">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>站长管理面板</span>
          </div>
          <button class="yuamli-btn yuamli-btn-ghost" onClick={this.props.onClose}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* 未登录站长密码验证 */}
        {!isAdmin ? (
          <div class="yuamli-admin-login">
            <p>请输入站长密码以访问管理面板</p>
            <form onSubmit={handleAdminLogin}>
              <input
                type="password"
                class="yuamli-input"
                placeholder="站长密码"
                value={adminPassword}
                onInput={(e) => this.setState({ adminPassword: (e.target as HTMLInputElement).value })}
                autocomplete="current-password"
              />
              {adminError && <div class="yuamli-error">{adminError}</div>}
              <button type="submit" class="yuamli-btn yuamli-btn-primary yuamli-btn-block" disabled={adminLogging}>
                {adminLogging ? '验证中...' : '验证身份'}
              </button>
            </form>
          </div>
        ) : (
          <>
            {/* Tab 导航 */}
            <div class="yuamli-admin-tabs">
              <button class={`yuamli-tab ${tab === 'stats' ? 'active' : ''}`} onClick={() => this.setState({ tab: 'stats' })}>
                数据概览
              </button>
              <button class={`yuamli-tab ${tab === 'comments' ? 'active' : ''}`} onClick={() => { this.setState({ tab: 'comments' }); this.loadComments(); }}>
                评论管理
              </button>
              <button class={`yuamli-tab ${tab === 'email' ? 'active' : ''}`} onClick={() => { this.setState({ tab: 'email' }); this.loadEmailConfig(); }}>
                邮件通知
              </button>
            </div>

            {/* 数据概览 */}
            {tab === 'stats' && stats && (
              <div class="yuamli-admin-stats">
                <div class="yuamli-stat-card">
                  <div class="yuamli-stat-num">{stats.totalComments}</div>
                  <div class="yuamli-stat-label">总评论数</div>
                </div>
                <div class="yuamli-stat-card">
                  <div class="yuamli-stat-num">{stats.totalUsers}</div>
                  <div class="yuamli-stat-label">注册用户</div>
                </div>
                <div class="yuamli-stat-card">
                  <div class="yuamli-stat-num">{stats.totalPages}</div>
                  <div class="yuamli-stat-label">评论页面</div>
                </div>
                {stats.recentComments?.length > 0 && (
                  <div class="yuamli-recent-section">
                    <h4>最新评论</h4>
                    <div class="yuamli-recent-list">
                      {stats.recentComments.map((c: Comment) => (
                        <div class="yuamli-recent-item" key={c.id}>
                          <div class="yuamli-recent-meta">
                            <strong>{c.authorName}</strong>
                            <span>{this.formatTime(c.createdAt)}</span>
                            <span class="yuamli-badge yuamli-badge-page">{c.pageId}</span>
                          </div>
                          <div class="yuamli-recent-content">{c.content.substring(0, 80)}{c.content.length > 80 ? '...' : ''}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 评论管理 */}
            {tab === 'comments' && (
              <div class="yuamli-admin-comments">
                {/* 筛选栏 */}
                <div class="yuamli-admin-filters">
                  <input
                    class="yuamli-input yuamli-input-sm"
                    placeholder="按页面 ID 筛选"
                    value={filterPageId}
                    onInput={(e) => this.setState({ filterPageId: (e.target as HTMLInputElement).value })}
                  />
                  <input
                    class="yuamli-input yuamli-input-sm"
                    placeholder="搜索关键词"
                    value={filterKeyword}
                    onInput={(e) => this.setState({ filterKeyword: (e.target as HTMLInputElement).value })}
                  />
                  <button class="yuamli-btn yuamli-btn-primary yuamli-btn-sm" onClick={() => this.loadComments()}>搜索</button>
                </div>

                {/* 批量操作栏 */}
                {selectedIds.size > 0 && (
                  <div class="yuamli-batch-bar">
                    <span>已选择 {selectedIds.size} 条</span>
                    <button class="yuamli-btn yuamli-btn-sm" onClick={this.handleBatchPin}>批量置顶</button>
                    <button class="yuamli-btn yuamli-btn-sm yuamli-btn-danger" onClick={this.handleBatchDelete}>批量删除</button>
                  </div>
                )}

                {/* 评论表格 */}
                {loading ? (
                  <div class="yuamli-list-loading"><div class="yuamli-spinner" /></div>
                ) : (
                  <div class="yuamli-admin-table-wrap">
                    <table class="yuamli-admin-table">
                      <thead>
                        <tr>
                          <th><input type="checkbox" checked={selectAll} onChange={this.toggleSelectAll} /></th>
                          <th>评论者</th>
                          <th>内容</th>
                          <th>页面</th>
                          <th>时间</th>
                          <th>状态</th>
                          <th>操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allComments.map((c) => (
                          <tr key={c.id} class={selectedIds.has(c.id) ? 'yuamli-row-selected' : ''}>
                            <td><input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => this.toggleSelect(c.id)} /></td>
                            <td>
                              <div class="yuamli-admin-user">
                                <img src={c.authorAvatar} class="yuamli-avatar-sm" alt="" />
                                <span>{c.authorName}</span>
                              </div>
                            </td>
                            <td class="yuamli-admin-content-cell">{c.content.substring(0, 60)}{c.content.length > 60 ? '...' : ''}</td>
                            <td><span class="yuamli-badge yuamli-badge-page">{c.pageId}</span></td>
                            <td class="yuamli-admin-time-cell">{this.formatTime(c.createdAt)}</td>
                            <td>
                              {c.pinned && <span class="yuamli-badge yuamli-badge-pin">置顶</span>}
                              {c.collapsed && <span class="yuamli-badge yuamli-badge-collapsed">折叠</span>}
                            </td>
                            <td class="yuamli-admin-actions-cell">
                              <button class="yuamli-btn yuamli-btn-xs" onClick={() => this.handlePinOne(c.id)}>
                                {c.pinned ? '取消置顶' : '置顶'}
                              </button>
                              <button class="yuamli-btn yuamli-btn-xs yuamli-btn-danger" onClick={() => this.handleDeleteOne(c.id)}>删除</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* 分页 */}
                <div class="yuamli-pagination">
                  <span>共 {totalComments} 条</span>
                  <button
                    class="yuamli-btn yuamli-btn-sm"
                    disabled={commentPage <= 1}
                    onClick={() => this.setState({ commentPage: commentPage - 1 }, this.loadComments)}
                  >
                    上一页
                  </button>
                  <span>第 {commentPage} 页</span>
                  <button
                    class="yuamli-btn yuamli-btn-sm"
                    disabled={commentPage * commentPageSize >= totalComments}
                    onClick={() => this.setState({ commentPage: commentPage + 1 }, this.loadComments)}
                  >
                    下一页
                  </button>
                </div>
              </div>
            )}

            {/* 邮件通知配置 */}
            {tab === 'email' && emailConfig && (
              <form class="yuamli-admin-email" onSubmit={handleSaveEmailConfig}>
                <div class="yuamli-form-group">
                  <label class="yuamli-label">
                    <input
                      type="checkbox"
                      checked={emailConfig.emailEnabled}
                      onChange={(e) => this.setState({ emailConfig: { ...emailConfig, emailEnabled: (e.target as HTMLInputElement).checked } })}
                    />
                    启用邮件通知
                  </label>
                  <p class="yuamli-hint">开启后，每次有新评论时将发送邮件通知站长</p>
                </div>

                <div class="yuamli-form-group">
                  <label class="yuamli-label">站长接收邮箱</label>
                  <input
                    type="email"
                    class="yuamli-input"
                    placeholder="your_email@example.com"
                    value={emailConfig.adminEmail}
                    onInput={(e) => this.setState({ emailConfig: { ...emailConfig, adminEmail: (e.target as HTMLInputElement).value } })}
                  />
                </div>

                <div class="yuamli-form-divider">
                  <span>SMTP 服务器配置</span>
                </div>

                <div class="yuamli-form-row">
                  <div class="yuamli-form-group yuamli-form-flex">
                    <label class="yuamli-label">SMTP 服务器地址</label>
                    <input
                      type="text"
                      class="yuamli-input"
                      placeholder="smtp.qq.com"
                      value={emailConfig.smtp?.host || ''}
                      onInput={(e) => this.setState({
                        emailConfig: {
                          ...emailConfig,
                          smtp: { host: (e.target as HTMLInputElement).value, port: emailConfig.smtp?.port || 465, secure: emailConfig.smtp?.secure ?? true, user: emailConfig.smtp?.user || '', pass: emailConfig.smtp?.pass || '' },
                        },
                      })}
                    />
                  </div>
                  <div class="yuamli-form-group yuamli-form-flex yuamli-form-short">
                    <label class="yuamli-label">端口</label>
                    <input
                      type="number"
                      class="yuamli-input"
                      placeholder="465"
                      value={emailConfig.smtp?.port || 465}
                      onInput={(e) => this.setState({
                        emailConfig: {
                          ...emailConfig,
                          smtp: { ...emailConfig.smtp!, port: parseInt((e.target as HTMLInputElement).value) || 465 },
                        },
                      })}
                    />
                  </div>
                </div>

                <div class="yuamli-form-group">
                  <label class="yuamli-label">
                    <input
                      type="checkbox"
                      checked={emailConfig.smtp?.secure ?? true}
                      onChange={(e) => this.setState({
                        emailConfig: {
                          ...emailConfig,
                          smtp: { ...emailConfig.smtp!, secure: (e.target as HTMLInputElement).checked },
                        },
                      })}
                    />
                    使用 SSL/TLS 加密
                  </label>
                </div>

                <div class="yuamli-form-group">
                  <label class="yuamli-label">SMTP 用户名</label>
                  <input
                    type="text"
                    class="yuamli-input"
                    placeholder="your_email@qq.com"
                    value={emailConfig.smtp?.user || ''}
                    onInput={(e) => this.setState({
                      emailConfig: {
                        ...emailConfig,
                        smtp: { ...emailConfig.smtp!, user: (e.target as HTMLInputElement).value },
                      },
                    })}
                  />
                </div>

                <div class="yuamli-form-group">
                  <label class="yuamli-label">SMTP 密码/授权码</label>
                  <input
                    type="password"
                    class="yuamli-input"
                    placeholder="SMTP 授权码"
                    value={emailConfig.smtp?.pass || ''}
                    onInput={(e) => this.setState({
                      emailConfig: {
                        ...emailConfig,
                        smtp: { ...emailConfig.smtp!, pass: (e.target as HTMLInputElement).value },
                      },
                    })}
                  />
                </div>

                <div class="yuamli-form-divider">
                  <span>邮件模板</span>
                </div>

                <div class="yuamli-form-group">
                  <label class="yuamli-label">邮件主题</label>
                  <input
                    type="text"
                    class="yuamli-input"
                    value={emailConfig.emailSubject || ''}
                    onInput={(e) => this.setState({ emailConfig: { ...emailConfig, emailSubject: (e.target as HTMLInputElement).value } })}
                  />
                </div>

                <div class="yuamli-form-group">
                  <label class="yuamli-label">邮件正文模板</label>
                  <p class="yuamli-hint">可用变量：{'{authorName}'}、{'{createdAt}'}、{'{contentSnippet}'}</p>
                  <textarea
                    class="yuamli-input yuamli-textarea-tall"
                    value={emailConfig.emailBody || ''}
                    onInput={(e) => this.setState({ emailConfig: { ...emailConfig, emailBody: (e.target as HTMLInputElement).value } })}
                    rows={6}
                  />
                </div>

                <div class="yuamli-email-actions">
                  <button type="submit" class="yuamli-btn yuamli-btn-primary" disabled={emailSaving}>
                    {emailSaving ? '保存中...' : '保存配置'}
                  </button>
                  <button type="button" class="yuamli-btn yuamli-btn-ghost" onClick={handleTestEmail} disabled={emailTesting}>
                    {emailTesting ? '发送中...' : '发送测试邮件'}
                  </button>
                </div>

                {emailMessage && (
                  <div class={`yuamli-message ${emailMessage.includes('失败') ? 'yuamli-error' : 'yuamli-success'}`}>
                    {emailMessage}
                  </div>
                )}
              </form>
            )}
          </>
        )}
      </div>
    );
  }
}