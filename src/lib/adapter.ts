/**
 * Storage Adapter - Vercel KV + Local FS Fallback
 */

const USE_KV = !!process.env.KV_REST_API_URL;
const KV_URL = process.env.KV_REST_API_URL || "";
const KV_TOKEN = process.env.KV_REST_API_TOKEN || "";

const DEFAULT_CONFIG = {
  adminPassword: "g10hvh",
  adminEmail: "",
  notifyEnabled: false,
  notifyTemplate: "您收到一条新留言：\n\n{author}：{content}\n\n时间：{time}",
  siteName: "Yuamli",
};

// ==================== Vercel KV ====================
async function kvCommand(...args: string[]): Promise<any> {
  const res = await fetch(`${KV_URL}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([args]),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`KV command failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data?.[0]?.result;
}

async function kvGet<T>(key: string, fallback: T): Promise<T> {
  const raw: string | null = await kvCommand("GET", `yuamli:${key}`);
  if (raw === null || raw === undefined) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function kvSet<T>(key: string, data: T): Promise<void> {
  const value = JSON.stringify(data);
  await kvCommand("SET", `yuamli:${key}`, value);
}

// ==================== Local FS ====================
async function fsRead<T>(key: string, fallback: T): Promise<T> {
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

async function fsWrite<T>(key: string, data: T): Promise<void> {
  const fs = await import("fs");
  const path = await import("path");
  const dir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${key}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

// ==================== Public API ====================
export async function readData<T>(key: string, fallback: T): Promise<T> {
  if (USE_KV) {
    try {
      return await kvGet(key, fallback);
    } catch (err) {
      console.error(`[adapter] KV read failed for key "${key}":`, err);
      return fallback;
    }
  }
  return fsRead(key, fallback);
}

export async function writeData<T>(key: string, data: T): Promise<void> {
  if (USE_KV) {
    try {
      await kvSet(key, data);
      return;
    } catch (err) {
      console.error(`[adapter] KV write failed for key "${key}":`, err);
      throw new Error("Vercel KV 写入失败，请检查环境变量是否正确配置。");
    }
  }
  return fsWrite(key, data);
}

export { DEFAULT_CONFIG };