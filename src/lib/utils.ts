import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 把用户输入的网址规范化为可点击的链接。
 * - 空值 / 非 http(s) 协议 → null（避免 javascript: 等危险协议）
 * - 缺少协议时自动补 https://
 */
export function normalizeUrl(input: string | undefined | null): string | null {
  const raw = (input || "").trim()
  if (!raw) return null

  const withProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(raw) ? raw : `https://${raw}`

  try {
    const url = new URL(withProtocol)
    if (url.protocol !== "http:" && url.protocol !== "https:") return null
    if (!url.hostname.includes(".") && url.hostname !== "localhost") return null
    return url.toString()
  } catch {
    return null
  }
}

/** 只展示域名部分，用于链接文字 */
export function displayHost(input: string | undefined | null): string {
  const normalized = normalizeUrl(input)
  if (!normalized) return ""
  try {
    return new URL(normalized).hostname.replace(/^www\./, "")
  } catch {
    return ""
  }
}
