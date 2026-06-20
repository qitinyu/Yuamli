/* ============================================================
   Yuamli Markdown 渲染工具
   ============================================================ */
import { marked } from 'marked';

// 配置 marked，仅启用基础语法
marked.setOptions({
  gfm: true,
  breaks: true,
});

/** 渲染 Markdown 为 HTML */
export function renderMarkdown(md: string): string {
  if (!md) return '';
  try {
    return marked.parse(md, { async: false }) as string;
  } catch {
    return md;
  }
}

/** 对 HTML 进行简单清洗，防止 XSS（基础版） */
export function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
}