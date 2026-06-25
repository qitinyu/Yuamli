'use client'

import { useState, useEffect, useCallback, useRef } from "react"
import { useCommentStore } from "@/store/use-comment-store"
import { toast } from "sonner"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import {
  Shield,
  Users,
  Mail,
  LogOut,
  Lock,
  Eye,
  Trash2,
  Pin,
  PinOff,
  Star,
  StarOff,
  MessageSquare,
  RefreshCw,
  Loader2,
  Download,
  Upload,
  Database,
} from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface AdminComment {
  id: string
  content: string
  author: { id: string; name: string; type: string }
  isPinned: boolean
  isFeatured: boolean
  createdAt: string
  parentId: string | null
}

export default function AdminPanel() {
  const { showAdminPanel, setShowAdminPanel, isAdmin, setAdmin, incrementRefresh } =
    useCommentStore()
  const [passwordInput, setPasswordInput] = useState("")
  const [loginLoading, setLoginLoading] = useState(false)
  const [adminData, setAdminData] = useState<{
    users: Array<{
      id: string
      name: string
      email: string
      type: string
      createdAt: string
    }>
    config: { adminEmail: string; notifyEnabled: boolean; notifyTemplate: string; siteName: string }
  } | null>(null)
  const [notifyEmail, setNotifyEmail] = useState("")
  const [notifyEnabled, setNotifyEnabled] = useState(false)
  const [notifyTemplate, setNotifyTemplate] = useState("")
  const [savingNotify, setSavingNotify] = useState(false)

  // Comment management state
  const [adminComments, setAdminComments] = useState<AdminComment[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [batchLoading, setBatchLoading] = useState(false)

  // Data export / import state
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const importInputRef = useRef<HTMLInputElement>(null)

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwordInput) return
    setLoginLoading(true)
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passwordInput }),
      })
      if (!res.ok) {
        toast.error("管理密码错误，请重试")
        return
      }
      setAdmin(true)
      setPasswordInput("")
      toast.success("已进入后台管理")
    } catch {
      toast.error("网络错误")
    } finally {
      setLoginLoading(false)
    }
  }

  const handleAdminLogout = async () => {
    try {
      await fetch("/api/admin", { method: "DELETE" })
      setAdmin(false)
      setAdminData(null)
      setAdminComments([])
      setSelectedIds(new Set())
      toast.success("已退出后台")
    } catch {
      // ignore
    }
  }

  const fetchAdminData = useCallback(() => {
    fetch("/api/admin")
      .then((r) => r.json())
      .then((data) => {
        setAdminData(data)
        setNotifyEmail(data.config?.adminEmail || "")
        setNotifyEnabled(data.config?.notifyEnabled || false)
        setNotifyTemplate(data.config?.notifyTemplate || "")
      })
      .catch(() => {})
  }, [])

  const fetchAdminComments = useCallback(() => {
    setCommentsLoading(true)
    fetch("/api/admin/comments")
      .then((r) => r.json())
      .then((data) => {
        if (data.comments) setAdminComments(data.comments)
      })
      .catch(() => {})
      .finally(() => setCommentsLoading(false))
  }, [])

  useEffect(() => {
    if (isAdmin && showAdminPanel) {
      fetchAdminData()
      fetchAdminComments()
    }
  }, [isAdmin, showAdminPanel, fetchAdminData, fetchAdminComments])

  const handleSaveNotify = async () => {
    setSavingNotify(true)
    try {
      const res = await fetch("/api/admin/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: notifyEmail, enabled: notifyEnabled, template: notifyTemplate }),
      })
      if (!res.ok) {
        toast.error("保存失败")
        return
      }
      toast.success("通知设置已保存")
    } catch {
      toast.error("网络错误")
    } finally {
      setSavingNotify(false)
    }
  }

  // Export data
  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await fetch("/api/admin/data")
      if (!res.ok) {
        toast.error("导出失败，请确认管理员已登录")
        return
      }
      const blob = await res.blob()
      // Extract filename from Content-Disposition header
      const disposition = res.headers.get("Content-Disposition")
      let filename = `yuamli-backup-${new Date().toISOString().slice(0, 10)}.json`
      if (disposition) {
        const match = disposition.match(/filename="?([^"]+)"?/)
        if (match) filename = match[1]
      }
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success("数据已导出")
    } catch {
      toast.error("导出失败，网络错误")
    } finally {
      setExporting(false)
    }
  }

  // Import data
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Reset file input so the same file can be re-selected
    e.target.value = ""

    const isOverwrite = confirm(
      "导入模式选择：\n\n点击「确定」= 覆盖导入（清空现有数据后写入备份）\n点击「取消」= 合并导入（保留现有数据，只添加不存在的记录）"
    )
    const mode = isOverwrite ? "overwrite" : "merge"

    if (!confirm(
      isOverwrite
        ? "⚠️ 覆盖导入将替换所有现有数据，此操作不可撤销！确认继续？"
        : "将以合并模式导入数据，现有数据不会被删除。确认继续？"
    )) return

    setImporting(true)
    try {
      const text = await file.text()
      let data: any
      try {
        data = JSON.parse(text)
      } catch {
        toast.error("文件格式错误，不是有效的 JSON")
        return
      }

      // Validate structure
      if (!data._meta || !data.comments && !data.users && !data.config) {
        toast.error("这不是 Yuamli 的备份文件")
        return
      }

      const res = await fetch("/api/admin/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comments: data.comments,
          users: data.users,
          config: data.config,
          mode,
        }),
      })
      const result = await res.json()
      if (!res.ok) {
        toast.error(result.message || "导入失败")
        return
      }

      const { stats } = result
      const parts: string[] = []
      if (stats.comments > 0) parts.push(`留言 ${stats.comments} 条`)
      if (stats.users > 0) parts.push(`用户 ${stats.users} 个`)
      if (stats.config) parts.push("配置")
      const detail = parts.length > 0 ? `（${parts.join("、")}）` : ""
      toast.success(`${result.message}${detail}`)

      // Refresh data
      fetchAdminData()
      fetchAdminComments()
      incrementRefresh()
    } catch {
      toast.error("导入失败，请重试")
    } finally {
      setImporting(false)
    }
  }

  // Batch operations
  const toggleSelectAll = () => {
    if (selectedIds.size === adminComments.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(adminComments.map((c) => c.id)))
    }
  }

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const handleBatchAction = async (action: string) => {
    if (selectedIds.size === 0) return
    const actionNames: Record<string, string> = {
      batch_delete: "批量删除",
      batch_pin: "批量置顶",
      batch_unpin: "批量取消置顶",
      batch_feature: "批量设为精华",
      batch_unfeature: "批量取消精华",
    }
    if (!confirm(`确认${actionNames[action] || action} ${selectedIds.size} 条留言？`)) return

    setBatchLoading(true)
    try {
      const res = await fetch("/api/admin/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ids: Array.from(selectedIds) }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.message || "操作失败")
        return
      }
      toast.success(data.message || "操作成功")
      setSelectedIds(new Set())
      fetchAdminComments()
      incrementRefresh()
    } catch {
      toast.error("网络错误")
    } finally {
      setBatchLoading(false)
    }
  }

  return (
    <Sheet open={showAdminPanel} onOpenChange={setShowAdminPanel}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="px-4 pt-4">
          <SheetTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-600" />
            后台管理
          </SheetTitle>
        </SheetHeader>

        <div className="px-4 pb-6">
          {!isAdmin ? (
            <form onSubmit={handleAdminLogin} className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label htmlFor="admin-pw" className="flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5" />
                  管理密码
                </Label>
                <div className="relative">
                  <Input
                    id="admin-pw"
                    type="password"
                    placeholder="输入管理密码"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  默认密码: admin123
                </p>
              </div>
              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                disabled={loginLoading}
              >
                {loginLoading ? "验证中..." : "进入后台"}
              </Button>
            </form>
          ) : (
            <div className="space-y-6 mt-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-300">
                  <Eye className="h-3 w-3" />
                  管理员模式
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive text-xs"
                  onClick={handleAdminLogout}
                >
                  <LogOut className="h-3.5 w-3.5 mr-1" />
                  退出后台
                </Button>
              </div>

              <Separator />

              {/* Email Notification Settings */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium flex items-center gap-1.5">
                  <Mail className="h-4 w-4" />
                  邮箱通知
                </h3>
                <div className="space-y-2">
                  <Label htmlFor="admin-email" className="text-xs">
                    站长邮箱
                  </Label>
                  <Input
                    id="admin-email"
                    type="email"
                    placeholder="admin@example.com"
                    value={notifyEmail}
                    onChange={(e) => setNotifyEmail(e.target.value)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs">启用新留言通知</Label>
                    <p className="text-[10px] text-muted-foreground">
                      收到新留言时发送邮件提醒站长
                    </p>
                  </div>
                  <Switch
                    checked={notifyEnabled}
                    onCheckedChange={setNotifyEnabled}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notify-template" className="text-xs">
                    通知邮件内容模板
                  </Label>
                  <Textarea
                    id="notify-template"
                    placeholder="输入邮件内容模板..."
                    value={notifyTemplate}
                    onChange={(e) => setNotifyTemplate(e.target.value)}
                    className="min-h-[120px] text-xs font-mono"
                    rows={5}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    可用变量：{"{author}"} 作者名、{"{content}"} 留言内容、{"{time}"} 时间
                  </p>
                </div>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleSaveNotify}
                  disabled={savingNotify}
                >
                  {savingNotify ? "保存中..." : "保存通知设置"}
                </Button>
              </div>

              <Separator />

              {/* Users Table */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  注册用户 ({adminData?.users.length || 0})
                </h3>
                <ScrollArea className="max-h-[200px] rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">用户</TableHead>
                        <TableHead className="text-xs">类型</TableHead>
                        <TableHead className="text-xs">邮箱</TableHead>
                        <TableHead className="text-xs text-right">注册时间</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {adminData?.users.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="text-xs font-medium">
                            {u.name}
                          </TableCell>
                          <TableCell className="text-xs">
                            <Badge
                              variant="secondary"
                              className="text-[10px] h-4"
                            >
                              {u.type === "github" ? "GitHub" : "游客"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {u.email || "-"}
                          </TableCell>
                          <TableCell className="text-xs text-right text-muted-foreground">
                            {new Date(u.createdAt).toLocaleDateString("zh-CN")}
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!adminData?.users || adminData.users.length === 0) && (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="text-xs text-center text-muted-foreground py-8"
                          >
                            暂无注册用户
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>

              <Separator />

              {/* Data Backup & Restore */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium flex items-center gap-1.5">
                  <Database className="h-4 w-4" />
                  数据备份
                </h3>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  将 KV 中的留言、用户、配置导出为 JSON 文件。RAM-only 存储无持久化，建议定期备份以防数据丢失。
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5"
                    onClick={handleExport}
                    disabled={exporting}
                  >
                    {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    导出数据
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5"
                    onClick={() => importInputRef.current?.click()}
                    disabled={importing}
                  >
                    {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    导入数据
                  </Button>
                  <input
                    ref={importInputRef}
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleImport}
                  />
                </div>
                <div className="rounded-md bg-muted/40 border p-2.5 space-y-1.5">
                  <p className="text-[10px] text-muted-foreground font-medium">导出文件包含：</p>
                  <div className="grid grid-cols-3 gap-2 text-[10px]">
                    <div className="rounded bg-background border px-2 py-1.5 text-center">
                      <p className="font-medium">comments</p>
                      <p className="text-muted-foreground">所有留言</p>
                    </div>
                    <div className="rounded bg-background border px-2 py-1.5 text-center">
                      <p className="font-medium">users</p>
                      <p className="text-muted-foreground">用户账号</p>
                    </div>
                    <div className="rounded bg-background border px-2 py-1.5 text-center">
                      <p className="font-medium">config</p>
                      <p className="text-muted-foreground">站点配置</p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Comment Batch Management */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium flex items-center gap-1.5">
                    <MessageSquare className="h-4 w-4" />
                    留言管理 ({adminComments.length})
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={fetchAdminComments}
                    disabled={commentsLoading}
                  >
                    <RefreshCw className={`h-3 w-3 ${commentsLoading ? "animate-spin" : ""}`} />
                    刷新
                  </Button>
                </div>

                {/* Batch action bar */}
                {selectedIds.size > 0 && (
                  <div className="flex items-center gap-2 flex-wrap rounded-lg bg-muted/50 p-2 border">
                    <span className="text-xs text-muted-foreground">已选 {selectedIds.size} 条</span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-[10px] gap-1"
                        onClick={() => handleBatchAction("batch_pin")}
                        disabled={batchLoading}
                      >
                        <Pin className="h-3 w-3" /> 置顶
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-[10px] gap-1"
                        onClick={() => handleBatchAction("batch_unpin")}
                        disabled={batchLoading}
                      >
                        <PinOff className="h-3 w-3" /> 取消置顶
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-[10px] gap-1"
                        onClick={() => handleBatchAction("batch_feature")}
                        disabled={batchLoading}
                      >
                        <Star className="h-3 w-3" /> 精华
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-[10px] gap-1"
                        onClick={() => handleBatchAction("batch_unfeature")}
                        disabled={batchLoading}
                      >
                        <StarOff className="h-3 w-3" /> 取消精华
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-[10px] gap-1 text-destructive hover:text-destructive"
                        onClick={() => handleBatchAction("batch_delete")}
                        disabled={batchLoading}
                      >
                        <Trash2 className="h-3 w-3" /> 删除
                      </Button>
                    </div>
                    {batchLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                  </div>
                )}

                {/* Comment list */}
                <ScrollArea className="max-h-[350px] rounded-md border">
                  {commentsLoading && adminComments.length === 0 ? (
                    <div className="flex items-center justify-center py-8 text-muted-foreground text-xs">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" /> 加载中...
                    </div>
                  ) : adminComments.length === 0 ? (
                    <div className="flex items-center justify-center py-8 text-muted-foreground text-xs">
                      暂无留言
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-8 pl-3">
                            <Checkbox
                              checked={selectedIds.size === adminComments.length && adminComments.length > 0}
                              onCheckedChange={toggleSelectAll}
                              className="h-3.5 w-3.5"
                            />
                          </TableHead>
                          <TableHead className="text-xs">作者</TableHead>
                          <TableHead className="text-xs">内容</TableHead>
                          <TableHead className="text-xs">状态</TableHead>
                          <TableHead className="text-xs text-right">时间</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {adminComments.map((c) => (
                          <TableRow key={c.id} className={selectedIds.has(c.id) ? "bg-muted/30" : ""}>
                            <TableCell className="pl-3">
                              <Checkbox
                                checked={selectedIds.has(c.id)}
                                onCheckedChange={() => toggleSelect(c.id)}
                                className="h-3.5 w-3.5"
                              />
                            </TableCell>
                            <TableCell className="text-xs">
                              <div className="flex items-center gap-1">
                                <span className="font-medium">{c.author.name}</span>
                                {c.author.type === "github" && (
                                  <Badge variant="secondary" className="text-[9px] h-3 px-1">GH</Badge>
                                )}
                                {c.parentId && (
                                  <Badge variant="outline" className="text-[9px] h-3 px-1">回复</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[140px] truncate">
                              {c.content.replace(/[#*`\[\]]/g, "").slice(0, 30)}
                            </TableCell>
                            <TableCell className="text-xs">
                              <div className="flex items-center gap-1">
                                {c.isPinned && <Badge className="h-3.5 px-1 text-[9px] bg-amber-500 text-white">置顶</Badge>}
                                {c.isFeatured && <Badge className="h-3.5 px-1 text-[9px] bg-rose-500 text-white">精华</Badge>}
                                {!c.isPinned && !c.isFeatured && <span className="text-muted-foreground">-</span>}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-right text-muted-foreground whitespace-nowrap">
                              {new Date(c.createdAt).toLocaleDateString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </ScrollArea>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}