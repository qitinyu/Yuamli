import { h, Component } from 'preact';
import { getApi } from '../utils/api.js';
import { renderMarkdown, sanitizeHtml } from '../utils/markdown.js';
import type { PublicUser, Comment } from '../../types/index.js';

interface Props {
  comment: Comment;
  children: Comment[];
  currentUser: PublicUser | null;
  depth: number;
  onDelete: (id: string) => void;
  onUpdate: (comment: Comment) => void;
  onToggleCollapse: (id: string) => void;
  onReply: (parentId: string, replyToName: string, replyToUserId: string) => void;
  allComments: Comment[];
}

interface State {
  editing: boolean;
  editContent: string;
  menuOpen: boolean;
  renderedHtml: string;
}

export class CommentItem extends Component<Props, State> {
  state: State = {
    editing: false,
    editContent: '',
    menuOpen: false,
    renderedHtml: '',
  };

  private api = getApi();

  componentDidMount() {
    // 预渲染 Markdown
    this.setState({ renderedHtml: sanitizeHtml(renderMarkdown(this.props.comment.content)) });
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.comment.content !== this.props.comment.content || prevProps.comment.id !== this.props.comment.id) {
      this.setState({ renderedHtml: sanitizeHtml(renderMarkdown(this.props.comment.content)) });
    }
  }

  formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
    if (diff < 2592000000) return `${Math.floor(diff / 86400000)} 天前`;
    return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  handleEdit = () => {
    this.setState({ editing: true, editContent: this.props.comment.content, menuOpen: false });
  };

  handleSaveEdit = async () => {
    const { editContent } = this.state;
    if (!editContent.trim()) return;

    try {
      const res = await this.api.updateComment(this.props.comment.id, editContent);
      if (res.success && res.data) {
        this.props.onUpdate(res.data);
        this.setState({ editing: false });
      }
    } catch {}
  };

  handleDelete = async () => {
    if (!confirm('确定要删除这条评论吗？')) return;
    try {
      await this.api.deleteComment(this.props.comment.id);
      this.props.onDelete(this.props.comment.id);
    } catch {}
  };

  handleReply = () => {
    this.props.onReply(this.props.comment.id, this.props.comment.authorName, this.props.comment.userId);
    // 设置评论框的回复目标
    window.dispatchEvent(new CustomEvent('yuamli-set-reply', {
      detail: {
        parentId: this.props.comment.id,
        replyToName: this.props.comment.authorName,
        replyToUserId: this.props.comment.userId,
      },
    }));
  };

  toggleMenu = () => {
    this.setState({ menuOpen: !this.state.menuOpen });
  };

  render() {
    const { comment, children, currentUser, depth } = this.props;
    const { editing, editContent, menuOpen, renderedHtml } = this.state;
    const isOwner = currentUser && currentUser.id === comment.userId;
    const isAdmin = currentUser?.role === 'admin';
    const canManage = isOwner || isAdmin;

    return (
      <div class={`yuamli-comment ${comment.pinned ? 'yuamli-comment-pinned' : ''}`}>
        <div class="yuamli-comment-main" style={depth > 0 ? `margin-left: ${Math.min(depth, 4) * 48}px;` : ''}>
          {/* 头像 */}
          <img
            class="yuamli-comment-avatar"
            src={comment.authorAvatar || `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(comment.authorName)}`}
            alt={comment.authorName}
          />

          {/* 内容区 */}
          <div class="yuamli-comment-body">
            {/* 头部：昵称 + 时间 + 操作 */}
            <div class="yuamli-comment-header">
              <div class="yuamli-comment-meta">
                <span class="yuamli-comment-author">{comment.authorName}</span>
                {comment.pinned && <span class="yuamli-badge yuamli-badge-pin">置顶</span>}
                <span class="yuamli-comment-time">{this.formatTime(comment.createdAt)}</span>
                {comment.replyToName && (
                  <span class="yuamli-comment-reply-to">回复 @{comment.replyToName}</span>
                )}
              </div>

              {/* 操作按钮 */}
              {canManage && (
                <div class="yuamli-comment-actions">
                  <button class="yuamli-comment-action-btn" onClick={this.toggleMenu} title="更多操作">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                      <circle cx="12" cy="5" r="2" />
                      <circle cx="12" cy="12" r="2" />
                      <circle cx="12" cy="19" r="2" />
                    </svg>
                  </button>
                  {menuOpen && (
                    <div class="yuamli-comment-menu">
                      {!editing && isOwner && (
                        <button onClick={this.handleEdit}>编辑</button>
                      )}
                      {isOwner && (
                        <button
                          onClick={() => {
                            this.props.onToggleCollapse(comment.id);
                            this.setState({ menuOpen: false });
                          }}
                        >
                          {comment.collapsed ? '展开' : '折叠'}
                        </button>
                      )}
                      {currentUser && (
                        <button onClick={this.handleReply}>回复</button>
                      )}
                      {(isOwner || isAdmin) && (
                        <button class="yuamli-menu-danger" onClick={this.handleDelete}>删除</button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 评论内容 */}
            {editing ? (
              <div class="yuamli-comment-edit">
                <textarea
                  class="yuamli-input yuamli-edit-textarea"
                  value={editContent}
                  onInput={(e) => this.setState({ editContent: (e.target as HTMLInputElement).value })}
                  rows={4}
                />
                <div class="yuamli-edit-actions">
                  <button class="yuamli-btn yuamli-btn-sm yuamli-btn-primary" onClick={this.handleSaveEdit}>保存</button>
                  <button class="yuamli-btn yuamli-btn-sm yuamli-btn-ghost" onClick={() => this.setState({ editing: false })}>取消</button>
                </div>
              </div>
            ) : comment.collapsed ? (
              <div class="yuamli-comment-collapsed" onClick={() => this.props.onToggleCollapse(comment.id)}>
                <span>该评论已被折叠，点击展开</span>
              </div>
            ) : (
              <div
                class="yuamli-comment-content yuamli-markdown-body"
                dangerouslySetInnerHTML={{ __html: renderedHtml }}
              />
            )}
          </div>
        </div>

        {/* 子评论 */}
        {children.length > 0 && !comment.collapsed && (
          <div class="yuamli-children">
            {children.map((child) => (
              <CommentItem
                key={child.id}
                comment={child}
                children={[]}
                currentUser={currentUser}
                depth={depth + 1}
                onDelete={this.props.onDelete}
                onUpdate={this.props.onUpdate}
                onToggleCollapse={this.props.onToggleCollapse}
                onReply={this.props.onReply}
                allComments={this.props.allComments}
              />
            ))}
          </div>
        )}
      </div>
    );
  }
}