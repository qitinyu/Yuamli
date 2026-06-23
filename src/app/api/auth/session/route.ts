import { NextResponse } from "next/server";
import { getSession, destroySession } from "@/lib/auth";

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
    await destroySession();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Failed to destroy session" },
      { status: 500 }
    );
  }
}