'use client'

import { useState } from "react"
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
import { Github, Mail, UserPlus, LogIn, MessageCircle, AlertCircle } from "lucide-react"

export default function AuthModal() {
  const { showAuthModal, setShowAuthModal, authModalTab, setAuthModalTab, setUser } =
    useCommentStore()
  const [loading, setLoading] = useState(false)
  const [loginError, setLoginError] = useState("")
  const [loginForm, setLoginForm] = useState({ identifier: "", password: "" })
  const [rememberMe, setRememberMe] = useState(false)
  const [registerForm, setRegisterForm] = useState({
    name: "",
    qq: "",
    email: "",
    password: "",
  })

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError("")
    if (!loginForm.identifier || !loginForm.password) {
      setLoginError("请填写完整的登录信息")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...loginForm, remember: rememberMe }),
      })
      const data = await res.json()
      if (!res.ok) {
        setLoginError(data.error || "登录失败")
        return
      }
      setUser(data.user)
      setShowAuthModal(false)
      setLoginForm({ identifier: "", password: "" })
      setLoginError("")
      toast.success(`欢迎回来，${data.user.name}！`)
    } catch {
      setLoginError("网络错误，请重试")
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!registerForm.name || !registerForm.qq || !registerForm.password) {
      toast.error("请填写昵称、QQ号和密码")
      return
    }
    if (!/^\d{5,12}$/.test(registerForm.qq)) {
      toast.error("QQ号需为 5-12 位数字")
      return
    }
    if (registerForm.password.length < 6) {
      toast.error("密码至少6个字符")
      return
    }
    setLoading(true)
    try {
      const body: Record<string, string> = { ...registerForm }
      if (!body.email) delete body.email
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "注册失败")
        return
      }
      setUser(data.user)
      setShowAuthModal(false)
      setRegisterForm({ name: "", qq: "", email: "", password: "" })
      toast.success(`注册成功，欢迎 ${data.user.name}！`)
    } catch {
      toast.error("网络错误，请重试")
    } finally {
      setLoading(false)
    }
  }

  const handleGithubLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
    if (!clientId) {
      toast.error("GitHub OAuth 未配置，请设置 NEXT_PUBLIC_GITHUB_CLIENT_ID 环境变量");
      return;
    }
    const redirectUri = encodeURIComponent(window.location.origin + "/api/auth/github/callback");
    const scope = "user:email read:user";
    window.location.href =
      `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
  }

  return (
    <Dialog open={showAuthModal} onOpenChange={(open) => { setShowAuthModal(open); if (!open) setLoginError("") }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-lg font-semibold">
            登录 / 注册
          </DialogTitle>
          <DialogDescription className="text-center text-sm text-muted-foreground">
            登录后即可发表留言
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={authModalTab}
          onValueChange={(v) => { setAuthModalTab(v as "login" | "register"); setLoginError("") }}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login" className="flex items-center gap-1.5">
              <LogIn className="h-3.5 w-3.5" />
              登录
            </TabsTrigger>
            <TabsTrigger value="register" className="flex items-center gap-1.5">
              <UserPlus className="h-3.5 w-3.5" />
              注册
            </TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-3 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="login-id" className="text-xs">
                  QQ号 / 邮箱
                </Label>
                <div className="relative">
                  <MessageCircle className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="login-id"
                    placeholder="输入 QQ号 或 邮箱"
                    className="pl-8"
                    value={loginForm.identifier}
                    onChange={(e) => {
                      setLoginForm({ ...loginForm, identifier: e.target.value })
                      setLoginError("")
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
                  value={loginForm.password}
                  onChange={(e) => {
                    setLoginForm({ ...loginForm, password: e.target.value })
                    setLoginError("")
                  }}
                />
              </div>
              {/* Remember me */}
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
              {/* Error message */}
              {loginError && (
                <div className="flex items-center gap-2 rounded-md bg-destructive/10 text-destructive text-xs px-3 py-2">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "登录中..." : "登录"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="register">
            <form onSubmit={handleRegister} className="space-y-3 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="reg-name" className="text-xs">
                  昵称
                </Label>
                <div className="relative">
                  <UserPlus className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="reg-name"
                    placeholder="你的昵称"
                    className="pl-8"
                    value={registerForm.name}
                    onChange={(e) =>
                      setRegisterForm({ ...registerForm, name: e.target.value })
                    }
                    maxLength={20}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reg-qq" className="text-xs">
                  QQ号 <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <MessageCircle className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="reg-qq"
                    placeholder="QQ号码（5-12位数字）"
                    className="pl-8"
                    value={registerForm.qq}
                    onChange={(e) =>
                      setRegisterForm({ ...registerForm, qq: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reg-email" className="text-xs">
                  邮箱（可选）
                </Label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="reg-email"
                    type="email"
                    placeholder="your@email.com"
                    className="pl-8"
                    value={registerForm.email}
                    onChange={(e) =>
                      setRegisterForm({ ...registerForm, email: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reg-pw" className="text-xs">
                  密码（至少6位）
                </Label>
                <Input
                  id="reg-pw"
                  type="password"
                  placeholder="设置密码"
                  value={registerForm.password}
                  onChange={(e) =>
                    setRegisterForm({ ...registerForm, password: e.target.value })
                  }
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "注册中..." : "注册"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">或</span>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={handleGithubLogin}
          disabled={loading}
        >
          <Github className="h-4 w-4" />
          使用 GitHub 登录
        </Button>
      </DialogContent>
    </Dialog>
  )
}