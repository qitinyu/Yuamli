import { h } from 'preact';
import { CommentItem } from './CommentItem.js';
import type { PublicUser, Comment } from '../../types/index.js';

interface Props {
  comments: Comment[];
  currentUser: PublicUser | null;
  loading: boolean;
  error: string;
  onDelete: (id: string) => void;
  onUpdate: (comment: Comment) => void;
  onToggleCollapse: (id: string) => void;
  onReply: (parentId: string, replyToName: string, replyToUserId: string) => void;
}

export function CommentList({ comments, currentUser, loading, error, onDelete, onUpdate, onToggleCollapse, onReply }: Props) {
  if (loading) {
    return (
      <div class="yuamli-list-loading">
        <div class="yuamli-spinner" />
        <span>加载评论中...</span>
      </div>
    );
  }

  if (error) {
    return <div class="yuamli-list-error">加载失败：{error}</div>;
  }

  if (comments.length === 0) {
    return (
      <div class="yuamli-empty">
        <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <p>还没有评论，来做第一个评论者吧！</p>
      </div>
    );
  }

  // 构建评论树：顶级评论 + 子评论
  const topLevel = comments.filter((c) => !c.parentId);
  const childMap = new Map<string, Comment[]>();
  for (const c of comments) {
    if (c.parentId) {
      const children = childMap.get(c.parentId) || [];
      children.push(c);
      childMap.set(c.parentId, children);
    }
  }

  return (
    <div class="yuamli-list">
      {topLevel.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          children={childMap.get(comment.id) || []}
          currentUser={currentUser}
          depth={0}
          onDelete={onDelete}
          onUpdate={onUpdate}
          onToggleCollapse={onToggleCollapse}
          onReply={onReply}
          allComments={comments}
        />
      ))}
    </div>
  );
}