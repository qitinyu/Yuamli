'use client'

import { useEffect, useCallback, useRef } from "react"
import { useCommentStore } from "@/store/use-comment-store"
import { Skeleton } from "@/components/ui/skeleton"
import { MessageSquare, ChevronDown, ChevronUp } from "lucide-react"
import CommentItem from "./CommentItem"
import CommentForm from "./CommentForm"
import type { Comment } from "@/store/use-comment-store"

export default function CommentList({ pageId = "" }: { pageId?: string }) {
  const { comments, loading, setComments, setLoading, replyingTo, refreshKey } =
    useCommentStore()
  const inited = useRef(false)

  const fetchComments = useCallback(async () => {
    setLoading(true)
    try {
      const url = pageId ? `/api/comments?pageId=${encodeURIComponent(pageId)}` : "/api/comments"
      const res = await fetch(url)
      const data = await res.json()
      if (res.ok) {
        const list = data.comments as Comment[]
        setComments(list)
        // On first load: collapse from the 2nd comment (index 1+), keep 1st visible
        if (!inited.current && list.length > 1) {
          const { toggleCollapse } = useCommentStore.getState()
          for (let i = 1; i < list.length; i++) {
            toggleCollapse(list[i].id)
          }
          inited.current = true
        }
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [setComments, setLoading])

  useEffect(() => {
    fetchComments()
  }, [fetchComments, refreshKey])

  const pinnedComments = comments.filter((c) => c.isPinned)
  const normalComments = comments.filter((c) => !c.isPinned)

  if (loading && comments.length === 0) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-9 w-9 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!loading && comments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <MessageSquare className="h-12 w-12 mb-3 opacity-30" />
        <p className="text-sm">还没有留言，来抢沙发吧~</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {pinnedComments.length > 0 && (
        <div className="space-y-1">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 17-1.5 3H20a1 1 0 0 0 .9-1.45l-9-18a1 1 0 0 0-1.8 0l-9 18A1 1 0 0 0 1 21h9.5Z"/></svg>
            置顶留言
          </h3>
          <div className="space-y-5">
            {pinnedComments.map((c) => (
              <CommentWrapper key={c.id} comment={c} onRefresh={fetchComments} />
            ))}
          </div>
        </div>
      )}

      {normalComments.length > 0 && (
        <div className="space-y-1">
          {pinnedComments.length > 0 && (
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              全部留言 ({normalComments.length})
            </h3>
          )}
          <div className="space-y-5">
            {normalComments.map((c) => (
              <CommentWrapper key={c.id} comment={c} onRefresh={fetchComments} />
            ))}
          </div>
        </div>
      )}

      {/* Reply form — rendered at bottom when replying to any comment */}
      {replyingTo && (
        <div className="pl-12">
          <CommentForm
            parentId={replyingTo.commentId}
            replyTo={{ id: replyingTo.authorId, name: replyingTo.name }}
            onSubmitted={fetchComments}
            autoFocus
            pageId={pageId}
          />
        </div>
      )}
    </div>
  )
}

/** Wraps a top-level comment with collapse/expand. First comment is always expanded. */
function CommentWrapper({
  comment,
  onRefresh,
}: {
  comment: Comment
  onRefresh: () => void
}) {
  const { collapsedComments, toggleCollapse } = useCommentStore()
  const isCollapsed = collapsedComments.has(comment.id)

  if (isCollapsed) {
    return (
      <button
        onClick={() => toggleCollapse(comment.id)}
        className="w-full text-left rounded-lg border border-dashed border-muted-foreground/30 px-4 py-3 text-sm text-muted-foreground hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-colors flex items-center gap-2 group/collapse"
      >
        <ChevronDown className="h-4 w-4 group-hover/collapse:text-emerald-600 shrink-0" />
        <span className="font-medium shrink-0">{comment.author.name}</span>
        <span className="truncate flex-1 opacity-70">{comment.content}</span>
      </button>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-end mb-1">
        <button
          onClick={() => toggleCollapse(comment.id)}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5 px-2 py-1 rounded hover:bg-muted transition-colors"
          title="折叠留言"
        >
          <ChevronUp className="h-3 w-3" />
          收起
        </button>
      </div>
      <CommentItem comment={comment} onRefresh={onRefresh} />
    </div>
  )
}