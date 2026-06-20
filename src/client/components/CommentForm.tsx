import { h, Component } from 'preact';
import { getApi } from '../utils/api.js';
import type { PublicUser, Comment, CreateCommentRequest } from '../../types/index.js';

interface Props {
  pageId: string;
  user: PublicUser;
  maxLength: number;
  onCreated: (comment: Comment) => void;
}

interface State {
  content: string;
  loading: boolean;
  error: string;
  replyTo: string | null;
  replyToName: string | null;
  replyToUserId: string | null;
  preview: string;
  showPreview: boolean;
}

export class CommentForm extends Component<Props, State> {
  state: State = {
    content: '',
    loading: false,
    error: '',
    replyTo: null,
    replyToName: null,
    replyToUserId: null,
    preview: '',
    showPreview: false,
  };

  private api = getApi();
  private textareaRef: any = null;

  /** 外部调用：设置回复目标 */
  setReplyTarget = (parentId: string, name: string, userId: string) => {
    this.setState({ replyTo: parentId, replyToName: name, replyToUserId: userId });
    this.textareaRef?.focus();
  };

  /** 重置回复状态（通过 dataset 联动） */
  componentDidMount() {
    // 监听回复设置事件
    window.addEventListener('yuamli-set-reply', ((e: any) => {
      this.setState({
        replyTo: e.detail.parentId,
        replyToName: e.detail.replyToName,
        replyToUserId: e.detail.replyToUserId,
      });
      this.textareaRef?.focus();
    }) as EventListener);
  }

  handleInput = (e: Event) => {
    const value = (e.target as HTMLTextAreaElement).value;
    this.setState({ content: value, error: '' });
    // 更新 Markdown 预览
    if (this.state.showPreview) {
      this.updatePreview(value);
    }
  };

  updatePreview = async (md: string) => {
    try {
      const { renderMarkdown, sanitizeHtml } = await import('../utils/markdown.js');
      this.setState({ preview: sanitizeHtml(renderMarkdown(md)) });
    } catch {
      this.setState({ preview: '' });
    }
  };

  togglePreview = () => {
    const show = !this.state.showPreview;
    this.setState({ showPreview: show });
    if (show) {
      this.updatePreview(this.state.content);
    }
  };

  cancelReply = () => {
    this.setState({ replyTo: null, replyToName: null, replyToUserId: null });
  };

  handleSubmit = async (e: Event) => {
    e.preventDefault();
    const { content, replyTo, replyToName, replyToUserId } = this.state;
    if (!content.trim()) {
      this.setState({ error: '评论内容不能为空' });
      return;
    }

    this.setState({ loading: true, error: '' });
    try {
      const data: CreateCommentRequest = {
        pageId: this.props.pageId,
        content: content.trim(),
      };
      if (replyTo) {
        data.parentId = replyTo;
        data.replyToName = replyToName || undefined;
        data.replyToUserId = replyToUserId || undefined;
      }

      const res = await this.api.createComment(data);
      if (res.success && res.data) {
        this.setState({ content: '', replyTo: null, replyToName: null, replyToUserId: null, showPreview: false, preview: '' });
        this.props.onCreated(res.data);
      } else {
        this.setState({ error: res.error || '发表失败' });
      }
    } catch (e: any) {
      this.setState({ error: e.message || '网络错误' });
    } finally {
      this.setState({ loading: false });
    }
  };

  render() {
    const { content, loading, error, replyToName, showPreview, preview } = this.state;
    const { maxLength, user } = this.props;

    return (
      <div class="yuamli-form">
        {/* 回复提示 */}
        {replyToName && (
          <div class="yuamli-reply-hint">
            <span>回复 @{replyToName}</span>
            <button class="yuamli-reply-cancel" onClick={this.cancelReply}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}

        <form onSubmit={this.handleSubmit}>
          <div class="yuamli-form-textarea-wrap">
            <textarea
              ref={(el: any) => { this.textareaRef = el; }}
              class="yuamli-form-textarea"
              placeholder="写下你的评论...（支持 Markdown 语法）"
              value={content}
              onInput={this.handleInput}
              maxLength={maxLength}
              rows={4}
            />
            {/* Markdown 预览 */}
            {showPreview && (
              <div class="yuamli-preview yuamli-markdown-body" dangerouslySetInnerHTML={{ __html: preview }} />
            )}
          </div>

          <div class="yuamli-form-actions">
            <div class="yuamli-form-actions-left">
              <span class="yuamli-char-count">{content.length}/{maxLength}</span>
              <button
                type="button"
                class={`yuamli-btn yuamli-btn-sm ${showPreview ? 'yuamli-btn-active' : 'yuamli-btn-ghost'}`}
                onClick={this.togglePreview}
              >
                {showPreview ? '编辑' : '预览'}
              </button>
            </div>
            <button
              type="submit"
              class="yuamli-btn yuamli-btn-primary"
              disabled={loading || !content.trim()}
            >
              {loading ? '发送中...' : '发表评论'}
            </button>
          </div>

          {error && <div class="yuamli-error yuamli-error-inline">{error}</div>}
        </form>
      </div>
    );
  }
}