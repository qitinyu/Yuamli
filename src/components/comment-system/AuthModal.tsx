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
import { Github, UserPlus, LogIn, MessageCircle, AlertCircle, HeartHandshake, Mail, ShieldCheck } from "lucide-react"

const PROVIDER_META: Record<string, { label: string; color: string; text: string }> = {
  github: { label: "GitHub", color: "#24292f", text: "GH" },
  gitee: { label: "Gitee", color: "#c71d23", text: "G" },
  gitcode: { label: "GitCode", color: "#fe7300", text: "GC" },
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

  // 邮箱验证码登录
  const [emailForm, setEmailForm] = useState({ email: "", code: "" })
  const [sending, setSending] = useState(false)
  const [countdown, setCountdown] = useState(0)

  // 游客登录 tab：默认「注册并登录」，可切换为「直接登录」
  const [guestMode, setGuestMode] = useState<"register" | "login">("register")
  const [rememberMe, setRememberMe] = useState(false)
  const [guestForm, setGuestForm] = useState({
    name: "",
    account: "",
    password: "",
    confirm: "",
  })

  // Fetch enabled OAuth providers + email login availability
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

  // ===== 友人登录：OAuth popup flow =====
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

  // ===== 友人登录：邮箱验证码 =====
  const handleSendCode = async () => {
    setFormError("")
    const email = emailForm.email.trim()
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

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError("")
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailForm.email.trim())) {
      setFormError("请输入有效的邮箱地址")
      return
    }
    if (!/^\d{6}$/.test(emailForm.code)) {
      setFormError("请输入 6 位验证码")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/auth/email/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailForm.email.trim(),
          code: emailForm.code,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setFormError(data.error || "登录失败")
        return
      }
      setUser(data.user)
      setShowAuthModal(false)
      setEmailForm({ email: "", code: "" })
      toast.success(`登录成功，欢迎 ${data.user.name}！`)
    } catch {
      setFormError("网络错误，请重试")
    } finally {
      setLoading(false)
    }
  }

  // ===== 游客登录：注册即登录 =====
  const handleGuestRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError("")
    if (!guestForm.name.trim()) {
      setFormError("请填写昵称")
      return
    }
    if (guestForm.name.trim().length > 20) {
      setFormError("昵称不能超过 20 个字符")
      return
    }
    if (!/^\d{6,10}$/.test(guestForm.account)) {
      setFormError("账号需为 6-10 位数字")
      return
    }
    if (guestForm.password.length < 6) {
      setFormError("密码至少 6 个字符")
      return
    }
    if (guestForm.password !== guestForm.confirm) {
      setFormError("两次输入的密码不一致")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/auth/guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: guestForm.name.trim(),
          account: guestForm.account,
          password: guestForm.password,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setFormError(data.error || "操作失败")
        return
      }
      setUser(data.user)
      setShowAuthModal(false)
      setGuestForm({ name: "", account: "", password: "", confirm: "" })
      toast.success(
        data.mode === "register"
          ? `注册成功，欢迎 ${data.user.name}！`
          : `欢迎回来，${data.user.name}！`
      )
    } catch {
      setFormError("网络错误，请重试")
    } finally {
      setLoading(false)
    }
  }

  // ===== 游客登录：已有账号直接登录 =====
  const handleGuestLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError("")
    if (!guestForm.account || !guestForm.password) {
      setFormError("请填写账号和密码")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: guestForm.account,
          password: guestForm.password,
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
      setGuestForm({ name: "", account: "", password: "", confirm: "" })
      toast.success(`欢迎回来，${data.user.name}！`)
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
              <UserPlus className="h-3.5 w-3.5" />
              游客登录
            </TabsTrigger>
          </TabsList>

          {/* ===== 友人登录：OAuth 授权即登录 + 邮箱验证码 ===== */}
          <TabsContent value="friends">
            <div className="space-y-3 pt-2">
              <p className="text-xs text-center text-muted-foreground">
                无须注册，授权成功或邮箱验证通过即可登录
              </p>
              {providers.length === 0 && !emailEnabled ? (
                <div className="rounded-md bg-muted/50 text-muted-foreground text-xs text-center px-3 py-4">
                  暂未启用任何友人登录方式
                </div>
              ) : (
                <>
                  {providers.length > 0 && (
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
                  {providers.length > 0 && emailEnabled && (
                    <div className="flex items-center gap-2">
                      <div className="h-px bg-border flex-1" />
                      <span className="text-[10px] text-muted-foreground">或</span>
                      <div className="h-px bg-border flex-1" />
                    </div>
                  )}
                  {emailEnabled && (
                    <form onSubmit={handleEmailLogin} className="space-y-2">
                      <div className="relative">
                        <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="email"
                          placeholder="邮箱地址"
                          className="pl-8 pr-[92px]"
                          value={emailForm.email}
                          onChange={(e) => {
                            setEmailForm({ ...emailForm, email: e.target.value })
                            setFormError("")
                          }}
                        />
                        <button
                          type="button"
                          className="absolute right-1.5 top-1.5 h-7 rounded-md px-2 text-xs font-medium text-primary hover:underline disabled:opacity-50 disabled:no-underline"
                          onClick={handleSendCode}
                          disabled={countdown > 0 || sending}
                        >
                          {countdown > 0
                            ? `${countdown}s 后重发`
                            : sending
                              ? "发送中..."
                              : "获取验证码"}
                        </button>
                      </div>
                      <div className="relative">
                        <ShieldCheck className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="6 位验证码"
                          className="pl-8"
                          inputMode="numeric"
                          maxLength={6}
                          value={emailForm.code}
                          onChange={(e) => {
                            setEmailForm({ ...emailForm, code: e.target.value.replace(/\D/g, "") })
                            setFormError("")
                          }}
                        />
                      </div>
                      {formError && (
                        <div className="flex items-center gap-2 rounded-md bg-destructive/10 text-destructive text-xs px-3 py-2">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          <span>{formError}</span>
                        </div>
                      )}
                      <Button type="submit" className="w-full gap-2" disabled={loading}>
                        <Mail className="h-4 w-4" />
                        {loading ? "登录中..." : "邮箱验证码登录"}
                      </Button>
                    </form>
                  )}
                </>
              )}
            </div>
          </TabsContent>

          {/* ===== 游客登录：注册即登录 ===== */}
          <TabsContent value="guest">
            {guestMode === "register" ? (
              <form onSubmit={handleGuestRegister} className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="guest-name" className="text-xs">
                    昵称 <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <UserPlus className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="guest-name"
                      placeholder="你的昵称"
                      className="pl-8"
                      value={guestForm.name}
                      maxLength={20}
                      onChange={(e) => {
                        setGuestForm({ ...guestForm, name: e.target.value })
                        setFormError("")
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="guest-account" className="text-xs">
                    账号 <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <MessageCircle className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="guest-account"
                      placeholder="6-10 位数字"
                      className="pl-8"
                      value={guestForm.account}
                      inputMode="numeric"
                      maxLength={10}
                      onChange={(e) => {
                        setGuestForm({ ...guestForm, account: e.target.value.replace(/\D/g, "") })
                        setFormError("")
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="guest-pw" className="text-xs">
                    密码（至少6位） <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="guest-pw"
                    type="password"
                    placeholder="设置密码"
                    value={guestForm.password}
                    onChange={(e) => {
                      setGuestForm({ ...guestForm, password: e.target.value })
                      setFormError("")
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="guest-pw2" className="text-xs">
                    确认密码 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="guest-pw2"
                    type="password"
                    placeholder="再次输入密码"
                    value={guestForm.confirm}
                    onChange={(e) => {
                      setGuestForm({ ...guestForm, confirm: e.target.value })
                      setFormError("")
                    }}
                  />
                </div>
                {formError && (
                  <div className="flex items-center gap-2 rounded-md bg-destructive/10 text-destructive text-xs px-3 py-2">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "提交中..." : "注册并登录"}
                </Button>
                <button
                  type="button"
                  className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setGuestMode("login")
                    setFormError("")
                  }}
                >
                  已有账号？直接登录
                </button>
              </form>
            ) : (
              <form onSubmit={handleGuestLogin} className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="login-account" className="text-xs">
                    账号
                  </Label>
                  <div className="relative">
                    <MessageCircle className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-account"
                      placeholder="输入注册时的账号"
                      className="pl-8"
                      value={guestForm.account}
                      onChange={(e) => {
                        setGuestForm({ ...guestForm, account: e.target.value })
                        setFormError("")
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="login-pw" className="text-xs">
                    密码
                  </Label>
                  <Input
                    id="login-pw"
                    type="password"
                    placeholder="输入密码"
                    value={guestForm.password}
                    onChange={(e) => {
                      setGuestForm({ ...guestForm, password: e.target.value })
                      setFormError("")
                    }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="remember-me"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                    className="h-3.5 w-3.5"
                  />
                  <Label htmlFor="remember-me" className="text-xs text-muted-foreground cursor-pointer select-none">
                    记住我（30天免登录）
                  </Label>
                </div>
                {formError && (
                  <div className="flex items-center gap-2 rounded-md bg-destructive/10 text-destructive text-xs px-3 py-2">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "登录中..." : "登录"}
                </Button>
                <button
                  type="button"
                  className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setGuestMode("register")
                    setFormError("")
                  }}
                >
                  没有账号？注册并登录
                </button>
              </form>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
