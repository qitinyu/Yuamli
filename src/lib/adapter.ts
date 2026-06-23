/**
 * Storage Adapter
 *
 * Automatically switches between:
 * - Local filesystem (JSON files in data/) — for local development
 * - Vercel KV (Redis) — for Vercel deployment
 *
 * Detection: if KV_REST_API_URL env var exists → use KV, else → use fs
 */

const USE_KV = !!process.env.KV_REST_API_URL;

const DEFAULT_CONFIG = {
  adminPassword: "g10hvh",
  adminEmail: "",
  notifyEnabled: false,
  notifyTemplate:
    "您收到一条新留言：\n\n{author}：{content}\n\n时间：{time}",
  siteName: "Yuamli",
};

// Lazy-loaded KV client
let _kv: any = null;
async function getKV() {
  if (!_kv) {
    const mod = await import("@vercel/kv");
    _kv = mod.kv;
  }
  return _kv;
}

export async function readData<T>(key: string, fallback: T): Promise<T> {
  if (USE_KV) {
    try {
      const kv = await getKV();
      const data = await kv.get<T>(key);
      return data ?? fallback;
    } catch {
      return fallback;
    }
  }
  // Filesystem fallback
  const fs = await import("fs");
  const path = await import("path");
  const filePath = path.join(process.cwd(), "data", `${key}.json`);
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function writeData<T>(key: string, data: T): Promise<void> {
  if (USE_KV) {
    const kv = await getKV();
    await kv.set(key, data);
    return;
  }
  // Filesystem fallback
  const fs = await import("fs");
  const path = await import("path");
  const dir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${key}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export { DEFAULT_CONFIG };