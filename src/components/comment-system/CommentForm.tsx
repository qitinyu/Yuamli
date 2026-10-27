'use client'

import { useState, useRef, useEffect, useCallback } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useCommentStore } from "@/store/use-comment-store"
import { toast } from "sonner"
import {
  Send,
  Eye,
  EyeOff,
  Smile,
  RefreshCw,
  LogIn,
  LogOut,
  Link2,
  User,
  X,
} from "lucide-react"
import MarkdownRenderer from "./MarkdownRenderer"
import { EMOJI_GROUPS } from "@/lib/emoji"

interface CommentFormProps {
  parentId?: string
  replyTo?: { id: string; name: string } | null
  onSubmitted?: () => void
  autoFocus?: boolean
  pageId?: string
  onRefresh?: () => void
  placeholder?: string
}

const WEBSITE_STORAGE_KEY = "yuamli:website"

export default function CommentForm({
  parentId,
  replyTo,
  onSubmitted,
  autoFocus = false,
  pageId = "",
  onRefresh,
  placeholder,
}: CommentFormProps) {
  const { user, setUser, setShowAuthModal, setReplyingTo, incrementRefresh } =
    useCommentStore()

  const [content, setContent] = useState("")
  const [showPreview, setShowPreview] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [website, setWebsite] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 记住上次填写的个人网址（仅浏览器端，一次性水合）
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(WEBSITE_STORAGE_KEY)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) setWebsite(saved)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [autoFocus])

  const handleWebsiteChange = (value: string) => {
    setWebsite(value)
    try {
      window.localStorage.setItem(WEBSITE_STORAGE_KEY, value)
    } catch {
      /* ignore */
    }
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
      if (website.trim()) body.website = website.trim()

      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || data.message || "发送失败")
        return
      }
      toast.success("留言发送成功！")
      setContent("")
      setShowPreview(false)
      setShowEmoji(false)
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
      await fetch("/api/auth/session", {
        method: "POST",
        credentials: "same-origin",
      })
      setUser(null)
      toast.success("已退出登录")
    } catch {
      /* ignore */
    }
  }

  const handleCancelReply = () => {
    setContent("")
    setReplyingTo(null)
  }

  /** 在光标处插入表情 / 颜文字 */
  const insertEmoji = useCallback(
    (text: string) => {
      const el = textareaRef.current
      if (!el || showPreview) {
        setContent((prev) => prev + text)
        return
      }
      const start = el.selectionStart ?? content.length
      const end = el.selectionEnd ?? content.length
      const next = content.slice(0, start) + text + content.slice(end)
      setContent(next)
      requestAnimationFrame(() => {
        el.focus()
        const pos = start + text.length
        el.setSelectionRange(pos, pos)
      })
    },
    [content, showPreview]
  )

  const initial = (user?.name || "").charAt(0).toUpperCase()
  /** 账号信息（邮箱 / ID）不再占一行展示，仅在悬停时作为提示 */
  const account = user ? user.email || user.id : "未登录"

  return (
    <div className="comment-form-shell overflow-hidden rounded-xl border border-[var(--theme-accent-border)] bg-white shadow-sm">
      {/* ===== 上：信息区 ===== */}
      <div className="flex items-center gap-2 border-b border-[var(--theme-accent-border)]/50 bg-[var(--theme-accent-50)] px-3 py-2.5">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={user?.avatar || ""} alt={user?.name || "游客"} />
          <AvatarFallback className="bg-[var(--theme-accent-light)] text-[var(--theme-accent-text)]">
            {user ? (
              <span className="text-xs font-medium">{initial || "U"}</span>
            ) : (
              <User className="h-4 w-4" />
            )}
          </AvatarFallback>
        </Avatar>

        {/* 单行展示昵称 / 未登录，账号信息收进 title 提示，省掉第二行 */}
        <div
          className={`min-w-0 flex-1 truncate text-sm ${
            user ? "font-medium text-foreground" : "text-muted-foreground"
          }`}
          title={account}
        >
          {user ? user.name : "未登录"}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="flex items-center gap-1 rounded-md border border-[var(--theme-accent-border)]/70 bg-white px-2 py-1">
            <Link2 className="h-3 w-3 shrink-0 text-muted-foreground" />
            <input
              value={website}
              onChange={(e) => handleWebsiteChange(e.target.value)}
              placeholder="xxx.com"
              maxLength={120}
              disabled={!user}
              aria-label="个人网址"
              className="w-20 bg-transparent text-[11px] outline-none placeholder:text-muted-foreground/70 disabled:cursor-not-allowed sm:w-32"
            />
          </div>

          {user ? (
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 border-[var(--theme-accent-border)] px-2 text-[11px] text-[var(--theme-accent-text)]"
              onClick={handleLogout}
            >
              <LogOut className="h-3 w-3" />
              退出
            </Button>
          ) : (
            <Button
              size="sm"
              className="h-7 gap-1 bg-[var(--theme-accent)] px-2.5 text-[11px] text-white hover:bg-[var(--theme-accent-hover)]"
              onClick={() => setShowAuthModal(true)}
            >
              <LogIn className="h-3 w-3" />
              登录
            </Button>
          )}
        </div>
      </div>

      {/* ===== 中：内容区 ===== */}
      <div className="px-3 pt-2.5">
        {replyTo && (
          <div className="mb-2 flex items-center gap-2 rounded-md bg-muted/60 px-2.5 py-1.5 text-xs">
            <span className="text-muted-foreground">
              回复{" "}
              <span className="font-medium text-foreground">
                @{replyTo.name}
              </span>
            </span>
            <button
              onClick={handleCancelReply}
              className="ml-auto text-muted-foreground hover:text-foreground"
              aria-label="取消回复"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {!showPreview ? (
          <Textarea
            ref={textareaRef}
            placeholder={
              user
                ? placeholder || "写下你的留言...（支持 Markdown 语法）"
                : "登录后即可发表留言"
            }
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[104px] resize-y border-0 bg-transparent px-0 py-0 text-sm leading-relaxed shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            disabled={!user}
            rows={3}
          />
        ) : (
          <MarkdownRenderer
            content={content}
            className="min-h-[104px] rounded-md border bg-background p-2.5 text-sm leading-relaxed"
            emptyText="暂无内容可预览"
          />
        )}
      </div>

      {/* ===== 下：展示区 ===== */}
      <div className="px-3 pb-2.5 pt-2">
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            className="h-8 gap-1.5 bg-[var(--theme-accent)] px-3 text-white hover:bg-[var(--theme-accent-hover)]"
            onClick={handleSubmit}
            disabled={submitting || !content.trim()}
          >
            <Send className="h-3.5 w-3.5" />
            {submitting ? "发送中..." : "发送"}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setShowPreview((v) => !v)}
            type="button"
          >
            {showPreview ? (
              <EyeOff className="h-3.5 w-3.5" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
            {showPreview ? "编辑" : "预览"}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className={`h-8 gap-1 px-2 text-xs hover:text-foreground ${
              showEmoji ? "text-[var(--theme-accent-text)]" : "text-muted-foreground"
            }`}
            onClick={() => setShowEmoji((v) => !v)}
            type="button"
            aria-expanded={showEmoji}
          >
            <Smile className="h-3.5 w-3.5" />
            表情
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={onRefresh}
            type="button"
            title="刷新留言"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            刷新
          </Button>

          <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">
            {content.length}
          </span>
        </div>

        {/* 表情区：点击「表情」后展开 */}
        {showEmoji && (
          <div className="mt-2 max-h-44 overflow-y-auto rounded-lg border border-[var(--theme-accent-border)]/60 bg-[var(--theme-accent-50)]/60 p-2">
            {EMOJI_GROUPS.map((group) => (
              <div key={group.label} className="mb-2 last:mb-0">
                <div className="mb-1 text-[10px] font-medium tracking-wide text-muted-foreground">
                  {group.label}
                </div>
                <div className="flex flex-wrap gap-1">
                  {group.items.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => insertEmoji(item)}
                      className="rounded-md bg-white px-1.5 py-0.5 text-[13px] leading-5 transition-colors hover:bg-[var(--theme-accent-light)]"
                      title={item}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
