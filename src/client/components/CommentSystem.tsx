import { h, Component } from 'preact';
import { getApi } from '../utils/api.js';
import type { PublicUser, Comment } from '../../types/index.js';
import { LoginButton } from './LoginButton.js';
import { LoginModal } from './LoginModal.js';
import { CommentForm } from './CommentForm.js';
import { CommentList } from './CommentList.js';
import { AdminPanel } from './AdminPanel.js';

interface Props {
  pageId: string;
  themeColor?: string;
  maxLength?: number;
}

interface State {
  user: PublicUser | null;
  showLogin: boolean;
  showAdmin: boolean;
  comments: Comment[];
  total: number;
  loading: boolean;
  error: string;
}

export class CommentSystem extends Component<Props, State> {
  state: State = {
    user: null,
    showLogin: false,
    showAdmin: false,
    comments: [],
    total: 0,
    loading: true,
    error: '',
  };

  private api = getApi();

  async componentDidMount() {
    // 检查登录状态
    try {
      const res = await this.api.getMe();
      if (res.success && res.data) {
        this.setState({ user: res.data });
      }
    } catch {}

    // 加载评论
    await this.loadComments();
  }

  loadComments = async () => {
    this.setState({ loading: true, error: '' });
    try {
      const res = await this.api.getComments(this.props.pageId);
      if (res.success && res.data) {
        this.setState({
          comments: res.data.items,
          total: res.data.total,
          loading: false,
        });
      } else {
        this.setState({ error: res.error || '加载评论失败', loading: false });
      }
    } catch (e: any) {
      this.setState({ error: e.message || '网络错误', loading: false });
    }
  };

  handleLogin = (user: PublicUser) => {
    this.setState({ user, showLogin: false });
  };

  handleLogout = async () => {
    await this.api.logout();
    this.setState({ user: null, showAdmin: false });
  };

  handleCommentCreated = (comment: Comment) => {
    this.setState((prev) => ({
      comments: [comment, ...prev.comments],
      total: prev.total + 1,
    }));
  };

  handleCommentDeleted = (id: string) => {
    this.setState((prev) => ({
      comments: prev.comments.filter((c) => c.id !== id),
      total: prev.total - 1,
    }));
  };

  handleCommentUpdated = (comment: Comment) => {
    this.setState((prev) => ({
      comments: prev.comments.map((c) => (c.id === comment.id ? comment : c)),
    }));
  };

  handleToggleCollapse = async (id: string) => {
    const res = await this.api.toggleComment(id);
    if (res.success && res.data !== undefined) {
      this.setState((prev) => ({
        comments: prev.comments.map((c) =>
          c.id === id ? { ...c, collapsed: res.data!.collapsed } : c
        ),
      }));
    }
  };

  render() {
    const { user, showLogin, showAdmin, comments, total, loading, error } = this.state;
    const { themeColor } = this.props;

    return (
      <div class="yuamli" style={`--yuamli-primary: ${themeColor || '#4f46e5'};`}>
        {/* 顶部栏：标题 + 登录按钮 */}
        <div class="yuamli-header">
          <div class="yuamli-header-left">
            <svg class="yuamli-logo" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span class="yuamli-title">评论 ({total})</span>
          </div>
          <div class="yuamli-header-right">
            {user && user.role === 'admin' && (
              <button
                class="yuamli-btn yuamli-btn-ghost"
                onClick={() => this.setState({ showAdmin: !showAdmin })}
              >
                {showAdmin ? '关闭管理' : '管理面板'}
              </button>
            )}
            {user ? (
              <div class="yuamli-user-info">
                {user.avatar && <img class="yuamli-avatar" src={user.avatar} alt="" />}
                <span class="yuamli-nickname">{user.nickname}</span>
                <button class="yuamli-btn yuamli-btn-ghost" onClick={this.handleLogout}>退出</button>
              </div>
            ) : (
              <LoginButton onClick={() => this.setState({ showLogin: true })} />
            )}
          </div>
        </div>

        {/* 评论发表区域 */}
        {user && (
          <CommentForm
            pageId={this.props.pageId}
            user={user}
            maxLength={this.props.maxLength || 10000}
            onCreated={this.handleCommentCreated}
          />
        )}

        {/* 评论列表 */}
        <CommentList
          comments={comments}
          currentUser={user}
          loading={loading}
          error={error}
          onDelete={this.handleCommentDeleted}
          onUpdate={this.handleCommentUpdated}
          onToggleCollapse={this.handleToggleCollapse}
          onReply={(parentId, replyToName, replyToUserId) => {
            // 滚动到评论框并设置回复目标
            const form = document.querySelector('.yuamli-form-textarea') as HTMLTextAreaElement;
            if (form) {
              form.focus();
              form.placeholder = `回复 @${replyToName}...`;
              form.dataset.replyTo = parentId;
              form.dataset.replyToName = replyToName;
              form.dataset.replyToUserId = replyToUserId || '';
            }
          }}
        />

        {/* 登录悬浮窗 */}
        {showLogin && (
          <LoginModal
            onClose={() => this.setState({ showLogin: false })}
            onLogin={this.handleLogin}
          />
        )}

        {/* 站长管理面板 */}
        {showAdmin && user?.role === 'admin' && (
          <AdminPanel
            onClose={() => this.setState({ showAdmin: false })}
            onCommentDeleted={(id) => this.handleCommentDeleted(id)}
            onCommentUpdated={(c) => this.handleCommentUpdated(c)}
            onRefreshList={this.loadComments}
          />
        )}
      </div>
    );
  }
}