import type { Metadata } from "next";
import { SITE_ICON } from "@/lib/site";

/** 后台单独声明一次图标，避免浏览器缓存前台页签图标 */
export const metadata: Metadata = {
  title: "后台管理 · Yuamli",
  icons: {
    icon: [{ url: SITE_ICON, type: "image/webp" }],
    shortcut: [{ url: SITE_ICON, type: "image/webp" }],
    apple: [{ url: SITE_ICON }],
  },
};

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
