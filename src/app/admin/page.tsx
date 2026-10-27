'use client'

import { useState, useEffect, useCallback, useRef } from "react"
import { toast } from "sonner"
import {
  Shield,
  Lock,
  LogOut,
  Trash2,
  Pin,
  PinOff,
  Star,
  StarOff,
  Users,
  Settings,
  Download,
  Upload,
  Mail,
  Eye,
  EyeOff,
  MessageSquare,
  ChevronDown,
  Loader2,
  KeyRound,
  RefreshCw,
  Reply,
  Plus,
  X,
  FileText,
  Palette,
  UserCircle2,
  Github,
  MessagesSquare,
  SlidersHorizontal,
} from "lucide-react"
import { THEME_PRESETS, themeToStyle, type ThemePreset } from "@/lib/theme"
import { Switch } from "@/components/ui/switch"
import {
  DEFAULT_COMMENT_EXPAND,
  EXPAND_COUNT_OPTIONS,
  EXPAND_DEPTH_OPTIONS,
  normalizeCommentExpand,
  type ExpandCount,
  type ExpandDepth,
} from "@/lib/comment-expand"
import {
  DEFAULT_ADMIN_TITLE,
  normalizeAdminTitle,
  type AdminTitleConfig,
} from "@/lib/admin-title"

const OAUTH_PROVIDER_LABELS: Record<string, string> = {
  github: "GitHub",
  gitcode: "GitCode",
  email: "邮箱",
}

function OAuthProviderIcon({ id }: { id: string }) {
  if (id === "github") return <Github className="h-4 w-4" />
  if (id === "email") return <Mail className="h-4 w-4" />
  const color = id === "gitcode" ? "#fe7300" : "#666"
  const text = id === "gitcode" ? "GC" : id.slice(0, 2).toUpperCase()
  return (
    <span
      className="h-4 w-4 rounded-[4px] flex items-center justify-center text-[8px] font-bold text-white leading-none"
      style={{ background: color }}
    >
      {text}
    </span>
  )
}

interface CommentAuthor {
  id: string
  name: string
  avatar: string
  type: "github" | "gitcode" | "email" | "guest"
}

interface Comment {
  id: string
  content: string
  author: CommentAuthor
  parentId: string | null
  replyTo: { id: string; name: string } | null
  website?: string
  isPinned: boolean
  isFeatured: boolean
  pageId: string
  createdAt: string
  updatedAt: string
  replies?: Comment[]
}

interface User {
  id: string
  name: string
  email: string
  avatar: string
  type: "github" | "gitcode" | "email" | "guest"
  qq?: string
  createdAt: string
}

interface AdminIdentity {
  id: string
  name: string
  avatar: string
  type: "github" | "gitcode" | "email"
}

interface SiteConfig {
  adminPassword: string
  adminEmail: string
  notifyEnabled: boolean
  notifyTemplate: string
  siteName: string
  footerHtml?: string
  replyPresets?: string[]
  themePreset?: string
  commentPlaceholder?: string
  commentExpand?: {
    enabled: boolean
    count: ExpandCount
    depth: ExpandDepth
  }
  adminTitle?: AdminTitleConfig
  adminIdentity?: AdminIdentity | null
}

type Tab = "comments" | "users" | "review" | "settings" | "changelog"

const NAV_ITEMS: { key: Tab; label: string; icon: any }[] = [
  { key: "comments", label: "留言管理", icon: MessageSquare },
  { key: "users", label: "用户列表", icon: Users },
  { key: "changelog", label: "更新日志", icon: FileText },
  { key: "review", label: "评论设置", icon: MessagesSquare },
  { key: "settings", label: "系统设置", icon: Settings },
]

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [password, setPassword] = useState("")
  const [showPwd, setShowPwd] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)

  // Data
  const [comments, setComments] = useState<Comment[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [config, setConfig] = useState<SiteConfig | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>("comments")
  const [dataLoading, setDataLoading] = useState(false)

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [pageIdFilter, setPageIdFilter] = useState("")

  // Settings form
  const [notifyEmail, setNotifyEmail] = useState("")
  const [notifyEnabled, setNotifyEnabled] = useState(false)
  const [notifyTemplate, setNotifyTemplate] = useState("")
  const [smtpHost, setSmtpHost] = useState("smtp.qq.com")
  const [smtpPort, setSmtpPort] = useState("465")
  const [smtpUser, setSmtpUser] = useState("")
  const [smtpPass, setSmtpPass] = useState("")
  const [testingSmtp, setTestingSmtp] = useState(false)

  // Password change form
  const [oldPwd, setOldPwd] = useState("")
  const [newPwd, setNewPwd] = useState("")
  const [confirmPwd, setConfirmPwd] = useState("")
  const [pwdLoading, setPwdLoading] = useState(false)

  // Unified reply
  const [showUnifiedReply, setShowUnifiedReply] = useState(false)
  const [unifiedReplyContent, setUnifiedReplyContent] = useState("")
  const [unifiedReplyLoading, setUnifiedReplyLoading] = useState(false)

  // Footer editor
  const [footerHtml, setFooterHtml] = useState("")
  const [footerLoading, setFooterLoading] = useState(false)

  // Single reply dialog
  const [replyTarget, setReplyTarget] = useState<Comment | null>(null)
  const [replyContent, setReplyContent] = useState("")
  const [replyLoading, setReplyLoading] = useState(false)

  // Changelog
  const [changelog, setChangelog] = useState<{ version: string; content: string }[]>([])
  const [changelogLoading, setChangelogLoading] = useState(false)
  const [changelogSaving, setChangelogSaving] = useState(false)
  const [newLogVersion, setNewLogVersion] = useState("")
  const [newLogContent, setNewLogContent] = useState("")

  // Reply presets
  const [replyPresets, setReplyPresets] = useState<string[]>([])
  const [newPreset, setNewPreset] = useState("")
  const [presetLoading, setPresetLoading] = useState(false)

  // Theme
  const [themePreset, setThemePreset] = useState<string>("樱花粉")

  // Comment placeholder
  const [commentPlaceholder, setCommentPlaceholder] = useState("")
  const [placeholderLoading, setPlaceholderLoading] = useState(false)

  // Comment expand (评论设置 → 单页面评论展开)
  const [expandEnabled, setExpandEnabled] = useState(DEFAULT_COMMENT_EXPAND.enabled)
  const [expandCount, setExpandCount] = useState<ExpandCount>(DEFAULT_COMMENT_EXPAND.count)
  const [expandDepth, setExpandDepth] = useState<ExpandDepth>(DEFAULT_COMMENT_EXPAND.depth)
  const [expandLoading, setExpandLoading] = useState(false)

  // OAuth providers enabled on the server
  const [oauthProviders, setOauthProviders] = useState<string[]>([])
  const [identityLoading, setIdentityLoading] = useState(false)

  // 后台标题模式（系统设置 → 个性化）
  const [adminTitle, setAdminTitle] = useState<AdminTitleConfig>(DEFAULT_ADMIN_TITLE)
  const [personalizeLoading, setPersonalizeLoading] = useState(false)

  // 移动端侧边栏抽屉开关
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const inited = useRef(false)

  const fetchComments = async () => {
    setDataLoading(true)
    try {
      const res = await fetch("/api/admin/comments")
      if (res.ok) {
        const data = await res.json()
        setComments(data.comments || [])
      }
    } catch {
      toast.error("获取留言失败")
    } finally {
      setDataLoading(false)
    }
  }

  const fetchAdminData = async () => {
    try {
      const res = await fetch("/api/admin", { method: "GET" })
      if (res.ok) {
        const data = await res.json()
        if (data.users) {
          setUsers(data.users)
          setConfig(data.config)
          setNotifyEmail(data.config?.adminEmail || "")
          setNotifyEnabled(data.config?.notifyEnabled || false)
          setNotifyTemplate(data.config?.notifyTemplate || "")
          setSmtpHost(data.config?.smtpHost || "smtp.qq.com")
          setSmtpPort(String(data.config?.smtpPort || 465))
          setSmtpUser(data.config?.smtpUser || "")
          setSmtpPass(data.config?.smtpPass || "")
          setFooterHtml(data.config?.footerHtml || "")
          setReplyPresets(data.config?.replyPresets || [])
          setThemePreset(data.config?.themePreset || "樱花粉")
          setCommentPlaceholder(data.config?.commentPlaceholder || "")
          const ce = normalizeCommentExpand(data.config?.commentExpand)
          setExpandEnabled(ce.enabled)
          setExpandCount(ce.count)
          setExpandDepth(ce.depth)
          setAdminTitle(normalizeAdminTitle(data.config?.adminTitle))
        }
      }
    } catch {
      // ignore
    }
  }

  const checkSession = async () => {
    try {
      const res = await fetch("/api/admin", { method: "GET" })
      if (res.ok) {
        const data = await res.json()
        if (data.users) {
          setAuthed(true)
          setUsers(data.users)
          setConfig(data.config)
          setNotifyEmail(data.config?.adminEmail || "")
          setNotifyEnabled(data.config?.notifyEnabled || false)
          setNotifyTemplate(data.config?.notifyTemplate || "")
          setSmtpHost(data.config?.smtpHost || "smtp.qq.com")
          setSmtpPort(String(data.config?.smtpPort || 465))
          setSmtpUser(data.config?.smtpUser || "")
          setSmtpPass(data.config?.smtpPass || "")
          setFooterHtml(data.config?.footerHtml || "")
          setReplyPresets(data.config?.replyPresets || [])
          setThemePreset(data.config?.themePreset || "樱花粉")
          setCommentPlaceholder(data.config?.commentPlaceholder || "")
          const ce = normalizeCommentExpand(data.config?.commentExpand)
          setExpandEnabled(ce.enabled)
          setExpandCount(ce.count)
          setExpandDepth(ce.depth)
          setAdminTitle(normalizeAdminTitle(data.config?.adminTitle))
          await fetchComments()
        }
      }
    } catch {
      // not authed
    } finally {
      setLoading(false)
    }
  }

  // Check existing session + handle OAuth redirect results (once on mount)
  useEffect(() => {
    if (inited.current) return
    inited.current = true
    void checkSession()
    const params = new URLSearchParams(window.location.search)
    if (params.get("bound") === "1") {
      toast.success("管理员身份绑定成功，回复将以个人身份显示")
    }
    const oauthError = params.get("oauth_error")
    if (oauthError) {
      toast.error(oauthError)
    }
    if (params.get("bound") === "1" || oauthError) {
      params.delete("bound"); params.delete("oauth_error")
      const qs = params.toString()
      window.history.replaceState(null, "", window.location.pathname + (qs ? `?${qs}` : ""))
    }
    // Fetch enabled OAuth providers
    fetch("/api/config")
      .then(res => (res.ok ? res.json() : null))
      .then(data => { if (data?.oauthProviders) setOauthProviders(data.oauthProviders) })
      .catch(() => {})
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) return
    setLoginLoading(true)
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        setPassword("")
        // 校验 Cookie 是否真的生效：Serverless 环境缺少 AUTH_SECRET 时，
        // 这里会出现「登录成功但下一个请求立刻 403」，只在登录后才发现会非常难排查
        const check = await fetch("/api/admin", { method: "GET" })
        if (!check.ok) {
          let msg = "登录状态未能保持，请检查服务端 AUTH_SECRET 配置是否正确"
          try {
            const err = await check.json()
            if (err?.message) msg = err.message
          } catch {
            // ignore
          }
          toast.error(msg, { duration: 12000 })
          return
        }
        setAuthed(true)
        toast.success("登录成功")
        await Promise.all([fetchComments(), fetchAdminData()])
      } else {
        toast.error(data.message || "密码错误", { duration: 10000 })
      }
    } catch {
      toast.error("登录失败，请重试")
    } finally {
      setLoginLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/admin", { method: "DELETE" })
      setAuthed(false)
      setComments([])
      setUsers([])
      setConfig(null)
      setSelectedIds(new Set())
      toast.success("已退出登录")
    } catch {
      toast.error("退出失败")
    }
  }

  // Unbind the admin personal identity
  const handleUnbindIdentity = async () => {
    if (!confirm("确认解绑管理员身份？解绑后回复将以默认「管理员」身份显示")) return
    setIdentityLoading(true)
    try {
      const res = await fetch("/api/admin/identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unbind" }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || "已解绑")
        await fetchAdminData()
      } else {
        toast.error(data.message || "解绑失败")
      }
    } catch {
      toast.error("解绑失败")
    } finally {
      setIdentityLoading(false)
    }
  }

  // Refresh all data
  const handleRefresh = async () => {
    await Promise.all([fetchComments(), fetchAdminData()])
    toast.success("已刷新")
  }

  // Comment actions
  const batchAction = async (action: string, ids: string[]) => {
    if (ids.length === 0) {
      toast.warning("请先选择留言")
      return
    }
    try {
      const res = await fetch("/api/admin/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ids }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || "操作成功")
        setSelectedIds(new Set())
        await fetchComments()
      } else {
        toast.error(data.message || "操作失败")
      }
    } catch {
      toast.error("操作失败")
    }
  }

  // Unified reply to selected comments
  const handleUnifiedReply = async () => {
    if (selectedIds.size === 0) {
      toast.warning("请先选择要回复的留言")
      return
    }
    if (!unifiedReplyContent.trim()) {
      toast.warning("请输入回复内容")
      return
    }
    setUnifiedReplyLoading(true)
    try {
      const res = await fetch("/api/admin/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "unified_reply",
          ids: [...selectedIds],
          content: unifiedReplyContent.trim(),
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || "统一回复成功")
        setShowUnifiedReply(false)
        setUnifiedReplyContent("")
        setSelectedIds(new Set())
        await fetchComments()
      } else {
        toast.error(data.message || "统一回复失败")
      }
    } catch {
      toast.error("统一回复失败")
    } finally {
      setUnifiedReplyLoading(false)
    }
  }

  // Quick reply using preset
  const handlePresetReply = async (presetContent: string) => {
    if (selectedIds.size === 0) {
      toast.warning("请先选择要回复的留言")
      return
    }
    setUnifiedReplyLoading(true)
    try {
      const res = await fetch("/api/admin/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "unified_reply",
          ids: [...selectedIds],
          content: presetContent.trim(),
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || "预设回复成功")
        setSelectedIds(new Set())
        await fetchComments()
      } else {
        toast.error(data.message || "预设回复失败")
      }
    } catch {
      toast.error("预设回复失败")
    } finally {
      setUnifiedReplyLoading(false)
    }
  }

  const deleteComment = async (id: string) => {
    if (!confirm("确定删除这条留言吗？")) return
    try {
      const res = await fetch(`/api/comments/${id}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("已删除")
        await fetchComments()
      } else {
        toast.error("删除失败")
      }
    } catch {
      toast.error("删除失败")
    }
  }

  const togglePin = async (id: string, pinned: boolean) => {
    try {
      const res = await fetch(`/api/comments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinned: !pinned }),
      })
      if (res.ok) {
        toast.success(!pinned ? "已置顶" : "已取消置顶")
        await fetchComments()
      }
    } catch {
      toast.error("操作失败")
    }
  }

  const toggleFeature = async (id: string, featured: boolean) => {
    try {
      const res = await fetch(`/api/comments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFeatured: !featured }),
      })
      if (res.ok) {
        toast.success(!featured ? "已设为精华" : "已取消精华")
        await fetchComments()
      }
    } catch {
      toast.error("操作失败")
    }
  }

  // Single reply to a comment
  const handleReply = async () => {
    if (!replyTarget || !replyContent.trim()) {
      toast.error("回复内容不能为空")
      return
    }
    setReplyLoading(true)
    try {
      const res = await fetch("/api/admin/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reply",
          ids: [replyTarget.id],
          parentId: replyTarget.id,
          content: replyContent.trim(),
        }),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        toast.success("回复成功")
        setReplyTarget(null)
        setReplyContent("")
        await fetchComments()
      } else {
        toast.error(data.message || "回复失败")
      }
    } catch {
      toast.error("回复失败")
    } finally {
      setReplyLoading(false)
    }
  }

  // 统一的配置保存请求：把服务端真实原因带回前端，并在登录态失效时退回登录页
  const postConfig = async (
    payload: Record<string, unknown>
  ): Promise<{ ok: boolean; message: string }> => {
    try {
      const res = await fetch("/api/admin/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      let data: any = null
      try {
        data = await res.json()
      } catch {
        // ignore
      }
      if (res.ok && data?.ok !== false) {
        return { ok: true, message: data?.message || "已保存" }
      }
      if (res.status === 403) {
        setAuthed(false)
      }
      return {
        ok: false,
        message: data?.message || `保存失败（HTTP ${res.status}）`,
      }
    } catch (err: any) {
      return { ok: false, message: `请求失败：${err?.message || "网络异常"}` }
    }
  }

  // Settings save
  const saveSettings = async () => {
    const r = await postConfig({
      email: notifyEmail,
      enabled: notifyEnabled,
      template: notifyTemplate,
      smtpHost,
      smtpPort: Number(smtpPort) || 465,
      smtpUser,
      smtpPass,
    })
    if (r.ok) {
      toast.success("设置已保存，可手动刷新查看最新内容")
      await fetchAdminData()
    } else {
      toast.error(r.message)
    }
  }

  // SMTP connection test
  const handleTestSmtp = async () => {
    if (!smtpUser || !smtpPass) {
      toast.error("请先填写 SMTP 账号和授权码")
      return
    }
    setTestingSmtp(true)
    try {
      const res = await fetch("/api/admin/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test",
          smtpHost,
          smtpPort: Number(smtpPort) || 465,
          smtpUser,
          smtpPass,
          testEmail: notifyEmail || smtpUser,
        }),
      })
      const data = await res.json().catch(() => null)
      if (res.status === 403) setAuthed(false)
      if (data?.ok) {
        toast.success(data.message || "SMTP 连接成功")
      } else {
        toast.error(data?.message || `测试失败（HTTP ${res.status}）`, { duration: 12000 })
      }
    } catch (err: any) {
      toast.error(`测试失败：${err?.message || "网络异常"}`)
    } finally {
      setTestingSmtp(false)
    }
  }

  // Password change — use PUT
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!oldPwd.trim() || !newPwd.trim()) {
      toast.error("请填写原密码和新密码")
      return
    }
    if (newPwd !== confirmPwd) {
      toast.error("两次输入的新密码不一致")
      return
    }
    if (newPwd.trim().length < 4) {
      toast.error("新密码至少 4 个字符")
      return
    }
    setPwdLoading(true)
    try {
      const res = await fetch("/api/admin", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: oldPwd, newPassword: newPwd }),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        toast.success("密码修改成功，下次请使用新密码登录")
        setOldPwd("")
        setNewPwd("")
        setConfirmPwd("")
      } else {
        toast.error(data.message || "密码修改失败")
      }
    } catch {
      toast.error("密码修改失败")
    } finally {
      setPwdLoading(false)
    }
  }

  // Footer save
  const saveFooter = async () => {
    setFooterLoading(true)
    const r = await postConfig({ footerHtml })
    setFooterLoading(false)
    if (r.ok) {
      toast.success("页脚已保存，可手动刷新查看最新内容")
      await fetchAdminData()
    } else {
      toast.error(r.message)
    }
  }

  // Presets save
  const savePresets = async () => {
    setPresetLoading(true)
    const r = await postConfig({ replyPresets })
    setPresetLoading(false)
    if (r.ok) {
      toast.success("预设回复已保存")
      await fetchAdminData()
    } else {
      toast.error(r.message)
    }
  }

  const addPreset = () => {
    if (!newPreset.trim()) return
    setReplyPresets([...replyPresets, newPreset.trim()])
    setNewPreset("")
  }

  const removePreset = (index: number) => {
    setReplyPresets(replyPresets.filter((_, i) => i !== index))
  }

  // Comment placeholder save
  const savePlaceholder = async () => {
    setPlaceholderLoading(true)
    const r = await postConfig({ commentPlaceholder })
    setPlaceholderLoading(false)
    if (r.ok) {
      toast.success("留言占位符已保存，可手动刷新查看最新内容")
      await fetchAdminData()
    } else {
      toast.error(r.message)
    }
  }

  // Comment expand save
  const saveCommentExpand = async () => {
    setExpandLoading(true)
    const r = await postConfig({
      commentExpand: { enabled: expandEnabled, count: expandCount, depth: expandDepth },
    })
    setExpandLoading(false)
    if (r.ok) {
      toast.success("评论展开设置已保存，刷新前台即可生效")
      await fetchAdminData()
    } else {
      toast.error(r.message)
    }
  }

  // Theme
  const activeThemeStyle = (() => {
    const t = THEME_PRESETS.find(p => p.name === themePreset)
    return t ? themeToStyle(t) : themeToStyle(THEME_PRESETS[0])
  })()

  const handleThemeChange = async (name: string) => {
    setThemePreset(name)
    const r = await postConfig({ themePreset: name })
    if (r.ok) {
      toast.success("主题已切换，可手动刷新查看最新内容")
    } else {
      toast.error(r.message)
    }
  }

  // 后台标题模式 — 保存（个性化）
  const savePersonalization = async () => {
    setPersonalizeLoading(true)
    const r = await postConfig({ adminTitle })
    setPersonalizeLoading(false)
    if (r.ok) {
      toast.success("个性化设置已保存")
      await fetchAdminData()
    } else {
      toast.error(r.message)
    }
  }

  // 本地选取图标：读取 → 等比裁剪为 80×80（40px 的 2x 视网膜）→ data URL 存入配置
  const handleIconFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error("请选择图片文件")
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const src = String(reader.result)
      const img = new Image()
      img.onload = () => {
        const size = 80
        const canvas = document.createElement("canvas")
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          setAdminTitle(prev => ({ ...prev, iconUrl: src }))
          return
        }
        const min = Math.min(img.width, img.height)
        const sx = (img.width - min) / 2
        const sy = (img.height - min) / 2
        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size)
        setAdminTitle(prev => ({ ...prev, iconUrl: canvas.toDataURL("image/png") }))
      }
      img.onerror = () => toast.error("图片读取失败")
      img.src = src
    }
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  // Changelog operations
  const fetchChangelog = async () => {
    setChangelogLoading(true)
    try {
      const res = await fetch("/api/admin/changelog")
      if (res.ok) {
        const data = await res.json()
        setChangelog(data.changelog || [])
      }
    } catch { /* ignore */ }
    setChangelogLoading(false)
  }

  const saveChangelog = async () => {
    setChangelogSaving(true)
    try {
      const res = await fetch("/api/admin/changelog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changelog }),
      })
      if (res.ok) {
        toast.success("更新日志已保存")
      } else {
        let errMsg = "保存失败"
        try {
          const data = await res.json()
          if (data?.message) errMsg = data.message
        } catch { /* ignore */ }
        toast.error(errMsg)
      }
    } catch (err: any) {
      toast.error(err?.message || "保存失败")
    }
    setChangelogSaving(false)
  }

  const addChangelog = () => {
    if (!newLogVersion.trim() || !newLogContent.trim()) return
    setChangelog([{ version: newLogVersion.trim(), content: newLogContent.trim() }, ...changelog])
    setNewLogVersion("")
    setNewLogContent("")
  }

  const removeChangelog = (index: number) => {
    setChangelog(changelog.filter((_, i) => i !== index))
  }

  const updateChangelogItem = (index: number, field: "version" | "content", value: string) => {
    const updated = [...changelog]
    updated[index] = { ...updated[index], [field]: value }
    setChangelog(updated)
  }

  // Data export/import
  const handleExport = async () => {
    try {
      const res = await fetch("/api/admin/data")
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `yuamli-backup-${new Date().toISOString().slice(0, 10)}.json`
        a.click()
        URL.revokeObjectURL(url)
        toast.success("数据已导出")
      } else {
        toast.error("导出失败")
      }
    } catch {
      toast.error("导出失败")
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      const res = await fetch("/api/admin/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const result = await res.json()
      if (res.ok) {
        toast.success(result.message || "导入成功，可手动刷新查看最新内容")
        await Promise.all([fetchComments(), fetchAdminData()])
      } else {
        toast.error(result.message || "导入失败")
      }
    } catch {
      toast.error("导入失败，请检查文件格式")
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === comments.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(comments.map(c => c.id)))
    }
  }

  const formatDate = (d: string) => {
    return new Date(d).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // 后台品牌区（侧边栏顶部 / 移动端顶栏）：随「后台标题模式」渲染
  const renderBrand = () => (
    <>
      {adminTitle.showIcon && (
        adminTitle.iconUrl ? (
          <img
            src={adminTitle.iconUrl}
            alt=""
            className="w-10 h-10 rounded-lg object-cover shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-[var(--theme-accent)] flex items-center justify-center shrink-0">
            <Shield className="h-5 w-5 text-white" />
          </div>
        )
      )}
      {adminTitle.showText && (
        <span className="text-2xl font-semibold tracking-tight text-stone-900 truncate leading-none">
          {adminTitle.titleText || "后台管理"}
        </span>
      )}
    </>
  )

  // 切换 tab（移动端切走后收起抽屉）
  const switchTab = (tab: Tab) => {
    setActiveTab(tab)
    if (tab === "changelog") fetchChangelog()
    setSidebarOpen(false)
  }

  // ===== Loading screen =====
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-stone-50 to-white">
        <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
      </div>
    )
  }

  // ===== Login screen =====
  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-stone-50 to-white px-4">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl shadow-lg border border-stone-200 p-8">
            <div className="flex flex-col items-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-[var(--theme-accent)] flex items-center justify-center mb-3">
                <Shield className="h-7 w-7 text-white" />
              </div>
              <h1 className="text-xl font-bold text-stone-900">Yuamli 后台管理</h1>
              <p className="text-sm text-stone-500 mt-1">请输入管理密码</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="管理密码"
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-stone-300 focus:border-[var(--theme-accent)] focus:ring-2 focus:ring-[var(--theme-accent)] outline-none transition-all text-sm"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <button
                type="submit"
                disabled={loginLoading || !password.trim()}
                className="w-full py-2.5 rounded-lg bg-[var(--theme-accent)] text-white font-medium text-sm hover:bg-[var(--theme-accent-hover)] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loginLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    登录中...
                  </>
                ) : (
                  "登录"
                )}
              </button>
            </form>

            {oauthProviders.length > 0 && (
              <>
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-stone-200" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-white px-2 text-stone-400">或使用友人账号登录</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {oauthProviders.map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => { window.location.href = `/api/auth/${p}?mode=admin` }}
                      className="flex items-center justify-center gap-2 py-2 rounded-lg border border-stone-300 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
                    >
                      <OAuthProviderIcon id={p} />
                      {OAUTH_PROVIDER_LABELS[p] || p}
                    </button>
                  ))}
                </div>
                <p className="text-center text-[11px] text-stone-400 mt-3">
                  绑定的友人账号将以此身份参与留言回复
                </p>
              </>
            )}
          </div>
          <p className="text-center text-xs text-stone-400 mt-4">
            Yuamli 留言系统 · 管理后台
          </p>
        </div>
      </div>
    )
  }

  // ===== Admin dashboard =====
  return (
    <div className="min-h-screen flex bg-gradient-to-b from-stone-50 to-white" style={activeThemeStyle as React.CSSProperties}>
      {/* 移动端抽屉遮罩 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 左侧侧边栏：桌面端常驻，移动端为抽屉（点 logo 展开） */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-60 bg-white border-r border-stone-200 flex flex-col transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* 品牌区（点击收起抽屉） */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="flex items-center gap-2.5 px-5 h-16 border-b border-stone-100 shrink-0"
        >
          {renderBrand()}
        </button>

        {/* 导航 */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
          {NAV_ITEMS.map(tab => (
            <button
              key={tab.key}
              onClick={() => switchTab(tab.key)}
              className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-[var(--theme-accent-50)] text-[var(--theme-accent-text)]"
                  : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>

        {/* 底部操作 */}
        <div className="border-t border-stone-100 p-3 space-y-1 shrink-0">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-sm text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            刷新数据
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-sm text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            退出登录
          </button>
        </div>
      </aside>

      {/* 右侧内容列 */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* 移动端顶栏（仅小屏显示，点 logo 展开侧边栏） */}
        <header className="lg:hidden sticky top-0 z-30 border-b bg-white/80 backdrop-blur-sm">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex items-center gap-2.5 min-w-0"
              aria-label="展开菜单"
            >
              {renderBrand()}
            </button>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={handleRefresh}
                className="p-2 rounded-lg text-stone-600 hover:bg-stone-100 transition-colors"
                title="刷新数据"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg text-stone-600 hover:bg-stone-100 transition-colors"
                title="退出登录"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

      {/* Content */}
      <main className="flex-1 w-full px-4 py-6 mx-auto max-w-6xl">
        {/* Comments tab */}
        {activeTab === "comments" && (
          <div>
            {/* PageId filter */}
            {(() => {
              const allPageIds = [...new Set(comments.map(c => c.pageId).filter(Boolean))].sort()
              if (allPageIds.length <= 1) return null
              return (
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs text-stone-500">页面筛选:</span>
                  <div className="relative">
                    <select value={pageIdFilter} onChange={e => setPageIdFilter(e.target.value)}
                      className="appearance-none pl-3 pr-7 py-1.5 rounded-lg border border-stone-300 text-sm bg-white focus:border-[var(--theme-accent)] focus:ring-2 focus:ring-[var(--theme-accent)] outline-none cursor-pointer">
                      <option value="">全部页面</option>
                      <option value="__guestbook__">留言板（无 pageId）</option>
                      {allPageIds.map(pid => <option key={pid} value={pid}>{pid}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-stone-400 pointer-events-none" />
                  </div>
                </div>
              )
            })()}

            {/* Preset replies quick bar */}
            {replyPresets.length > 0 && (
              <div className="mb-4 p-3 bg-white rounded-lg border border-stone-200">
                <div className="flex items-center gap-2 mb-2">
                  <Reply className="h-4 w-4 text-[var(--theme-accent)]" />
                  <span className="text-xs font-medium text-stone-700">快捷预设回复</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {replyPresets.map((preset, i) => (
                    <button
                      key={i}
                      onClick={() => handlePresetReply(preset)}
                      disabled={selectedIds.size === 0 || unifiedReplyLoading}
                      className="px-2.5 py-1 rounded-full text-xs bg-[var(--theme-accent-50)] text-[var(--theme-accent-text)] hover:bg-[var(--theme-accent-light)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed border border-[var(--theme-accent-border)]"
                    >
                      {preset.length > 20 ? preset.slice(0, 20) + "..." : preset}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Batch actions */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-stone-500">
                  已选 {selectedIds.size} / {comments.length} 条
                </span>
                {selectedIds.size > 0 && (
                  <>
                    <button
                      onClick={() => { setShowUnifiedReply(true); setUnifiedReplyContent("") }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded text-xs text-[var(--theme-accent-text)] hover:bg-[var(--theme-accent-50)] transition-colors font-medium"
                    >
                      <Reply className="h-3 w-3" /> 统一回复
                    </button>
                    <button onClick={() => batchAction("batch_delete", [...selectedIds])} className="flex items-center gap-1 px-2.5 py-1 rounded text-xs text-red-600 hover:bg-red-50 transition-colors">
                      <Trash2 className="h-3 w-3" /> 批量删除
                    </button>
                    <button onClick={() => batchAction("batch_pin", [...selectedIds])} className="flex items-center gap-1 px-2.5 py-1 rounded text-xs text-amber-600 hover:bg-amber-50 transition-colors">
                      <Pin className="h-3 w-3" /> 批量置顶
                    </button>
                    <button onClick={() => batchAction("batch_unpin", [...selectedIds])} className="flex items-center gap-1 px-2.5 py-1 rounded text-xs text-stone-600 hover:bg-stone-100 transition-colors">
                      <PinOff className="h-3 w-3" /> 取消置顶
                    </button>
                    <button onClick={() => batchAction("batch_feature", [...selectedIds])} className="flex items-center gap-1 px-2.5 py-1 rounded text-xs text-rose-600 hover:bg-rose-50 transition-colors">
                      <Star className="h-3 w-3" /> 设为精华
                    </button>
                    <button onClick={() => batchAction("batch_unfeature", [...selectedIds])} className="flex items-center gap-1 px-2.5 py-1 rounded text-xs text-stone-600 hover:bg-stone-100 transition-colors">
                      <StarOff className="h-3 w-3" /> 取消精华
                    </button>
                  </>
                )}
              </div>
              <button
                onClick={toggleSelectAll}
                className="text-xs text-stone-500 hover:text-stone-700"
              >
                {selectedIds.size === comments.length && comments.length > 0 ? "取消全选" : "全选"}
              </button>
            </div>

            {/* Unified reply dialog */}
            {showUnifiedReply && (
              <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setShowUnifiedReply(false)}>
                <div className="bg-white rounded-xl shadow-xl border border-stone-200 w-full max-w-lg" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
                    <div className="flex items-center gap-2">
                      <Reply className="h-5 w-5 text-[var(--theme-accent)]" />
                      <h3 className="font-medium text-sm text-stone-900">统一回复 ({selectedIds.size} 条留言)</h3>
                    </div>
                    <button onClick={() => setShowUnifiedReply(false)} className="text-stone-400 hover:text-stone-600">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="text-xs text-stone-500 bg-stone-50 rounded-md px-3 py-2">
                      回复身份：{config?.adminIdentity
                        ? <span className="font-medium text-stone-800">{config.adminIdentity.name}</span>
                        : <span>默认「管理员」（可在设置中绑定个人身份）</span>}
                    </div>
                    <textarea
                      value={unifiedReplyContent}
                      onChange={e => setUnifiedReplyContent(e.target.value)}
                      placeholder="输入统一回复内容（支持 Markdown）..."
                      rows={4}
                      className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:border-[var(--theme-accent)] focus:ring-2 focus:ring-[var(--theme-accent)] outline-none text-sm resize-y"
                      autoFocus
                    />
                    {/* Quick preset insert */}
                    {replyPresets.length > 0 && (
                      <div>
                        <span className="text-xs text-stone-500 mb-1.5 block">快速插入预设:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {replyPresets.map((preset, i) => (
                            <button
                              key={i}
                              onClick={() => setUnifiedReplyContent(preset)}
                              className="px-2.5 py-1 rounded text-xs bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors"
                            >
                              {preset.length > 15 ? preset.slice(0, 15) + "..." : preset}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setShowUnifiedReply(false)}
                        className="px-4 py-2 rounded-lg text-sm text-stone-600 hover:bg-stone-100 transition-colors"
                      >
                        取消
                      </button>
                      <button
                        onClick={handleUnifiedReply}
                        disabled={unifiedReplyLoading || !unifiedReplyContent.trim()}
                        className="px-4 py-2 rounded-lg bg-[var(--theme-accent)] text-white text-sm font-medium hover:bg-[var(--theme-accent-hover)] transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {unifiedReplyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Reply className="h-4 w-4" />}
                        发送回复
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Single reply dialog */}
            {replyTarget && (
              <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setReplyTarget(null)}>
                <div className="bg-white rounded-xl shadow-xl border border-stone-200 w-full max-w-lg" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
                    <div className="flex items-center gap-2">
                      <Reply className="h-5 w-5 text-[var(--theme-accent)]" />
                      <h3 className="font-medium text-sm text-stone-900">回复 {replyTarget.author.name}</h3>
                    </div>
                    <button onClick={() => setReplyTarget(null)} className="text-stone-400 hover:text-stone-600">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="px-5 py-3 bg-stone-50 border-b border-stone-100">
                    <p className="text-xs text-stone-400 line-clamp-2">{replyTarget.content}</p>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="text-xs text-stone-500 bg-stone-50 rounded-md px-3 py-2">
                      回复身份：{config?.adminIdentity
                        ? <span className="font-medium text-stone-800">{config.adminIdentity.name}</span>
                        : <span>默认「管理员」（可在设置中绑定个人身份）</span>}
                    </div>
                    <textarea
                      value={replyContent}
                      onChange={e => setReplyContent(e.target.value)}
                      placeholder="输入回复内容（支持 Markdown）..."
                      rows={4}
                      className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:border-[var(--theme-accent)] focus:ring-2 focus:ring-[var(--theme-accent)] outline-none text-sm resize-y"
                      autoFocus
                    />
                    {/* Quick preset insert */}
                    {replyPresets.length > 0 && (
                      <div>
                        <span className="text-xs text-stone-500 mb-1.5 block">快速插入预设:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {replyPresets.map((preset, i) => (
                            <button
                              key={i}
                              onClick={() => setReplyContent(preset)}
                              className="px-2.5 py-1 rounded text-xs bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors"
                            >
                              {preset.length > 15 ? preset.slice(0, 15) + "..." : preset}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setReplyTarget(null)}
                        className="px-4 py-2 rounded-lg text-sm text-stone-600 hover:bg-stone-100 transition-colors"
                      >
                        取消
                      </button>
                      <button
                        onClick={handleReply}
                        disabled={replyLoading || !replyContent.trim()}
                        className="px-4 py-2 rounded-lg bg-[var(--theme-accent)] text-white text-sm font-medium hover:bg-[var(--theme-accent-hover)] transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {replyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Reply className="h-4 w-4" />}
                        发送回复
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Comments list */}
            {dataLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-20 text-stone-400">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">暂无留言</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                {comments
                  .filter(c => {
                    if (!pageIdFilter) return true
                    if (pageIdFilter === "__guestbook__") return !c.pageId
                    return c.pageId === pageIdFilter
                  })
                  .map(c => (
                  <div key={c.id} className="bg-white rounded-lg border border-stone-200 p-4">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(c.id)}
                        onChange={() => toggleSelect(c.id)}
                        className="mt-1 rounded border-stone-300"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm text-stone-900">{c.author.name}</span>
                          {c.author.type === "github" && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-500">GitHub</span>
                          )}
                          {c.isPinned && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 flex items-center gap-0.5">
                              <Pin className="h-2.5 w-2.5" /> 置顶
                            </span>
                          )}
                          {c.isFeatured && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 flex items-center gap-0.5">
                              <Star className="h-2.5 w-2.5" /> 精华
                            </span>
                          )}
                          {c.pageId && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--theme-accent-50)] text-[var(--theme-accent-text)] truncate max-w-[200px]" title={c.pageId}>
                              {c.pageId}
                            </span>
                          )}
                          <span className="text-xs text-stone-400 ml-auto">{formatDate(c.createdAt)}</span>
                        </div>
                        <p className="text-sm text-stone-700 whitespace-pre-wrap break-words">{c.content}</p>
                        {c.replyTo && (
                          <p className="text-xs text-stone-400 mt-1">@{c.replyTo.name}</p>
                        )}
                        {/* Actions */}
                        <div className="flex items-center gap-1 mt-2">
                          <button onClick={() => togglePin(c.id, c.isPinned)} className="flex items-center gap-1 px-2 py-1 rounded text-xs text-stone-500 hover:bg-stone-100 transition-colors">
                            {c.isPinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                            {c.isPinned ? "取消置顶" : "置顶"}
                          </button>
                          <button onClick={() => toggleFeature(c.id, c.isFeatured)} className="flex items-center gap-1 px-2 py-1 rounded text-xs text-stone-500 hover:bg-stone-100 transition-colors">
                            {c.isFeatured ? <StarOff className="h-3 w-3" /> : <Star className="h-3 w-3" />}
                            {c.isFeatured ? "取消精华" : "精华"}
                          </button>
                          <button onClick={() => { setReplyTarget(c); setReplyContent("") }} className="flex items-center gap-1 px-2 py-1 rounded text-xs text-stone-500 hover:bg-stone-100 transition-colors">
                            <Reply className="h-3 w-3" />
                            回复
                          </button>
                          <button onClick={() => deleteComment(c.id)} className="flex items-center gap-1 px-2 py-1 rounded text-xs text-red-500 hover:bg-red-50 transition-colors ml-auto">
                            <Trash2 className="h-3 w-3" /> 删除
                          </button>
                        </div>
                        {/* Replies */}
                        {c.replies && c.replies.length > 0 && (
                          <div className="mt-3 pl-4 border-l-2 border-stone-100 space-y-2">
                            {c.replies.map(r => (
                              <div key={r.id} className="flex items-start gap-2">
                                <span className="text-xs font-medium text-stone-600 shrink-0">{r.author.name}:</span>
                                <span className="text-xs text-stone-500 flex-1">{r.content}</span>
                                <button onClick={() => deleteComment(r.id)} className="text-red-400 hover:text-red-600 shrink-0">
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Users tab */}
        {activeTab === "users" && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-[var(--theme-accent)]" />
              <h3 className="font-medium text-sm text-stone-900">注册用户 ({users.length})</h3>
            </div>
            {users.length === 0 ? (
              <div className="text-center py-20 text-stone-400">
                <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">暂无注册用户</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {users.map(u => (
                  <div key={u.id} className="bg-white rounded-lg border border-stone-200 p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-stone-200 flex items-center justify-center text-sm font-medium text-stone-600 shrink-0">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-stone-900 truncate">{u.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-500 shrink-0">
                          {u.type === "guest" ? "游客" : (OAUTH_PROVIDER_LABELS[u.type] || u.type)}
                        </span>
                      </div>
                      <p className="text-xs text-stone-400 truncate">
                        {u.email || u.qq || "无邮箱"}
                      </p>
                      <p className="text-xs text-stone-400">
                        {formatDate(u.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Review tab — 评论设置 */}
        {activeTab === "review" && (
          <div className="w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 单页面评论展开 */}
            <div className="bg-white rounded-lg border border-stone-200 p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="font-medium text-sm text-stone-900 mb-1 flex items-center gap-2">
                    <MessagesSquare className="h-5 w-5 text-[var(--theme-accent)]" />
                    单页面评论展开
                  </h3>
                  <p className="text-xs text-stone-500 leading-relaxed">
                    开启后，每个单独的留言区下方排列的留言都会自动按照下方规定展开一定数量
                  </p>
                </div>
                <Switch
                  checked={expandEnabled}
                  onCheckedChange={setExpandEnabled}
                  className="shrink-0 mt-0.5 data-[state=checked]:bg-[var(--theme-accent)]"
                  aria-label="单页面评论展开总开关"
                />
              </div>

              <div
                className={`space-y-4 border-t border-stone-100 pt-4 transition-opacity ${
                  expandEnabled ? "" : "opacity-50"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm text-stone-700">展开数量</div>
                    <p className="text-xs text-stone-400 mt-0.5">首屏自动展开的留言条数</p>
                  </div>
                  <div className="relative shrink-0">
                    <select
                      value={expandCount}
                      onChange={e => setExpandCount(e.target.value as ExpandCount)}
                      disabled={!expandEnabled}
                      className="w-full appearance-none pl-3 pr-8 py-1.5 rounded-lg border border-stone-300 text-sm bg-white focus:border-[var(--theme-accent)] focus:ring-2 focus:ring-[var(--theme-accent)] outline-none cursor-pointer disabled:cursor-not-allowed"
                    >
                      {EXPAND_COUNT_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm text-stone-700">展开深度</div>
                    <p className="text-xs text-stone-400 mt-0.5">单评论楼中楼层级</p>
                  </div>
                  <div className="relative shrink-0">
                    <select
                      value={expandDepth}
                      onChange={e => setExpandDepth(Number(e.target.value) as ExpandDepth)}
                      disabled={!expandEnabled}
                      className="w-full appearance-none pl-3 pr-8 py-1.5 rounded-lg border border-stone-300 text-sm bg-white focus:border-[var(--theme-accent)] focus:ring-2 focus:ring-[var(--theme-accent)] outline-none cursor-pointer disabled:cursor-not-allowed"
                    >
                      {EXPAND_DEPTH_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                  </div>
                </div>
              </div>

              <button
                onClick={saveCommentExpand}
                disabled={expandLoading}
                className="px-4 py-2 rounded-lg bg-[var(--theme-accent)] text-white text-sm font-medium hover:bg-[var(--theme-accent-hover)] transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {expandLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                保存设置
              </button>
            </div>

            {/* Comment placeholder */}
            <div className="bg-white rounded-lg border border-stone-200 p-6 space-y-4">
              <div>
                <h3 className="font-medium text-sm text-stone-900 mb-1 flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-[var(--theme-accent)]" />
                  留言占位符
                </h3>
                <p className="text-xs text-stone-500">前台留言输入框的占位提示文字（用户已登录时显示）</p>
              </div>
              <input
                type="text"
                value={commentPlaceholder}
                onChange={e => setCommentPlaceholder(e.target.value)}
                placeholder="写下你的留言...（支持 Markdown 语法）"
                className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:border-[var(--theme-accent)] focus:ring-2 focus:ring-[var(--theme-accent)] outline-none text-sm"
              />
              <p className="text-xs text-stone-400">
                留空则显示默认提示「写下你的留言...（支持 Markdown 语法）」。仅在用户已登录时生效，未登录时显示登录提示。
              </p>
              <button
                onClick={savePlaceholder}
                disabled={placeholderLoading}
                className="px-4 py-2 rounded-lg bg-[var(--theme-accent)] text-white text-sm font-medium hover:bg-[var(--theme-accent-hover)] transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {placeholderLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                保存占位符
              </button>
            </div>

            {/* Reply presets */}
            <div className="bg-white rounded-lg border border-stone-200 p-6 space-y-4 md:col-span-2">
              <div>
                <h3 className="font-medium text-sm text-stone-900 mb-1 flex items-center gap-2">
                  <Reply className="h-5 w-5 text-[var(--theme-accent)]" />
                  预设回复模板
                </h3>
                <p className="text-xs text-stone-500">在留言管理中快速使用预设内容回复，如 &quot;这里不是无人区!&quot;</p>
              </div>

              <div className="space-y-2">
                {replyPresets.length > 0 && replyPresets.map((preset, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="flex-1 px-3 py-1.5 rounded-lg border border-stone-200 text-sm text-stone-700 bg-stone-50">
                      {preset}
                    </span>
                    <button
                      onClick={() => removePreset(i)}
                      className="text-stone-400 hover:text-red-500 transition-colors p-1"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newPreset}
                  onChange={e => setNewPreset(e.target.value)}
                  placeholder="输入新的预设回复内容"
                  className="flex-1 px-3 py-1.5 rounded-lg border border-stone-300 focus:border-[var(--theme-accent)] focus:ring-2 focus:ring-[var(--theme-accent)] outline-none text-sm"
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addPreset() } }}
                />
                <button
                  onClick={addPreset}
                  disabled={!newPreset.trim()}
                  className="px-3 py-1.5 rounded-lg bg-stone-100 text-stone-700 text-sm hover:bg-stone-200 transition-colors disabled:opacity-40 flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> 添加
                </button>
              </div>

              <button
                onClick={savePresets}
                disabled={presetLoading}
                className="px-4 py-2 rounded-lg bg-stone-800 text-white text-sm font-medium hover:bg-stone-900 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {presetLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                保存预设
              </button>
            </div>
            </div>
          </div>
        )}

        {/* Settings tab */}
        {activeTab === "settings" && (
          <div className="w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 个性化：主题色 + 后台标题模式 */}
            <div className="bg-white rounded-lg border border-stone-200 p-6 space-y-5 md:col-span-2">
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-[var(--theme-accent)]" />
                <h3 className="font-medium text-sm text-stone-900">个性化</h3>
              </div>

              {/* 主题色 */}
              <div className="border-t border-stone-100 pt-4">
                <div className="text-sm text-stone-700 mb-3">主题色</div>
                <div className="flex items-center gap-3 flex-wrap">
                  {THEME_PRESETS.map(p => (
                    <button
                      key={p.name}
                      onClick={() => handleThemeChange(p.name)}
                      className={`w-9 h-9 rounded-full border-2 transition-all ${themePreset === p.name ? "border-stone-800 scale-110" : "border-transparent hover:scale-105"}`}
                      style={{ background: p.color }}
                      title={p.name}
                    />
                  ))}
                  <span className="text-xs text-stone-400 ml-1">{themePreset}</span>
                </div>
              </div>

              {/* 后台标题模式 */}
              <div className="border-t border-stone-100 pt-4 space-y-4">
                <div>
                  <div className="text-sm text-stone-700">后台标题模式</div>
                  <p className="text-xs text-stone-400 mt-0.5">勾选其一显示其一，勾选二者均显示</p>
                </div>

                {/* 单图标 */}
                <div className="flex items-start gap-3">
                  <Switch
                    checked={adminTitle.showIcon}
                    onCheckedChange={v => setAdminTitle(prev => ({ ...prev, showIcon: v }))}
                    className="shrink-0 mt-0.5 data-[state=checked]:bg-[var(--theme-accent)]"
                    aria-label="显示单图标"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-stone-700 flex items-center gap-1.5">
                      单图标
                      <span className="text-xs text-stone-400">40 × 40 px</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <input
                        type="text"
                        value={adminTitle.iconUrl.startsWith("data:") ? "" : adminTitle.iconUrl}
                        onChange={e => setAdminTitle(prev => ({ ...prev, iconUrl: e.target.value }))}
                        placeholder="图标 URL 链接"
                        className="flex-1 min-w-[160px] px-3 py-1.5 rounded-lg border border-stone-300 focus:border-[var(--theme-accent)] focus:ring-2 focus:ring-[var(--theme-accent)] outline-none text-sm"
                      />
                      <label className="px-3 py-1.5 rounded-lg border border-stone-300 text-stone-700 text-sm hover:bg-stone-50 transition-colors cursor-pointer shrink-0">
                        本地选取
                        <input type="file" accept="image/*" onChange={handleIconFile} className="hidden" />
                      </label>
                    </div>
                    {adminTitle.iconUrl.startsWith("data:") && (
                      <p className="text-xs text-stone-400 mt-1">已选取本地图片（会自动压缩为 80×80）</p>
                    )}
                  </div>
                </div>

                {/* 单文本 */}
                <div className="flex items-start gap-3">
                  <Switch
                    checked={adminTitle.showText}
                    onCheckedChange={v => setAdminTitle(prev => ({ ...prev, showText: v }))}
                    className="shrink-0 mt-0.5 data-[state=checked]:bg-[var(--theme-accent)]"
                    aria-label="显示单文本"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-stone-700">单文本</div>
                    <input
                      type="text"
                      value={adminTitle.titleText}
                      onChange={e => setAdminTitle(prev => ({ ...prev, titleText: e.target.value }))}
                      placeholder="自定义标题（如：后台管理）"
                      className="w-full mt-1.5 px-3 py-1.5 rounded-lg border border-stone-300 focus:border-[var(--theme-accent)] focus:ring-2 focus:ring-[var(--theme-accent)] outline-none text-sm"
                    />
                  </div>
                </div>

                {/* 预览 */}
                <div className="rounded-lg bg-stone-50 border border-stone-200 p-3">
                  <div className="text-xs text-stone-400 mb-1.5">预览</div>
                  <div className="flex items-center gap-2.5">
                    {adminTitle.showIcon && (
                      adminTitle.iconUrl ? (
                        <img src={adminTitle.iconUrl} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-[var(--theme-accent)] flex items-center justify-center shrink-0">
                          <Shield className="h-5 w-5 text-white" />
                        </div>
                      )
                    )}
                    {adminTitle.showText && (
                      <span className="text-2xl font-semibold tracking-tight text-stone-900 leading-none">
                        {adminTitle.titleText || "后台管理"}
                      </span>
                    )}
                    {!adminTitle.showIcon && !adminTitle.showText && (
                      <span className="text-xs text-stone-300">未勾选，标题区将留空</span>
                    )}
                  </div>
                </div>

                <button
                  onClick={savePersonalization}
                  disabled={personalizeLoading}
                  className="px-4 py-2 rounded-lg bg-[var(--theme-accent)] text-white text-sm font-medium hover:bg-[var(--theme-accent-hover)] transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {personalizeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  保存个性化
                </button>
              </div>
            </div>

            {/* Admin identity binding */}
            <div className="bg-white rounded-lg border border-stone-200 p-6">
              <div className="flex items-center gap-2 mb-1">
                <UserCircle2 className="h-5 w-5 text-[var(--theme-accent)]" />
                <h3 className="font-medium text-sm text-stone-900">管理员身份</h3>
              </div>
              <p className="text-xs text-stone-500 mb-4">
                绑定后可用友人账号一键登录后台，回复留言时将以个人身份显示
              </p>
              {config?.adminIdentity ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 rounded-lg bg-stone-50 border border-stone-100 px-3 py-2.5">
                    <div className="w-9 h-9 rounded-full bg-stone-200 overflow-hidden flex items-center justify-center text-sm font-medium text-stone-600 shrink-0">
                      {config.adminIdentity.avatar ? (
                        <img src={config.adminIdentity.avatar} alt={config.adminIdentity.name} className="w-full h-full object-cover" />
                      ) : (
                        config.adminIdentity.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-stone-900">{config.adminIdentity.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-500 flex items-center gap-1">
                          <OAuthProviderIcon id={config.adminIdentity.type} />
                          {OAUTH_PROVIDER_LABELS[config.adminIdentity.type] || config.adminIdentity.type}
                        </span>
                      </div>
                      <p className="text-xs text-stone-400">当前回复身份 · 留言区将显示「站长」徽章</p>
                    </div>
                    <button
                      onClick={handleUnbindIdentity}
                      disabled={identityLoading}
                      className="text-xs text-red-500 hover:text-red-600 disabled:opacity-50 shrink-0"
                    >
                      解绑
                    </button>
                  </div>
                  <p className="text-xs text-stone-400">更换身份：先解绑，再重新绑定</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-stone-400">尚未绑定，当前回复以默认「管理员」身份显示</p>
                  {oauthProviders.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {oauthProviders.map(p => (
                        <button
                          key={p}
                          onClick={() => { window.location.href = `/api/auth/${p}?mode=bind` }}
                          className="flex items-center justify-center gap-2 py-2 rounded-lg border border-stone-300 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
                        >
                          <OAuthProviderIcon id={p} />
                          绑定 {OAUTH_PROVIDER_LABELS[p] || p}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-red-400">未配置任何 OAuth 提供方（环境变量）</p>
                  )}
                </div>
              )}
            </div>

            {/* Password change */}
            <div className="bg-white rounded-lg border border-stone-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <KeyRound className="h-5 w-5 text-[var(--theme-accent)]" />
                <h3 className="font-medium text-sm text-stone-900">修改管理密码</h3>
              </div>
              <form onSubmit={handleChangePassword} className="space-y-3">
                <div>
                  <label className="block text-xs text-stone-500 mb-1">原密码</label>
                  <input
                    type="password"
                    value={oldPwd}
                    onChange={e => setOldPwd(e.target.value)}
                    placeholder="输入当前密码"
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:border-[var(--theme-accent)] focus:ring-2 focus:ring-[var(--theme-accent)] outline-none text-sm"
                    autoComplete="current-password"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">新密码</label>
                  <input
                    type="password"
                    value={newPwd}
                    onChange={e => setNewPwd(e.target.value)}
                    placeholder="输入新密码（至少4位）"
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:border-[var(--theme-accent)] focus:ring-2 focus:ring-[var(--theme-accent)] outline-none text-sm"
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">确认新密码</label>
                  <input
                    type="password"
                    value={confirmPwd}
                    onChange={e => setConfirmPwd(e.target.value)}
                    placeholder="再次输入新密码"
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:border-[var(--theme-accent)] focus:ring-2 focus:ring-[var(--theme-accent)] outline-none text-sm"
                    autoComplete="new-password"
                  />
                </div>
                <button
                  type="submit"
                  disabled={pwdLoading}
                  className="px-4 py-2 rounded-lg bg-[var(--theme-accent)] text-white text-sm font-medium hover:bg-[var(--theme-accent-hover)] transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {pwdLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <KeyRound className="h-4 w-4" />
                      保存密码
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Footer editor */}
            <div className="bg-white rounded-lg border border-stone-200 p-6 space-y-4 md:col-span-2">
              <div>
                <h3 className="font-medium text-sm text-stone-900 mb-1 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-[var(--theme-accent)]" />
                  页脚自定义
                </h3>
                <p className="text-xs text-stone-500">自定义前台和后台页脚内容，支持 HTML</p>
              </div>
              <textarea
                value={footerHtml}
                onChange={e => setFooterHtml(e.target.value)}
                placeholder={`<p class="text-xs text-stone-400">Powered by <span class="font-medium">Yuamli</span> v1.2.0</p>`}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:border-[var(--theme-accent)] focus:ring-2 focus:ring-[var(--theme-accent)] outline-none text-sm font-mono"
              />
              <p className="text-xs text-stone-400">
                留空则显示默认页脚。修改后同时影响前台留言页和后台管理页。
              </p>
              <button
                onClick={saveFooter}
                disabled={footerLoading}
                className="px-4 py-2 rounded-lg bg-[var(--theme-accent)] text-white text-sm font-medium hover:bg-[var(--theme-accent-hover)] transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {footerLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                保存页脚
              </button>
            </div>

            {/* 导出数据 */}
            <div className="bg-white rounded-lg border border-stone-200 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--theme-accent-50)] flex items-center justify-center">
                  <Download className="h-5 w-5 text-[var(--theme-accent)]" />
                </div>
                <div>
                  <h3 className="font-medium text-sm text-stone-900">导出数据</h3>
                  <p className="text-xs text-stone-500">将所有留言、用户和配置导出为 JSON 文件</p>
                </div>
              </div>
              <button
                onClick={handleExport}
                className="px-4 py-2 rounded-lg bg-[var(--theme-accent)] text-white text-sm font-medium hover:bg-[var(--theme-accent-hover)] transition-colors flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                导出数据
              </button>
            </div>

            {/* 导入数据 */}
            <div className="bg-white rounded-lg border border-stone-200 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center">
                  <Upload className="h-5 w-5 text-stone-600" />
                </div>
                <div>
                  <h3 className="font-medium text-sm text-stone-900">导入数据</h3>
                  <p className="text-xs text-stone-500">从备份文件恢复数据（支持合并和覆盖）</p>
                </div>
              </div>
              <label className="px-4 py-2 rounded-lg bg-stone-800 text-white text-sm font-medium hover:bg-stone-900 transition-colors flex items-center gap-2 w-fit cursor-pointer">
                <Upload className="h-4 w-4" />
                选择文件导入
                <input type="file" accept=".json" onChange={handleImport} className="hidden" />
              </label>
            </div>

            {/* Notification settings */}
            <div className="bg-white rounded-lg border border-stone-200 p-6 space-y-5 md:col-span-2">
              <div>
                <h3 className="font-medium text-sm text-stone-900 mb-1">邮件设置</h3>
                <p className="text-xs text-stone-500">配置 SMTP 发信服务，用于新留言通知与前台「邮箱验证码登录」</p>
              </div>

              {/* SMTP config */}
              <div className="rounded-lg bg-stone-50 border border-stone-200 p-4 space-y-3">
                <div className="text-xs font-medium text-stone-600">SMTP 发信服务</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-stone-500 mb-1">SMTP 服务器</label>
                    <input
                      value={smtpHost}
                      onChange={e => setSmtpHost(e.target.value)}
                      placeholder="smtp.qq.com"
                      className="w-full px-3 py-1.5 rounded-lg border border-stone-300 focus:border-[var(--theme-accent)] focus:ring-2 focus:ring-[var(--theme-accent)] outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-stone-500 mb-1">SMTP 端口</label>
                    <input
                      value={smtpPort}
                      onChange={e => setSmtpPort(e.target.value.replace(/\D/g, ""))}
                      placeholder="465"
                      inputMode="numeric"
                      className="w-full px-3 py-1.5 rounded-lg border border-stone-300 focus:border-[var(--theme-accent)] focus:ring-2 focus:ring-[var(--theme-accent)] outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-stone-500 mb-1">SMTP 账号（发件邮箱）</label>
                    <input
                      type="email"
                      value={smtpUser}
                      onChange={e => setSmtpUser(e.target.value)}
                      placeholder="123456789@qq.com"
                      className="w-full px-3 py-1.5 rounded-lg border border-stone-300 focus:border-[var(--theme-accent)] focus:ring-2 focus:ring-[var(--theme-accent)] outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-stone-500 mb-1">SMTP 授权码</label>
                    <input
                      type="password"
                      value={smtpPass}
                      onChange={e => setSmtpPass(e.target.value)}
                      placeholder="邮箱 SMTP 授权码（非登录密码）"
                      className="w-full px-3 py-1.5 rounded-lg border border-stone-300 focus:border-[var(--theme-accent)] focus:ring-2 focus:ring-[var(--theme-accent)] outline-none text-sm"
                    />
                    {smtpPass.includes("•") && (
                      <p className="text-xs text-stone-400 mt-1">已保存，留空或保持原样即不修改</p>
                    )}
                  </div>
                </div>
                <p className="text-xs text-stone-400">
                  QQ 邮箱示例：服务器 smtp.qq.com、端口 465，授权码在 QQ 邮箱「设置 → 账号 → POP3/IMAP/SMTP 服务」中开启后获取
                </p>
              </div>

              <div>
                <label className="flex items-center justify-between">
                  <span className="text-sm text-stone-700 flex items-center gap-1.5">
                    <Mail className="h-4 w-4 text-stone-400" />
                    通知邮箱
                  </span>
                  <input
                    type="email"
                    value={notifyEmail}
                    onChange={e => setNotifyEmail(e.target.value)}
                    placeholder="admin@example.com"
                    className="flex-1 max-w-xs px-3 py-1.5 rounded-lg border border-stone-300 focus:border-[var(--theme-accent)] focus:ring-2 focus:ring-[var(--theme-accent)] outline-none text-sm"
                  />
                </label>
              </div>

              <div>
                <label className="flex items-center justify-between">
                  <span className="text-sm text-stone-700">启用通知</span>
                  <button
                    onClick={() => setNotifyEnabled(!notifyEnabled)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${notifyEnabled ? "bg-[var(--theme-accent)]" : "bg-stone-300"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${notifyEnabled ? "translate-x-5" : ""}`} />
                  </button>
                </label>
              </div>

              <div>
                <label className="block text-sm text-stone-700 mb-1.5">通知模板</label>
                <textarea
                  value={notifyTemplate}
                  onChange={e => setNotifyTemplate(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:border-[var(--theme-accent)] focus:ring-2 focus:ring-[var(--theme-accent)] outline-none text-sm font-mono"
                />
                <p className="text-xs text-stone-400 mt-1">
                  可用变量: {"{author}"}, {"{content}"}, {"{time}"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={saveSettings}
                  className="px-4 py-2 rounded-lg bg-stone-800 text-white text-sm font-medium hover:bg-stone-900 transition-colors"
                >
                  保存设置
                </button>
                <button
                  onClick={handleTestSmtp}
                  disabled={testingSmtp}
                  className="px-4 py-2 rounded-lg border border-stone-300 text-stone-700 text-sm font-medium hover:bg-stone-50 transition-colors disabled:opacity-50"
                >
                  {testingSmtp ? "测试中..." : "测试连接"}
                </button>
              </div>
            </div>
            </div>
          </div>
        )}

        {activeTab === "changelog" && (
          <div className="space-y-4">
            {changelogLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
              </div>
            ) : (
              <>
                {/* Editable cards */}
                {changelog.length === 0 ? (
                  <div className="bg-white rounded-lg border border-stone-200 px-4 py-8 text-center text-xs text-stone-400">暂无更新日志</div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                    {changelog.map((log, i) => (
                      <div key={i} className={`bg-white rounded-lg border border-stone-200 p-4 space-y-3 ${i === 0 ? "bg-[var(--theme-accent-50)]/30" : ""}`}>
                        <div className="flex items-center gap-2">
                          <input
                            value={log.version}
                            onChange={e => updateChangelogItem(i, "version", e.target.value)}
                            className={`flex-1 px-2 py-1 rounded border border-stone-200 text-sm outline-none focus:border-[var(--theme-accent)] font-mono ${i === 0 ? "text-[var(--theme-accent-text)] font-medium" : "text-stone-500"}`}
                          />
                          <button onClick={() => removeChangelog(i)} className="text-red-400 hover:text-red-600 shrink-0">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <input
                          value={log.content}
                          onChange={e => updateChangelogItem(i, "content", e.target.value)}
                          className={`w-full px-2 py-1 rounded border border-stone-200 text-sm outline-none focus:border-[var(--theme-accent)] ${i === 0 ? "text-stone-700" : "text-stone-600"}`}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new entry */}
                <div className="bg-white rounded-lg border border-stone-200 p-4 flex items-end gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-stone-500 mb-1 block">版本号</label>
                    <input
                      value={newLogVersion}
                      onChange={e => setNewLogVersion(e.target.value)}
                      placeholder="如 v1.2.0"
                      className="w-full px-3 py-1.5 rounded-lg border border-stone-300 text-sm outline-none focus:border-[var(--theme-accent)] font-mono"
                    />
                  </div>
                  <div className="flex-[3]">
                    <label className="text-xs text-stone-500 mb-1 block">更新内容</label>
                    <input
                      value={newLogContent}
                      onChange={e => setNewLogContent(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addChangelog() } }}
                      placeholder="描述本次更新内容"
                      className="w-full px-3 py-1.5 rounded-lg border border-stone-300 text-sm outline-none focus:border-[var(--theme-accent)]"
                    />
                  </div>
                  <button
                    onClick={addChangelog}
                    disabled={!newLogVersion.trim() || !newLogContent.trim()}
                    className="px-3 py-1.5 rounded-lg bg-stone-800 text-white text-sm hover:bg-stone-900 transition-colors disabled:opacity-40 flex items-center gap-1"
                  >
                    <Plus className="h-4 w-4" /> 添加
                  </button>
                </div>

                {/* Save button */}
                <div className="flex justify-end">
                  <button
                    onClick={saveChangelog}
                    disabled={changelogSaving}
                    className="px-4 py-2 rounded-lg bg-[var(--theme-accent)] text-white text-sm font-medium hover:bg-[var(--theme-accent-hover)] transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {changelogSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    保存更新日志
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </main>
      {/* Footer — uses config or default */}
      <footer className="border-t bg-white/60 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 text-center">
          {config?.footerHtml ? (
            <div dangerouslySetInnerHTML={{ __html: config.footerHtml }} />
          ) : (
            <p className="text-xs text-stone-400">Powered by <span className="font-medium text-stone-600">Yuamli</span> v1.2.0</p>
          )}
        </div>
      </footer>
      </div>
    </div>
  )
}