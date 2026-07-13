import { readData, writeData, DEFAULT_CONFIG } from "./adapter";

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
  pageId: string;
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
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  footerHtml?: string;
  replyPresets?: string[];
}

// ==================== Comments ====================

export async function getComments(): Promise<Comment[]> {
  return readData<Comment[]>("comments", []);
}

export async function getCommentById(id: string): Promise<Comment | undefined> {
  const comments = await getComments();
  return comments.find((c) => c.id === id);
}

export async function addComment(comment: Comment): Promise<Comment> {
  const comments = await getComments();
  comments.unshift(comment);
  await writeData("comments", comments);
  return comment;
}

export async function updateComment(
  id: string,
  updates: Partial<Omit<Comment, "id" | "author" | "createdAt">>
): Promise<Comment | null> {
  const comments = await getComments();
  const index = comments.findIndex((c) => c.id === id);
  if (index === -1) return null;
  comments[index] = {
    ...comments[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  await writeData("comments", comments);
  return comments[index];
}

export async function deleteComment(id: string): Promise<boolean> {
  const comments = await getComments();
  const idsToRemove = new Set<string>();
  const collectIds = (parentId: string) => {
    idsToRemove.add(parentId);
    comments
      .filter((c) => c.parentId === parentId)
      .forEach((c) => collectIds(c.id));
  };
  collectIds(id);
  const filtered = comments.filter((c) => !idsToRemove.has(c.id));
  if (filtered.length === comments.length) return false;
  await writeData("comments", filtered);
  return true;
}

export async function batchDeleteComments(ids: string[]): Promise<number> {
  const comments = await getComments();
  const allIdsToRemove = new Set<string>();
  const collectChildren = (parentId: string) => {
    allIdsToRemove.add(parentId);
    comments
      .filter((c) => c.parentId === parentId)
      .forEach((c) => collectChildren(c.id));
  };
  ids.forEach((id) => collectChildren(id));
  const filtered = comments.filter((c) => !allIdsToRemove.has(c.id));
  const removed = comments.length - filtered.length;
  if (removed > 0) await writeData("comments", filtered);
  return removed;
}

export async function batchUpdateComments(
  ids: string[],
  updates: Partial<Omit<Comment, "id" | "author" | "createdAt">>
): Promise<number> {
  const comments = await getComments();
  const idSet = new Set(ids);
  let count = 0;
  const now = new Date().toISOString();
  for (let i = 0; i < comments.length; i++) {
    if (idSet.has(comments[i].id)) {
      comments[i] = { ...comments[i], ...updates, updatedAt: now };
      count++;
    }
  }
  if (count > 0) await writeData("comments", comments);
  return count;
}

export function buildCommentTree(
  comments: Comment[],
  parentId: string | null
): Comment[] {
  return comments
    .filter((c) => c.parentId === parentId)
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
    .map((c) => ({
      ...c,
      replies: buildCommentTree(comments, c.id),
    }));
}

// ==================== Users ====================

export async function getUsers(): Promise<User[]> {
  return readData<User[]>("users", []);
}

export async function getUserById(id: string): Promise<User | undefined> {
  const users = await getUsers();
  return users.find((u) => u.id === id);
}

export async function getUserByEmail(
  email: string
): Promise<User | undefined> {
  const users = await getUsers();
  return users.find((u) => u.email === email);
}

export async function getUserByQQ(qq: string): Promise<User | undefined> {
  const users = await getUsers();
  return users.find((u) => u.qq === qq);
}

export async function getUserByGithubId(
  id: string
): Promise<User | undefined> {
  const users = await getUsers();
  return users.find((u) => u.type === "github" && u.id === id);
}

export async function addUser(user: User): Promise<User> {
  const users = await getUsers();
  users.push(user);
  await writeData("users", users);
  return user;
}

export async function updateUser(
  id: string,
  updates: Partial<Omit<User, "id" | "createdAt">>
): Promise<User | null> {
  const users = await getUsers();
  const index = users.findIndex((u) => u.id === id);
  if (index === -1) return null;
  users[index] = { ...users[index], ...updates };
  await writeData("users", users);
  return users[index];
}

// ==================== Config ====================

export async function getConfig(): Promise<SiteConfig> {
  const config = await readData<SiteConfig>("config", DEFAULT_CONFIG);
  if (!config.notifyTemplate) {
    config.notifyTemplate = DEFAULT_CONFIG.notifyTemplate;
  }
  return config;
}

export async function updateConfig(
  updates: Partial<SiteConfig>
): Promise<SiteConfig> {
  const config = await getConfig();
  const newConfig = { ...config, ...updates };
  await writeData("config", newConfig);
  return newConfig;
}

// ==================== Changelog ====================

export interface ChangelogEntry {
  id: string;
  version: string;
  date: string;
  type: "feature" | "fix" | "improvement" | "other";
  content: string;
  createdAt: string;
}

export async function getChangelog(): Promise<ChangelogEntry[]> {
  return readData<ChangelogEntry[]>("changelog", []);
}

export async function addChangelogEntry(
  entry: ChangelogEntry
): Promise<ChangelogEntry> {
  const entries = await getChangelog();
  entries.unshift(entry);
  await writeData("changelog", entries);
  return entry;
}

export async function updateChangelogEntry(
  id: string,
  updates: Partial<Omit<ChangelogEntry, "id" | "createdAt">>
): Promise<ChangelogEntry | null> {
  const entries = await getChangelog();
  const index = entries.findIndex((e) => e.id === id);
  if (index === -1) return null;
  entries[index] = { ...entries[index], ...updates };
  await writeData("changelog", entries);
  return entries[index];
}

export async function deleteChangelogEntry(id: string): Promise<boolean> {
  const entries = await getChangelog();
  const filtered = entries.filter((e) => e.id !== id);
  if (filtered.length === entries.length) return false;
  await writeData("changelog", filtered);
  return true;
}