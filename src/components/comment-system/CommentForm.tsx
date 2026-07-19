'use client'

import { useState, useRef, useEffect } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useCommentStore } from "@/store/use-comment-store"
import { toast } from "sonner"
import { Eye, EyeOff, Send, X, LogOut, User, RefreshCw } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import MarkdownRenderer from "./MarkdownRenderer"

interface CommentFormProps {
  parentId?: string
  replyTo?: { id: string; name: string } | null
  onSubmitted?: () => void
  autoFocus?: boolean
  pageId?: string
  onRefresh?: () => void
  placeholder?: string
}

export default function CommentForm({
  parentId,
  replyTo,
  onSubmitted,
  autoFocus = false,
  pageId = "",
  onRefresh,
  placeholder,
}: CommentFormProps) {
  const { user, setUser, setShowAuthModal, setReplyingTo, incrementRefresh } = useCommentStore()
  const [content, setContent] = useState("")
  const [showPreview, setShowPreview] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [autoFocus])

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error("留言内容不能为空")
      return
    }
    if (!user) {
      setShowAuthModal(true)
      return
    }
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = { content: content.trim() }
      if (parentId) body.parentId = parentId
      if (replyTo) body.replyTo = replyTo
      if (pageId) body.pageId = pageId

      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "发送失败")
        return
      }
      toast.success("留言发送成功！")
      setContent("")
      setShowPreview(false)
      setReplyingTo(null)
      incrementRefresh()
      onSubmitted?.()
    } catch {
      toast.error("网络错误，请重试")
    } finally {
      setSubmitting(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/session", { method: "POST", credentials: "same-origin" })
      setUser(null)
      toast.success("已退出登录")
    } catch { /* ignore */ }
  }

  const handleCancelReply = () => {
    setContent("")
    setReplyingTo(null)
  }

  const getInitial = (name: string) => name.charAt(0).toUpperCase()

  return (
    <div className="space-y-2">
      {replyTo && (
        <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-1.5 text-sm">
          <span className="text-muted-foreground">
            回复 <span className="font-medium text-foreground">@{replyTo.name}</span>
          </span>
          <button onClick={handleCancelReply} className="ml-auto text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {!showPreview ? (
        <Textarea
          ref={textareaRef}
          placeholder={user ? (placeholder || "写下你的留言...（支持 Markdown 语法）") : "登录后即可发表留言"}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[100px] resize-y text-sm leading-relaxed"
          disabled={!user}
          rows={3}
        />
      ) : (
        <MarkdownRenderer content={content} className="min-h-[100px] rounded-md border bg-background p-3 text-sm leading-relaxed" emptyText="暂无内容可预览" />
      )}

      <div className="flex items-center gap-2">
        <Button size="sm" className="h-8 gap-1.5 bg-[#DF9193] text-white hover:bg-[#c97d80]" onClick={handleSubmit} disabled={submitting || !content.trim()}>
          <Send className="h-3.5 w-3.5" />
          {submitting ? "发送中..." : "发送"}
        </Button>
        {user ? (
          <div className="flex items-center gap-1.5">
            <Avatar className="h-6 w-6">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="bg-emerald-100 text-emerald-700 text-[9px] font-medium">
                {getInitial(user.name)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs font-medium text-muted-foreground hidden sm:inline max-w-[80px] truncate">{user.name}</span>
          </div>
        ) : (
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setShowAuthModal(true)}>
            <User className="h-3.5 w-3.5" /> 登录
          </Button>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowPreview(!showPreview)} type="button">
              {showPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{showPreview ? "编辑" : "预览"}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRefresh} type="button">
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>刷新留言</TooltipContent>
        </Tooltip>
        {user && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={handleLogout}>
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>退出登录</TooltipContent>
          </Tooltip>
        )}
        {replyTo && (
          <Button variant="ghost" size="sm" className="h-8 text-xs ml-auto" onClick={handleCancelReply}>取消</Button>
        )}
      </div>
    </div>
  )
}