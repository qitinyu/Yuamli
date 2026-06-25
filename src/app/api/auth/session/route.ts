import { NextResponse } from "next/server";
import { getSession, clearSessionResponse } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getSession();
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ user: null });
  }
}

export async function POST() {
  try {
    return clearSessionResponse({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Failed to destroy session" },
      { status: 500 }
    );
  }
}