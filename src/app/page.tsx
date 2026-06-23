'use client'

import { useEffect, useCallback } from "react"
import { useCommentStore } from "@/store/use-comment-store"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import CommentList from "@/components/comment-system/CommentList"
import CommentForm from "@/components/comment-system/CommentForm"
import AuthModal from "@/components/comment-system/AuthModal"
import AdminPanel from "@/components/comment-system/AdminPanel"
import { LogOut, Shield, MessageCircleHeart, User } from "lucide-react"

export default function Home() {
  const { user, setUser, isAdmin, setAdmin, setShowAdminPanel, setShowAuthModal } = useCommentStore()

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session")
      const data = await res.json()
      if (data.user) setUser(data.user)
    } catch { /* ignore */ }
  }, [setUser])

  useEffect(() => { fetchSession() }, [fetchSession])

  // Handle GitHub OAuth callback — session cookie is now set server-side
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const ghLogin = params.get("github_login")
    const ghError = params.get("github_error")

    if (ghLogin === "success") {
      const ghName = params.get("gh_name")
      toast.success(`GitHub 登录成功${ghName ? `，欢迎 ${decodeURIComponent(ghName)}！` : "！"}`)
      window.history.replaceState({}, "", "/")
      // Re-fetch session to update user from the new cookie
      fetchSession()
    } else if (ghError) {
      toast.error("GitHub 登录失败: " + decodeURIComponent(ghError))
      window.history.replaceState({}, "", "/")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLogout = async () => {
    try { await fetch("/api/auth/session", { method: "POST" }); setUser(null); toast.success("已退出登录") }
    catch { /* ignore */ }
  }

  const getInitial = (name: string) => name.charAt(0).toUpperCase()

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-stone-50 to-white">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <MessageCircleHeart className="h-5 w-5 text-emerald-600" />
            <h1 className="text-base font-semibold tracking-tight">留言板</h1>
            <Badge variant="secondary" className="text-[10px] h-4 font-normal">v1.0.0</Badge>
          </div>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <div className="flex items-center gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="bg-emerald-100 text-emerald-700 text-[10px] font-medium">{getInitial(user.name)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium hidden sm:inline">{user.name}</span>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleLogout} title="退出登录"><LogOut className="h-4 w-4" /></Button>
              </>
            ) : (
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setShowAuthModal(true)}>
                <User className="h-3.5 w-3.5" /> 登录
              </Button>
            )}
            <Separator orientation="vertical" className="h-5" />
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowAdminPanel(true)} title="后台管理">
              <Shield className={`h-4 w-4 ${isAdmin ? "text-emerald-600" : "text-muted-foreground"}`} />
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
        <section className="mb-8"><CommentForm onSubmitted={() => {}} /></section>
        <Separator className="mb-6" />
        <section><CommentList /></section>
      </main>
      <footer className="border-t bg-white/60 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 text-center">
          <p className="text-xs text-muted-foreground">Powered by <span className="font-medium text-foreground">Yuamli</span> v1.0.0</p>
        </div>
      </footer>
      <AuthModal />
      <AdminPanel />
    </div>
  )
}