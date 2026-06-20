import { h, Component } from 'preact';
import { getApi } from '../utils/api.js';
import type { PublicUser } from '../../types/index.js';

interface Props {
  onClose: () => void;
  onLogin: (user: PublicUser) => void;
}

type Tab = 'login' | 'register';

interface State {
  tab: Tab;
  account: string;
  password: string;
  nickname: string;
  loading: boolean;
  error: string;
  githubLoading: boolean;
}

export class LoginModal extends Component<Props, State> {
  state: State = {
    tab: 'login',
    account: '',
    password: '',
    nickname: '',
    loading: false,
    error: '',
    githubLoading: false,
  };

  private api = getApi();

  handleSubmit = async (e: Event) => {
    e.preventDefault();
    const { tab, account, password, nickname } = this.state;

    if (!account.trim() || !password.trim()) {
      this.setState({ error: '账号和密码不能为空' });
      return;
    }

    this.setState({ loading: true, error: '' });
    try {
      let res;
      if (tab === 'register') {
        if (!nickname.trim()) {
          this.setState({ error: '请输入昵称', loading: false });
          return;
        }
        res = await this.api.register({ account: account.trim(), password, nickname: nickname.trim() });
      } else {
        res = await this.api.login({ account: account.trim(), password });
      }
      if (res.success && res.data) {
        this.props.onLogin(res.data);
      } else {
        this.setState({ error: res.error || (tab === 'login' ? '登录失败' : '注册失败') });
      }
    } catch (e: any) {
      this.setState({ error: e.message || '网络错误' });
    } finally {
      this.setState({ loading: false });
    }
  };

  handleGitHubLogin = async () => {
    this.setState({ githubLoading: true });
    try {
      const res = await this.api.getGitHubAuthUrl();
      if (res.success && res.data) {
        // 直接跳转到 GitHub 授权页面
        window.location.href = res.data.url;
      }
    } catch (e: any) {
      this.setState({ error: e.message || '获取 GitHub 授权链接失败', githubLoading: false });
    }
  };

  handleOverlayClick = (e: Event) => {
    if ((e.target as HTMLElement).classList.contains('yuamli-modal-overlay')) {
      this.props.onClose();
    }
  };

  render() {
    const { tab, account, password, nickname, loading, error, githubLoading } = this.state;

    return (
      <div class="yuamli-modal-overlay" onClick={this.handleOverlayClick}>
        <div class="yuamli-modal">
          {/* 关闭按钮 */}
          <button class="yuamli-modal-close" onClick={this.props.onClose}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* 标题 */}
          <h3 class="yuamli-modal-title">欢迎来到 Yuamli</h3>

          {/* 登录/注册 Tab 切换 */}
          <div class="yuamli-tabs">
            <button
              class={`yuamli-tab ${tab === 'login' ? 'active' : ''}`}
              onClick={() => this.setState({ tab: 'login', error: '' })}
            >
              登录
            </button>
            <button
              class={`yuamli-tab ${tab === 'register' ? 'active' : ''}`}
              onClick={() => this.setState({ tab: 'register', error: '' })}
            >
              注册
            </button>
          </div>

          {/* GitHub 授权登录按钮 */}
          <button
            class="yuamli-github-btn"
            onClick={handleGitHubLogin}
            disabled={githubLoading}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
            {githubLoading ? '正在跳转 GitHub...' : '使用 GitHub 授权登录'}
          </button>

          {/* 分隔线 */}
          <div class="yuamli-divider">
            <span>或使用账号{tab === 'login' ? '登录' : '注册'}</span>
          </div>

          {/* 表单 */}
          <form onSubmit={this.handleSubmit} class="yuamli-auth-form">
            {tab === 'register' && (
              <div class="yuamli-form-group">
                <input
                  type="text"
                  class="yuamli-input"
                  placeholder="请输入昵称"
                  value={nickname}
                  onInput={(e) => this.setState({ nickname: (e.target as HTMLInputElement).value })}
                />
              </div>
            )}
            <div class="yuamli-form-group">
              <input
                type="text"
                class="yuamli-input"
                placeholder="请输入邮箱/QQ号"
                value={account}
                onInput={(e) => this.setState({ account: (e.target as HTMLInputElement).value })}
                autocomplete="username"
              />
            </div>
            <div class="yuamli-form-group">
              <input
                type="password"
                class="yuamli-input"
                placeholder="请输入密码"
                value={password}
                onInput={(e) => this.setState({ password: (e.target as HTMLInputElement).value })}
                autocomplete="current-password"
              />
            </div>

            {error && <div class="yuamli-error">{error}</div>}

            <button type="submit" class="yuamli-btn yuamli-btn-primary yuamli-btn-block" disabled={loading}>
              {loading ? '请稍候...' : tab === 'login' ? '登录' : '注册'}
            </button>
          </form>
        </div>
      </div>
    );
  }
}