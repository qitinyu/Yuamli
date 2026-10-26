'use client'

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useCommentStore } from "@/store/use-comment-store"
import { toast } from "sonner"
import {
  Github,
  AlertCircle,
  HeartHandshake,
  Mail,
  ShieldCheck,
  Lock,
  LogIn,
} from "lucide-react"

const PROVIDER_META: Record<string, { label: string; color: string; text: string }> = {
  github: { label: "GitHub", color: "#24292f", text: "GH" },
  gitee: { label: "Gitee", color: "#c71d23", text: "G" },
}

function ProviderBadge({ id }: { id: string }) {
  if (id === "github") return <Github className="h-4 w-4" />
  const meta = PROVIDER_META[id]
  return (
    <span
      className="h-4 w-4 rounded-[4px] flex items-center justify-center text-[8px] font-bold text-white leading-none"
      style={{ background: meta?.color || "#666" }}
    >
      {meta?.text || id.slice(0, 2).toUpperCase()}
    </span>
  )
}

export default function AuthModal() {
  const { showAuthModal, setShowAuthModal, authModalTab, setAuthModalTab, setUser } =
    useCommentStore()
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState("")
  const [providers, setProviders] = useState<string[]>([])
  const [emailEnabled, setEmailEnabled] = useState(false)

  // 游客（邮箱）登录：账号 + 密码 + 验证码
  const [form, setForm] = useState({ email: "", password: "", code: "" })
  const [sending, setSending] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [rememberMe, setRememberMe] = useState(false)

  // 拉取可用的登录方式
  useEffect(() => {
    if (!showAuthModal) return
    fetch("/api/config")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.oauthProviders) setProviders(data.oauthProviders)
        setEmailEnabled(!!data?.emailLoginEnabled)
      })
      .catch(() => {})
  }, [showAuthModal])

  // 验证码 60s 倒计时
  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  // ===== 友人登录：OAuth 弹窗 =====
  const handleOAuthLogin = (provider: string) => {
    const w = 600, h = 700
    const left = (screen.width - w) / 2
    const top = (screen.height - h) / 2
    const popup = window.open(
      `/api/auth/${provider}`,
      "yuamli_oauth",
      `width=${w},height=${h},left=${left},top=${top},resizable=no,scrollbars=yes`
    )
    if (!popup) {
      toast.error("弹窗被浏览器拦截，请允许弹窗后重试")
      return
    }

    const bc = new BroadcastChannel("yuamli-auth")
    const cleanup = () => {
      bc.close()
      window.removeEventListener("message", onPost)
      clearInterval(checkClosed)
    }

    const handleResult = async (status: string, name: string, error: string, providerLabel: string) => {
      cleanup()
      if (status === "success") {
        toast.success(`${providerLabel || "友人"} 登录成功${name ? `，欢迎 ${name}！` : "！"}`)
        try {
          const res = await fetch("/api/auth/session", { credentials: "same-origin" })
          const data = await res.json()
          if (data.user) {
            setUser(data.user)
            setShowAuthModal(false)
          }
        } catch { /* ignore */ }
      } else {
        toast.error(`登录失败: ${error || name || "未知错误"}`)
      }
    }

    bc.addEventListener("message", (e) =>
      handleResult(e.data.status, e.data.name, e.data.error, e.data.provider)
    )

    // Fallback: postMessage
    const onPost = (e: MessageEvent) => {
      if (e.data?.type !== "yuamli-auth") return
      const d = e.data.data || e.data
      handleResult(d.status, d.name, d.error, d.provider)
    }
    window.addEventListener("message", onPost)

    const checkClosed = setInterval(() => {
      if (popup?.closed) cleanup()
    }, 500)
    setTimeout(cleanup, 180000)
  }

  // ===== 游客登录：发送验证码 =====
  const handleSendCode = async () => {
    setFormError("")
    const email = form.email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormError("请输入有效的邮箱地址")
      return
    }
    setSending(true)
    try {
      const res = await fetch("/api/auth/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) {
        setFormError(data.error || "发送失败")
        return
      }
      setCountdown(60)
      toast.success("验证码已发送，请查收邮件（留意垃圾箱）")
    } catch {
      setFormError("网络错误，请重试")
    } finally {
      setSending(false)
    }
  }

  // ===== 游客登录：邮箱 + 密码 + 验证码 =====
  const handleGuestSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError("")

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setFormError("请输入有效的邮箱地址")
      return
    }
    if (form.password.length < 6) {
      setFormError("密码至少 6 个字符")
      return
    }
    if (!/^\d{6}$/.test(form.code)) {
      setFormError("请输入 6 位验证码")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/auth/guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
          code: form.code,
          remember: rememberMe,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setFormError(data.error || "登录失败")
        return
      }

      setUser(data.user)
      setShowAuthModal(false)
      setForm({ email: "", password: "", code: "" })

      if (data.mode === "register") {
        toast.success(`账号已创建，欢迎 ${data.user.name}！`)
      } else if (data.mode === "reset") {
        toast.success("验证码校验通过，密码已更新并登录")
      } else {
        toast.success(`欢迎回来，${data.user.name}！`)
      }
    } catch {
      setFormError("网络错误，请重试")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={showAuthModal}
      onOpenChange={(open) => {
        setShowAuthModal(open)
        if (!open) setFormError("")
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-lg font-semibold">
            登录
          </DialogTitle>
          <DialogDescription className="text-center text-sm text-muted-foreground">
            登录后即可发表留言
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={authModalTab}
          onValueChange={(v) => {
            setAuthModalTab(v as "friends" | "guest")
            setFormError("")
          }}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="friends" className="flex items-center gap-1.5">
              <HeartHandshake className="h-3.5 w-3.5" />
              友人登录
            </TabsTrigger>
            <TabsTrigger value="guest" className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              游客登录
            </TabsTrigger>
          </TabsList>

          {/* ===== 友人登录：OAuth 授权即登录 ===== */}
          <TabsContent value="friends">
            <div className="space-y-3 pt-2">
              <p className="text-xs text-center text-muted-foreground">
                无须注册，授权成功即可登录
              </p>
              {providers.length === 0 ? (
                <div className="rounded-md bg-muted/50 text-muted-foreground text-xs text-center px-3 py-4">
                  站长暂未配置第三方登录
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {providers.map((p) => (
                    <Button
                      key={p}
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => handleOAuthLogin(p)}
                      disabled={loading}
                    >
                      <ProviderBadge id={p} />
                      {PROVIDER_META[p]?.label || p}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ===== 游客登录：邮箱 + 密码 + 验证码 ===== */}
          <TabsContent value="guest">
            <form onSubmit={handleGuestSubmit} className="space-y-3 pt-2">
              <p className="text-xs text-center text-muted-foreground">
                邮箱即账号，验证码用于注册与找回密码
              </p>

              <div className="space-y-1.5">
                <Label htmlFor="guest-email" className="text-xs">
                  账号（邮箱）
                </Label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="guest-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="pl-8"
                    value={form.email}
                    onChange={(e) => {
                      setForm({ ...form, email: e.target.value })
                      setFormError("")
                    }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="guest-password" className="text-xs">
                  密码（自定义，至少 6 位）
                </Label>
                <div className="relative">
                  <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="guest-password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="输入或设置你的密码"
                    className="pl-8"
                    value={form.password}
                    onChange={(e) => {
                      setForm({ ...form, password: e.target.value })
                      setFormError("")
                    }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="guest-code" className="text-xs">
                  验证码
                </Label>
                <div className="relative">
                  <ShieldCheck className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="guest-code"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="6 位验证码"
                    className="pl-8 pr-[104px]"
                    value={form.code}
                    onChange={(e) => {
                      setForm({ ...form, code: e.target.value.replace(/\D/g, "") })
                      setFormError("")
                    }}
                  />
                  <button
                    type="button"
                    className="absolute right-1.5 top-1.5 h-7 rounded-md px-2 text-xs font-medium text-[var(--theme-accent-text)] hover:underline disabled:opacity-50 disabled:no-underline"
                    onClick={handleSendCode}
                    disabled={countdown > 0 || sending || !emailEnabled}
                  >
                    {countdown > 0
                      ? `${countdown}s 后重发`
                      : sending
                        ? "发送中..."
                        : "获取验证码"}
                  </button>
                </div>
              </div>

              {!emailEnabled && (
                <div className="flex items-start gap-2 rounded-md bg-amber-50 text-amber-700 text-xs px-3 py-2">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>站长尚未配置邮件服务，暂时无法获取验证码。</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember-me"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                  className="h-3.5 w-3.5"
                />
                <Label
                  htmlFor="remember-me"
                  className="text-xs text-muted-foreground cursor-pointer select-none"
                >
                  记住我（30 天免登录）
                </Label>
              </div>

              {formError && (
                <div className="flex items-center gap-2 rounded-md bg-destructive/10 text-destructive text-xs px-3 py-2">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <Button
                type="submit"
                className="w-full gap-2 bg-[var(--theme-accent)] text-white hover:bg-[var(--theme-accent-hover)]"
                disabled={loading}
              >
                <LogIn className="h-4 w-4" />
                {loading ? "处理中..." : "登录 / 注册"}
              </Button>

              <p className="text-[11px] text-center text-muted-foreground leading-relaxed">
                首次使用会自动创建账号；忘记密码时，
                <br />
                获取验证码后直接输入新密码登录即可重置。
              </p>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
