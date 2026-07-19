import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { readData, writeData } from "@/lib/adapter";
import fs from "fs";
import path from "path";

const CHANGELOG_KEY = "changelog";

const DEFAULT_CHANGELOG: Array<{ version: string; content: string }> = [
  { version: "v1.0.7", content: "更新日志独立文件编辑、主题色热切换、logo 修复、预设修复、按钮对齐优化" },
  { version: "v1.0.6", content: "后台评论新增单条「回复」按钮，可直接在后台回复零散留言" },
  { version: "v1.0.5", content: "独立 Footer 编辑、统一回复留言、评论区预设文本、Markdown 渲染优化、热刷新按钮、密码错误提示" },
  { version: "v1.0.4", content: "后台管理界面优化、邮件通知模板、数据导入导出" },
  { version: "v1.0.3", content: "GitHub OAuth 登录、访客注册、留言置顶/精华、批量管理" },
  { version: "v1.0.2", content: "嵌套评论回复、评论树结构、用户头像显示" },
  { version: "v1.0.1", content: "基础留言板功能、Vercel KV / 本地存储双模式" },
  { version: "v1.0.0", content: "项目初始化、Next.js + Tailwind CSS + shadcn/ui 搭建" },
];

async function readChangelog(): Promise<Array<{ version: string; content: string }>> {
  const data = await readData<Array<{ version: string; content: string }>>(
    CHANGELOG_KEY,
    []
  );
  if (Array.isArray(data) && data.length > 0) return data;

  const publicFile = path.join(process.cwd(), "public", "changelog.json");
  try {
    if (fs.existsSync(publicFile)) {
      const raw = fs.readFileSync(publicFile, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        await writeData(CHANGELOG_KEY, parsed);
        return parsed;
      }
    }
  } catch {
    // ignore
  }

  return DEFAULT_CHANGELOG;
}

export async function GET() {
  try {
    const admin = await isAdminAuthenticated();
    if (!admin) {
      return NextResponse.json(
        { ok: false, message: "Admin authentication required" },
        { status: 403 }
      );
    }

    const changelog = await readChangelog();
    return NextResponse.json({ changelog });
  } catch (err: any) {
    console.error("[changelog] get error:", err);
    return NextResponse.json(
      { ok: false, message: err?.message || "获取更新日志失败" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await isAdminAuthenticated();
    if (!admin) {
      return NextResponse.json(
        { ok: false, message: "Admin authentication required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { changelog } = body;

    if (!Array.isArray(changelog)) {
      return NextResponse.json(
        { ok: false, message: "格式错误" },
        { status: 400 }
      );
    }

    await writeData(CHANGELOG_KEY, changelog);
    return NextResponse.json({ ok: true, message: "更新日志已保存" });
  } catch (err: any) {
    console.error("[changelog] save error:", err);
    return NextResponse.json(
      { ok: false, message: err?.message || "保存失败" },
      { status: 500 }
    );
  }
}
