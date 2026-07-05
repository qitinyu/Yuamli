'use client'

import { Suspense, useEffect, useCallback, useRef, useMemo } from "react"
import { useCommentStore } from "@/store/use-comment-store"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"
import CommentList from "@/components/comment-system/CommentList"
import CommentForm from "@/components/comment-system/CommentForm"
import AuthModal from "@/components/comment-system/AuthModal"
import { MessageCircleHeart, Loader2 } from "lucide-react"

function CommentPage() {
  const { setUser } = useCommentStore()
  const searchParams = useSearchParams()
  const pageId = searchParams.get("pageId") || ""

  const fetchSession = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/session", { credentials: "same-origin" })
      const data = await res.json()
      if (data.user) {
        setUser(data.user)
        return true
      }
      return false
    } catch {
      return false
    }
  }, [setUser])

  // Initial session fetch
  useEffect(() => { fetchSession() }, [fetchSession])

  // Listen for BroadcastChannel messages (from popup OAuth in iframe context)
  useEffect(() => {
    const bc = new BroadcastChannel("yuamli-auth")
    const onMessage = async (event: MessageEvent) => {
      const { status, name } = event.data
      if (status === "success") {
        toast.success(`GitHub 登录成功${name ? `，欢迎 ${name}！` : "！"}`)
        await fetchSession()
      } else if (status === "error") {
        toast.error(`GitHub 登录失败: ${name || "未知错误"}`)
      }
    }
    bc.addEventListener("message", onMessage)
    return () => { bc.close() }
  }, [fetchSession])

  // Also listen via postMessage (fallback)
  useEffect(() => {
    const onPostMessage = async (event: MessageEvent) => {
      if (event.data?.type !== "yuamli-auth") return
      const { status, name } = event.data.data || event.data
      if (status === "success") {
        toast.success(`GitHub 登录成功${name ? `，欢迎 ${name}！` : "！"}`)
        await fetchSession()
      } else if (status === "error") {
        toast.error(`GitHub 登录失败: ${name || "未知错误"}`)
      }
    }
    window.addEventListener("message", onPostMessage)
    return () => { window.removeEventListener("message", onPostMessage) }
  }, [fetchSession])

  // Memoize pageId to avoid unnecessary re-renders of children
  const stablePageId = useMemo(() => pageId, [pageId])

  return (
    <div className="min-h-0 flex flex-col bg-gradient-to-b from-stone-50 to-white">
      {/* No navbar — clean embed mode */}
      <main className="flex-1 w-full px-4 py-4">
        {/* Title — only show in standalone guestbook mode (no pageId) */}
        {!pageId && (
          <div className="flex items-center gap-2.5 mb-6 max-w-2xl mx-auto">
            <MessageCircleHeart className="h-5 w-5 text-emerald-600" />
            <h1 className="text-base font-semibold tracking-tight">留言板</h1>
          </div>
        )}
        <div className={pageId ? "" : "max-w-2xl mx-auto"}>
          <section className="mb-6">
            <CommentForm onSubmitted={() => {}} pageId={stablePageId} />
          </section>
          <section>
            <CommentList pageId={stablePageId} />
          </section>
        </div>
      </main>
      {/* Footer — only in standalone mode */}
      {!pageId && (
        <footer className="border-t bg-white/60 backdrop-blur-sm">
          <div className="max-w-2xl mx-auto px-4 py-3 text-center">
            <p className="text-xs text-muted-foreground">Powered by <span className="font-medium text-foreground">Yuamli</span> v1.0.4</p>
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