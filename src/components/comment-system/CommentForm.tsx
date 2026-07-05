'use client'

import { useState, useRef, useEffect } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useCommentStore } from "@/store/use-comment-store"
import { toast } from "sonner"
import ReactMarkdown from "react-markdown"
import { Eye, EyeOff, Send, X, Bold, Italic, Link, List, LogOut, User } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface CommentFormProps {
  parentId?: string
  replyTo?: { id: string; name: string } | null
  onSubmitted?: () => void
  autoFocus?: boolean
  pageId?: string
}

export default function CommentForm({
  parentId,
  replyTo,
  onSubmitted,
  autoFocus = false,
  pageId = "",
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

  const insertMarkdown = (prefix: string, suffix: string = "") => {
    const textarea = textareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = content.substring(start, end)
    const newContent =
      content.substring(0, start) +
      prefix +
      (selected || "文本") +
      suffix +
      content.substring(end)
    setContent(newContent)
    // Restore cursor
    setTimeout(() => {
      textarea.focus()
      const newPos = start + prefix.length + (selected?.length || 2)
      textarea.setSelectionRange(
        start + prefix.length,
        newPos
      )
    }, 0)
  }

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
          <button
            onClick={handleCancelReply}
            className="ml-auto text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {!showPreview ? (
        <Textarea
          ref={textareaRef}
          placeholder={user ? "写下你的留言...（支持 Markdown 语法）" : "登录后即可发表留言"}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[100px] resize-y text-sm leading-relaxed"
          disabled={!user}
          rows={3}
        />
      ) : (
        <div className="min-h-[100px] rounded-md border bg-background p-3 text-sm leading-relaxed prose prose-sm max-w-none prose-zinc dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-pre:bg-muted prose-pre:p-2 prose-code:text-xs prose-a:text-emerald-600 dark:prose-a:text-emerald-400">
          {content ? (
            <ReactMarkdown>{content}</ReactMarkdown>
          ) : (
            <span className="text-muted-foreground">暂无内容可预览</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => insertMarkdown("**", "**")}
                type="button"
                disabled={!user}
              >
                <Bold className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>加粗</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => insertMarkdown("*", "*")}
                type="button"
                disabled={!user}
              >
                <Italic className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>斜体</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => insertMarkdown("[", "](url)")}
                type="button"
                disabled={!user}
              >
                <Link className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>链接</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => insertMarkdown("\n- ")}
                type="button"
                disabled={!user}
              >
                <List className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>列表</TooltipContent>
          </Tooltip>

          <div className="mx-1.5 h-4 w-px bg-border" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setShowPreview(!showPreview)}
                type="button"
              >
                {showPreview ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{showPreview ? "编辑" : "预览"}</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex items-center gap-2">
          {replyTo && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={handleCancelReply}
            >
              取消
            </Button>
          )}

          {/* Login button / Avatar + Logout — to the left of send button */}
          {user ? (
            <>
              <div className="flex items-center gap-1.5 mr-1">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="bg-emerald-100 text-emerald-700 text-[9px] font-medium">
                    {getInitial(user.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium text-muted-foreground hidden sm:inline max-w-[80px] truncate">
                  {user.name}
                </span>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>退出登录</TooltipContent>
              </Tooltip>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs mr-1"
              onClick={() => setShowAuthModal(true)}
            >
              <User className="h-3.5 w-3.5" />
              登录
            </Button>
          )}

          <Button
            size="sm"
            className="h-8 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={handleSubmit}
            disabled={submitting || !content.trim()}
          >
            <Send className="h-3.5 w-3.5" />
            {submitting ? "发送中..." : "发送"}
          </Button>
        </div>
      </div>
    </div>
  )
}