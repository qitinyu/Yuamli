'use client'

import { Suspense, useEffect, useCallback, useMemo } from "react"
import { useCommentStore } from "@/store/use-comment-store"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"
import CommentList from "@/components/comment-system/CommentList"
import CommentForm from "@/components/comment-system/CommentForm"
import AuthModal from "@/components/comment-system/AuthModal"
import { Loader2 } from "lucide-react"

function CommentPage() {
  const { setUser } = useCommentStore()
  const searchParams = useSearchParams()
  const pageId = searchParams.get("pageId") || ""

  const fetchSession = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/session", { credentials: "same-origin" })
      const data = await res.json()
      if (data.user) { setUser(data.user); return true }
      return false
    } catch { return false }
  }, [setUser])

  useEffect(() => { fetchSession() }, [fetchSession])

  // Listen for BroadcastChannel (popup OAuth result)
  useEffect(() => {
    const bc = new BroadcastChannel("yuamli-auth")
    bc.addEventListener("message", async (e) => {
      const { status, name } = e.data
      if (status === "success") {
        toast.success(`GitHub 登录成功${name ? `，欢迎 ${name}！` : "！"}`)
        await fetchSession()
      } else if (status === "error") {
        toast.error(`GitHub 登录失败: ${name || "未知错误"}`)
      }
    })
    return () => bc.close()
  }, [fetchSession])

  // Fallback: postMessage listener
  useEffect(() => {
    const handler = async (e: MessageEvent) => {
      if (e.data?.type !== "yuamli-auth") return
      const { status, name } = e.data.data || e.data
      if (status === "success") {
        toast.success(`GitHub 登录成功${name ? `，欢迎 ${name}！` : "！"}`)
        await fetchSession()
      } else if (status === "error") {
        toast.error(`GitHub 登录失败: ${name || "未知错误"}`)
      }
    }
    window.addEventListener("message", handler)
    return () => window.removeEventListener("message", handler)
  }, [fetchSession])

  const stablePageId = useMemo(() => pageId, [pageId])

  return (
    <div className="min-h-0 flex flex-col bg-gradient-to-b from-stone-50 to-white">
      <main className="flex-1 w-full px-4 py-4">
        <div className={pageId ? "" : "max-w-2xl mx-auto"}>
          <section className="mb-6">
            <CommentForm onSubmitted={() => {}} pageId={stablePageId} />
          </section>
          <section>
            <CommentList pageId={stablePageId} />
          </section>
        </div>
      </main>
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