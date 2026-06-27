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
} from "lucide-react"

interface CommentAuthor {
  id: string
  name: string
  avatar: string
  type: "github" | "guest"
}

interface Comment {
  id: string
  content: string
  author: CommentAuthor
  parentId: string | null
  replyTo: { id: string; name: string } | null
  isPinned: boolean
  isFeatured: boolean
  createdAt: string
  updatedAt: string
  replies?: Comment[]
}

interface User {
  id: string
  name: string
  email: string
  avatar: string
  type: "github" | "guest"
  qq?: string
  createdAt: string
}

interface SiteConfig {
  adminPassword: string
  adminEmail: string
  notifyEnabled: boolean
  notifyTemplate: string
  siteName: string
}

type Tab = "comments" | "users" | "settings" | "data"

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

  // Settings form
  const [notifyEmail, setNotifyEmail] = useState("")
  const [notifyEnabled, setNotifyEnabled] = useState(false)
  const [notifyTemplate, setNotifyTemplate] = useState("")

  // Password change form
  const [oldPwd, setOldPwd] = useState("")
  const [newPwd, setNewPwd] = useState("")
  const [confirmPwd, setConfirmPwd] = useState("")
  const [pwdLoading, setPwdLoading] = useState(false)

  const inited = useRef(false)

  // Check existing session
  useEffect(() => {
    if (inited.current) return
    inited.current = true
    checkSession()
  }, [])

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
          await fetchComments()
        }
      }
    } catch {
      // not authed
    } finally {
      setLoading(false)
    }
  }

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
        setAuthed(true)
        setPassword("")
        toast.success("登录成功")
        await Promise.all([fetchComments(), fetchAdminData()])
      } else {
        toast.error(data.message || "密码错误")
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
        }
      }
    } catch {
      // ignore
    }
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

  // Settings save
  const saveSettings = async () => {
    try {
      const res = await fetch("/api/admin/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: notifyEmail,
          enabled: notifyEnabled,
          template: notifyTemplate,
        }),
      })
      if (res.ok) {
        toast.success("设置已保存")
        await fetchAdminData()
      } else {
        toast.error("保存失败")
      }
    } catch {
      toast.error("保存失败")
    }
  }

  // Password change
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
        method: "POST",
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
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/admin/data", {
        method: "POST",
        body: formData,
      })
      const result = await res.json()
      if (res.ok) {
        toast.success(result.message || "导入成功")
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
              <div className="w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center mb-3">
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
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-stone-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm"
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
                className="w-full py-2.5 rounded-lg bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-stone-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-base font-semibold tracking-tight">后台管理</h1>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-stone-600 hover:bg-stone-100 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            退出
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b bg-white/60 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {([
            { key: "comments", label: "留言管理", icon: MessageSquare },
            { key: "users", label: "用户列表", icon: Users },
            { key: "settings", label: "设置", icon: Settings },
            { key: "data", label: "数据备份", icon: Download },
          ] as { key: Tab; label: string; icon: any }[]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? "border-emerald-600 text-emerald-700"
                  : "border-transparent text-stone-500 hover:text-stone-700"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-6">
        {/* Comments tab */}
        {activeTab === "comments" && (
          <div>
            {/* Batch actions */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-stone-500">
                  已选 {selectedIds.size} / {comments.length} 条
                </span>
                {selectedIds.size > 0 && (
                  <>
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
              <div className="space-y-2">
                {comments.map(c => (
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
                          <button onClick={() => deleteComment(c.id)} className="flex items-center gap-1 px-2 py-1 rounded text-xs text-red-500 hover:bg-red-50 transition-colors ml-auto">
                            <Trash2 className="h-3 w-3" /> 删除
                          </button>
                        </div>
                        {/* Replies */}
                        {c.replies && c.replies.length > 0 && (
                          <div className="mt-3 pl-4 border-l-2 border-stone-100 space-y-2">
                            {c.replies.map(r => (
                              <div key={r.id} className="flex items-start gap-2">
                                <span className="text-xs font-medium text-stone-600">{r.author.name}:</span>
                                <span className="text-xs text-stone-500 flex-1">{r.content}</span>
                                <button onClick={() => deleteComment(r.id)} className="text-red-400 hover:text-red-600">
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
            <div className="bg-white rounded-lg border border-stone-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-stone-200">
                <h3 className="font-medium text-sm text-stone-900">注册用户 ({users.length})</h3>
              </div>
              {users.length === 0 ? (
                <div className="text-center py-12 text-stone-400">
                  <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">暂无注册用户</p>
                </div>
              ) : (
                <div className="divide-y divide-stone-100">
                  {users.map(u => (
                    <div key={u.id} className="px-4 py-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-xs font-medium text-stone-600">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-stone-900">{u.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-500">
                            {u.type === "github" ? "GitHub" : "游客"}
                          </span>
                        </div>
                        <p className="text-xs text-stone-400">
                          {u.email || u.qq || "无邮箱"} · {formatDate(u.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Settings tab */}
        {activeTab === "settings" && (
          <div className="max-w-xl space-y-4">
            {/* Password change */}
            <div className="bg-white rounded-lg border border-stone-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <KeyRound className="h-5 w-5 text-emerald-600" />
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
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-sm"
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
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-sm"
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
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-sm"
                    autoComplete="new-password"
                  />
                </div>
                <button
                  type="submit"
                  disabled={pwdLoading}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2"
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

            {/* Notification settings */}
            <div className="bg-white rounded-lg border border-stone-200 p-6 space-y-5">
              <div>
                <h3 className="font-medium text-sm text-stone-900 mb-1">邮件通知设置</h3>
                <p className="text-xs text-stone-500">新留言时通过邮件通知管理员</p>
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
                    className="flex-1 max-w-xs px-3 py-1.5 rounded-lg border border-stone-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-sm"
                  />
                </label>
              </div>

              <div>
                <label className="flex items-center justify-between">
                  <span className="text-sm text-stone-700">启用通知</span>
                  <button
                    onClick={() => setNotifyEnabled(!notifyEnabled)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${notifyEnabled ? "bg-emerald-600" : "bg-stone-300"}`}
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
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-sm font-mono"
                />
                <p className="text-xs text-stone-400 mt-1">
                  可用变量: {"{author}"}, {"{content}"}, {"{time}"}
                </p>
              </div>

              <button
                onClick={saveSettings}
                className="px-4 py-2 rounded-lg bg-stone-800 text-white text-sm font-medium hover:bg-stone-900 transition-colors"
              >
                保存设置
              </button>
            </div>
          </div>
        )}

        {/* Data tab */}
        {activeTab === "data" && (
          <div className="max-w-xl space-y-4">
            <div className="bg-white rounded-lg border border-stone-200 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <Download className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-medium text-sm text-stone-900">导出数据</h3>
                  <p className="text-xs text-stone-500">将所有留言、用户和配置导出为 JSON 文件</p>
                </div>
              </div>
              <button
                onClick={handleExport}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                导出数据
              </button>
            </div>

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
          </div>
        )}
      </main>
      <footer className="border-t bg-white/60 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 text-center">
          <p className="text-xs text-stone-400">Powered by <span className="font-medium text-stone-600">Yuamli</span> v1.0.0</p>
        </div>
      </footer>
    </div>
  )
}
