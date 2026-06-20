import { h, render } from 'preact';
import { CommentSystem } from './components/CommentSystem.js';
import { initApi } from './utils/api.js';

/**
 * Yuamli 客户端入口
 * 使用方式：<script>Yuamli.init({ pageId: 'xxx', server: 'http://localhost:3456' })</script>
 */

interface YuamliOptions {
  /** 当前页面唯一标识（必填） */
  pageId: string;
  /** 后端 API 地址（默认同源） */
  server?: string;
  /** 主题色（默认 #4f46e5） */
  themeColor?: string;
  /** 最大评论长度（默认 10000） */
  maxLength?: number;
}

function mount(options: YuamliOptions) {
  // 创建挂载容器
  const container = document.createElement('div');
  container.id = 'yuamli-root';
  container.setAttribute('data-page-id', options.pageId);
  document.currentScript?.parentElement?.appendChild(container) || document.body.appendChild(container);

  // 初始化 API
  initApi(options.server || '');

  // 渲染组件
  render(
    <CommentSystem
      pageId={options.pageId}
      themeColor={options.themeColor || '#4f46e5'}
      maxLength={options.maxLength || 10000}
    />,
    container
  );
}

// 暴露全局方法
declare global {
  interface Window {
    Yuamli: {
      init: (options: YuamliOptions) => void;
    };
  }
}

(window as any).Yuamli = { init: mount };

console.log('[Yuamli] 评论系统已加载 v1.0.0');