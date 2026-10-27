'use client'

import { Suspense, useEffect, useCallback, useMemo, useState } from "react"
import { useCommentStore } from "@/store/use-comment-store"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"
import CommentList from "@/components/comment-system/CommentList"
import CommentForm from "@/components/comment-system/CommentForm"
import AuthModal from "@/components/comment-system/AuthModal"
import { Loader2, RefreshCw } from "lucide-react"
import { THEME_PRESETS, themeToStyle } from "@/lib/theme"
import {
  normalizeCommentExpand,
  type CommentExpandConfig,
} from "@/lib/comment-expand"

function CommentPage() {
  const { setUser, setComments, setLoading, incrementRefresh, setAdminAuthorId } = useCommentStore()
  const searchParams = useSearchParams()
  const pageId = searchParams.get("pageId") || ""
  // embed=1 时进入嵌入模式：透明背景、去内边距、字体/主题由宿主页面注入，高度自适应上报
  const embed = searchParams.get("embed") === "1"
  const [footerHtml, setFooterHtml] = useState<string | null>(null)
  const [themeStyle, setThemeStyle] = useState<Record<string, string>>({})
  const [commentPlaceholder, setCommentPlaceholder] = useState<string>("")
  // null = 配置还没加载完，CommentList 会等它到了再决定首屏展开数量
  const [commentExpand, setCommentExpand] = useState<CommentExpandConfig | null>(null)

  const fetchSession = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/session", { credentials: "same-origin" })
      const data = await res.json()
      if (data.user) { setUser(data.user); return true }
      return false
    } catch { return false }
  }, [setUser])

  // Fetch public config (footer + theme + placeholder + admin badge + providers)
  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/config")
      if (res.ok) {
        const data = await res.json()
        if (data.footerHtml) setFooterHtml(data.footerHtml)
        if (data.commentPlaceholder) setCommentPlaceholder(data.commentPlaceholder)
        setCommentExpand(normalizeCommentExpand(data.commentExpand))
        if (data.adminAuthorId) setAdminAuthorId(data.adminAuthorId)
        if (data.themePreset) {
          const preset = THEME_PRESETS.find(p => p.name === data.themePreset)
          if (preset) setThemeStyle(themeToStyle(preset))
        }
      }
    } catch { /* ignore */ }
  }, [setAdminAuthorId])

  // Manual refresh
  const handleRefresh = useCallback(() => {
    incrementRefresh()
    toast.success("已刷新")
  }, [incrementRefresh])

  useEffect(() => {
    void fetchSession()
    void fetchConfig()
  }, [fetchSession, fetchConfig])

  // Direct-navigation OAuth result (popup blocked / callback redirect fallback)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("oauth_login") === "success") {
      const name = params.get("name")
      toast.success(`登录成功${name ? `，欢迎 ${name}！` : "！"}`)
      void fetchSession()
      params.delete("oauth_login"); params.delete("name")
    }
    const oauthError = params.get("oauth_error")
    if (oauthError) {
      toast.error(`登录失败: ${oauthError}`)
      params.delete("oauth_error")
    }
    const qs = params.toString()
    window.history.replaceState(null, "", window.location.pathname + (qs ? `?${qs}` : ""))
  }, [])

  // Listen for BroadcastChannel (popup OAuth result)
  useEffect(() => {
    const bc = new BroadcastChannel("yuamli-auth")
    bc.addEventListener("message", async (e) => {
      const { status, name, error } = e.data
      if (status === "success") {
        toast.success(`登录成功${name ? `，欢迎 ${name}！` : "！"}`)
        await fetchSession()
      } else if (status === "error") {
        toast.error(`登录失败: ${error || name || "未知错误"}`)
      }
    })
    return () => bc.close()
  }, [fetchSession])

  // Fallback: postMessage listener
  useEffect(() => {
    const handler = async (e: MessageEvent) => {
      if (e.data?.type !== "yuamli-auth") return
      const { status, name, error } = e.data.data || e.data
      if (status === "success") {
        toast.success(`登录成功${name ? `，欢迎 ${name}！` : "！"}`)
        await fetchSession()
      } else if (status === "error") {
        toast.error(`登录失败: ${error || name || "未知错误"}`)
      }
    }
    window.addEventListener("message", handler)
    return () => window.removeEventListener("message", handler)
  }, [fetchSession])

  const stablePageId = useMemo(() => pageId, [pageId])

  // ===== 嵌入模式：透明外壳 + 高度自适应上报 + 接收宿主字体/主题 =====
  useEffect(() => {
    if (!embed) return
    const root = document.documentElement
    const body = document.body

    // 1) 透明背景（去掉 Next 页面的默认底色，让宿主博客的卡片背景透出来）
    root.style.background = "transparent"
    root.style.backgroundColor = "transparent"
    body.style.background = "transparent"
    body.style.backgroundColor = "transparent"
    root.dataset.embed = "1"

    // 2) 高度上报：内容变化时把真实高度 postMessage 给宿主页面，消除 iframe 内部滚动条
    const sendHeight = () => {
      const h = Math.ceil(root.scrollHeight)
      window.parent?.postMessage({ type: "yuamli:height", height: h }, "*")
    }
    window.parent?.postMessage({ type: "yuamli:ready" }, "*")
    sendHeight()
    const ro = new ResizeObserver(sendHeight)
    ro.observe(body)
    const mo = new MutationObserver(sendHeight)
    mo.observe(body, { childList: true, subtree: true, attributes: true })

    // 3) 接收宿主页面注入的配置（字体栈 / 明暗主题 / 强调色）
    const onMessage = (e: MessageEvent) => {
      const d = e.data
      if (!d || d.type !== "yuamli:config") return
      if (d.fontBody) {
        // 覆盖 body 字体 + Geist 变量，让留言继承博客字体
        body.style.fontFamily = d.fontBody
        root.style.setProperty("--font-geist-sans", d.fontBody)
      }
      if (d.accent) {
        root.style.setProperty("--theme-accent", d.accent)
      }
      if (d.theme === "dark") root.classList.add("dark")
      else if (d.theme === "light") root.classList.remove("dark")
      // 主题变化后高度可能变化，重新上报
      requestAnimationFrame(sendHeight)
    }
    window.addEventListener("message", onMessage)

    return () => {
      ro.disconnect()
      mo.disconnect()
      window.removeEventListener("message", onMessage)
    }
  }, [embed])

  return (
    <div className={`min-h-0 flex flex-col ${embed ? "bg-transparent" : "bg-gradient-to-b from-stone-50 to-white"}`} style={themeStyle}>
      <main className={`flex-1 w-full ${embed ? "px-0 py-0" : "px-4 py-4"}`}>
        <div className={pageId || embed ? "" : "max-w-2xl mx-auto"}>
          <section className="mb-6">
            <CommentForm onSubmitted={() => {}} pageId={stablePageId} onRefresh={handleRefresh} placeholder={commentPlaceholder} />
          </section>
          <section>
            <CommentList pageId={stablePageId} expand={commentExpand} />
          </section>
        </div>
      </main>
      {!pageId && !embed && (
        <footer className="border-t bg-white/60 backdrop-blur-sm">
          <div className="max-w-2xl mx-auto px-4 py-3 text-center">
            {footerHtml ? (
              <div dangerouslySetInnerHTML={{ __html: footerHtml }} />
            ) : (
              <p className="text-xs text-muted-foreground">Powered by <span className="font-medium text-foreground">Yuamli</span> v1.1.3</p>
            )}
          </div>
        </footer>
      )}
      <AuthModal />
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-0 flex items-center justify-center bg-gradient-to-b from-stone-50 to-white py-10">
        <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
      </div>
    }>
      <CommentPage />
    </Suspense>
  )
}