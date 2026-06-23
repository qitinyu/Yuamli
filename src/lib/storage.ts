import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

export interface CommentAuthor {
  id: string;
  name: string;
  avatar: string;
  type: "github" | "guest";
}

export interface Comment {
  id: string;
  content: string;
  author: CommentAuthor;
  parentId: string | null;
  replyTo: { id: string; name: string } | null;
  isPinned: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
  replies?: Comment[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  type: "github" | "guest";
  password?: string;
  qq?: string;
  createdAt: string;
}

export interface SiteConfig {
  adminPassword: string;
  adminEmail: string;
  notifyEnabled: boolean;
  notifyTemplate: string;
  siteName: string;
}

function readJSON<T>(filename: string): T {
  const filePath = path.join(DATA_DIR, filename);
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

function writeJSON<T>(filename: string, data: T): void {
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

// ==================== Comments ====================

export function getComments(): Comment[] { return readJSON<Comment[]>("comments.json"); }
export function getCommentById(id: string): Comment | undefined { return getComments().find((c) => c.id === id); }

export function addComment(comment: Comment): Comment {
  const comments = getComments();
  comments.unshift(comment);
  writeJSON("comments.json", comments);
  return comment;
}

export function updateComment(id: string, updates: Partial<Omit<Comment, "id" | "author" | "createdAt">>): Comment | null {
  const comments = getComments();
  const index = comments.findIndex((c) => c.id === id);
  if (index === -1) return null;
  comments[index] = { ...comments[index], ...updates, updatedAt: new Date().toISOString() };
  writeJSON("comments.json", comments);
  return comments[index];
}

export function deleteComment(id: string): boolean {
  const comments = getComments();
  const idsToRemove = new Set<string>();
  const collectIds = (parentId: string) => {
    idsToRemove.add(parentId);
    comments.filter((c) => c.parentId === parentId).forEach((c) => collectIds(c.id));
  };
  collectIds(id);
  const filtered = comments.filter((c) => !idsToRemove.has(c.id));
  if (filtered.length === comments.length) return false;
  writeJSON("comments.json", filtered);
  return true;
}

// Batch operations
export function batchDeleteComments(ids: string[]): number {
  const comments = getComments();
  const idSet = new Set(ids);
  // Also collect all child IDs recursively
  const allIdsToRemove = new Set<string>();
  const collectChildren = (parentId: string) => {
    allIdsToRemove.add(parentId);
    comments.filter((c) => c.parentId === parentId).forEach((c) => collectChildren(c.id));
  };
  ids.forEach((id) => collectChildren(id));
  const filtered = comments.filter((c) => !allIdsToRemove.has(c.id));
  const removed = comments.length - filtered.length;
  if (removed > 0) writeJSON("comments.json", filtered);
  return removed;
}

export function batchUpdateComments(ids: string[], updates: Partial<Omit<Comment, "id" | "author" | "createdAt">>): number {
  const comments = getComments();
  const idSet = new Set(ids);
  let count = 0;
  const now = new Date().toISOString();
  for (let i = 0; i < comments.length; i++) {
    if (idSet.has(comments[i].id)) {
      comments[i] = { ...comments[i], ...updates, updatedAt: now };
      count++;
    }
  }
  if (count > 0) writeJSON("comments.json", comments);
  return count;
}

// Recursive tree builder for unlimited nesting
export function buildCommentTree(comments: Comment[], parentId: string | null): Comment[] {
  return comments
    .filter((c) => c.parentId === parentId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((c) => ({
      ...c,
      replies: buildCommentTree(comments, c.id),
    }));
}

// ==================== Users ====================

export function getUsers(): User[] { return readJSON<User[]>("users.json"); }
export function getUserById(id: string): User | undefined { return getUsers().find((u) => u.id === id); }
export function getUserByEmail(email: string): User | undefined { return getUsers().find((u) => u.email === email); }
export function getUserByQQ(qq: string): User | undefined { return getUsers().find((u) => u.qq === qq); }
export function getUserByGithubId(id: string): User | undefined { return getUsers().find((u) => u.type === "github" && u.id === id); }

export function addUser(user: User): User {
  const users = getUsers();
  users.push(user);
  writeJSON("users.json", users);
  return user;
}

// ==================== Config ====================

export function getConfig(): SiteConfig {
  const config = readJSON<SiteConfig>("config.json");
  // Ensure notifyTemplate exists (backward compatibility)
  if (!config.notifyTemplate) {
    config.notifyTemplate = "您收到一条新留言：\n\n{author}：{content}\n\n时间：{time}";
  }
  return config;
}

export function updateConfig(updates: Partial<SiteConfig>): SiteConfig {
  const config = getConfig();
  const newConfig = { ...config, ...updates };
  writeJSON("config.json", newConfig);
  return newConfig;
}