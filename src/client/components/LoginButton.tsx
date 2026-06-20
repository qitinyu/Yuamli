import { h } from 'preact';

interface Props {
  onClick: () => void;
}

export function LoginButton({ onClick }: Props) {
  return (
    <button class="yuamli-btn yuamli-btn-primary" onClick={onClick}>
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
      登录
    </button>
  );
}