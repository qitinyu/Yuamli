'use client'

import { useState } from "react"
import { useCommentStore } from "@/store/use-comment-store"
import { toast } from "sonner"
import ReactMarkdown from "react-markdown"
import { formatDistanceToNow } from "date-fns"
import { zhCN } from "date-fns/locale"
import {
  MoreHorizontal,
  Pin,
  PinOff,
  Star,
  StarOff,
  Trash2,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"
import { Pencil, Check, X } from "lucide-react"
import CommentForm from "./CommentForm"
import type { Comment } from "@/store/use-comment-store"

interface CommentItemProps {
  comment: Comment
  isReply?: boolean
  onRefresh: () => void
}

export default function CommentItem({
  comment,
  isReply = false,
  onRefresh,
}: CommentItemProps) {
  const { user, isAdmin, setReplyingTo, incrementRefresh } =
    useCommentStore()

  // LOCAL state for reply expansion within this comment
  const [showAllReplies, setShowAllReplies] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState(comment.content)
  const [editLoading, setEditLoading] = useState(false)

  const isAuthor = user?.id === comment.author.id
  const canModerate = isAdmin
  const hasReplies = comment.replies && comment.replies.length > 0
  const hiddenReplyCount = hasReplies
    ? Math.max(0, comment.replies!.length - 1)
    : 0

  const timeAgo = formatDistanceToNow(new Date(comment.createdAt), {
    addSuffix: true,
    locale: zhCN,
  })

  const handlePin = async () => {
    try {
      const res = await fetch(`/api/comments/${comment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinned: !comment.isPinned }),
      })
      if (!res.ok) { toast.error("操作失败"); return }
      toast.success(comment.isPinned ? "已取消置顶" : "已置顶")
      incrementRefresh(); onRefresh()
    } catch { toast.error("网络错误") }
  }

  const handleFeature = async () => {
    try {
      const res = await fetch(`/api/comments/${comment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFeatured: !comment.isFeatured }),
      })
      if (!res.ok) { toast.error("操作失败"); return }
      toast.success(comment.isFeatured ? "已取消精华" : "已设为精华")
      incrementRefresh(); onRefresh()
    } catch { toast.error("网络错误") }
  }

  const handleDelete = async () => {
    if (!confirm("确认删除这条留言及其所有回复？")) return
    try {
      const res = await fetch(`/api/comments/${comment.id}`, { method: "DELETE" })
      if (!res.ok) { toast.error("删除失败"); return }
      toast.success("已删除")
      incrementRefresh(); onRefresh()
    } catch { toast.error("网络错误") }
  }

  const handleEditSave = async () => {
    if (!editContent.trim()) { toast.error("内容不能为空"); return }
    setEditLoading(true)
    try {
      const res = await fetch(`/api/comments/${comment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent.trim() }),
      })
      if (!res.ok) { toast.error("编辑失败"); return }
      toast.success("已更新")
      setEditing(false)
      incrementRefresh(); onRefresh()
    } catch { toast.error("网络错误") }
    finally { setEditLoading(false) }
  }

  const handleReply = () => {
    if (!user) {
      useCommentStore.getState().setShowAuthModal(true)
      return
    }
    setReplyingTo({ commentId: comment.id, authorId: comment.author.id, name: comment.author.name })
  }

  const getInitial = (name: string) => name.charAt(0).toUpperCase()

  return (
    <div className="group">
      <div className={`flex gap-3 ${isReply ? "mt-3 pl-4 border-l-2 border-muted" : ""}`}>
        <Avatar className="h-9 w-9 shrink-0 mt-0.5">
          <AvatarImage src={comment.author.avatar} alt={comment.author.name} />
          <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-medium">
            {getInitial(comment.author.name)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{comment.author.name}</span>
            {comment.author.type === "github" && (
              <Badge variant="secondary" className="h-4 px-1.5 text-[10px] gap-0.5">
                <svg className="h-2.5 w-2.5" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
                GitHub
              </Badge>
            )}
            {comment.isPinned && (
              <Badge className="h-4 px-1.5 text-[10px] gap-0.5 bg-amber-500 hover:bg-amber-600 text-white">
                <Pin className="h-2.5 w-2.5" /> 置顶
              </Badge>
            )}
            {comment.isFeatured && (
              <Badge className="h-4 px-1.5 text-[10px] gap-0.5 bg-rose-500 hover:bg-rose-600 text-white">
                <Star className="h-2.5 w-2.5" /> 精华
              </Badge>
            )}
            <span className="text-xs text-muted-foreground ml-auto">{timeAgo}</span>

            {(isAuthor || canModerate) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  {isAuthor && (
                    <DropdownMenuItem onClick={() => setEditing(true)}>
                      <Pencil className="mr-2 h-3.5 w-3.5" /> 编辑
                    </DropdownMenuItem>
                  )}
                  {canModerate && (
                    <>
                      <DropdownMenuItem onClick={handlePin}>
                        {comment.isPinned ? <PinOff className="mr-2 h-3.5 w-3.5" /> : <Pin className="mr-2 h-3.5 w-3.5" />}
                        {comment.isPinned ? "取消置顶" : "置顶"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleFeature}>
                        {comment.isFeatured ? <StarOff className="mr-2 h-3.5 w-3.5" /> : <Star className="mr-2 h-3.5 w-3.5" />}
                        {comment.isFeatured ? "取消精华" : "设为精华"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  {(isAuthor || canModerate) && (
                    <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
                      <Trash2 className="mr-2 h-3.5 w-3.5" /> 删除
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Reply to indicator */}
          {comment.replyTo && (
            <div className="text-xs text-muted-foreground mt-0.5">
              回复 <span className="font-medium">@{comment.replyTo.name}</span>
            </div>
          )}

          {/* Content */}
          {editing ? (
            <div className="mt-2 space-y-2">
              <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="min-h-[80px] text-sm" rows={3} />
              <div className="flex gap-2">
                <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={handleEditSave} disabled={editLoading}>
                  <Check className="h-3 w-3 mr-1" /> 保存
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setEditing(false); setEditContent(comment.content) }}>
                  <X className="h-3 w-3 mr-1" /> 取消
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-1.5 text-sm leading-relaxed prose prose-sm max-w-none prose-zinc dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-pre:bg-muted prose-pre:p-2 prose-code:text-xs prose-a:text-emerald-600 dark:prose-a:text-emerald-400">
              <ReactMarkdown>{comment.content}</ReactMarkdown>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 mt-2">
            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1" onClick={handleReply}>
              <MessageSquare className="h-3 w-3" /> 回复
            </Button>
            {comment.updatedAt !== comment.createdAt && (
              <span className="text-[10px] text-muted-foreground">已编辑</span>
            )}
          </div>

          {/* Replies: recursive nesting — first reply visible, rest behind toggle */}
          {hasReplies && comment.replies!.length > 0 && (
            <>
              {/* Always show first reply */}
              <div className="mt-2">
                <CommentItem comment={comment.replies![0]} isReply onRefresh={onRefresh} />
              </div>
              {/* Toggle for remaining replies */}
              {hiddenReplyCount > 0 && (
                <div className="mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
                    onClick={() => setShowAllReplies(!showAllReplies)}
                  >
                    {showAllReplies ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    {showAllReplies ? "收起回复" : `展开更多回复 (${hiddenReplyCount})`}
                  </Button>
                  {showAllReplies && (
                    <div className="space-y-0.5">
                      {comment.replies!.slice(1).map((reply) => (
                        <CommentItem key={reply.id} comment={reply} isReply onRefresh={onRefresh} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}