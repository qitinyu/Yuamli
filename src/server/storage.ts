/* ============================================================
   Yuamli JSON 文件存储层
   ============================================================ */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { Comment, User, Session, AdminConfig, DEFAULT_ADMIN_CONFIG } from '../types/index.js';

const DEFAULT_CONFIG = {
  emailEnabled: false,
  adminEmail: '',
  smtp: null,
  emailSubject: '【Yuamli】您的博客有新的评论待回复',
  emailBody: `您好，站长！\n\n您的博客有新的评论待回复。\n\n评论摘要：\n- 评论者：{authorName}\n- 评论时间：{createdAt}\n- 评论内容：{contentSnippet}\n\n请及时登录管理面板查看并回复。\n\n—— Yuamli 评论系统`,
};

export class JsonStore {
  private dataDir: string;

  constructor(dataDir: string) {
    this.dataDir = dataDir;
    if (!existsSync(this.dataDir)) {
      mkdirSync(this.dataDir, { recursive: true });
    }
    this.ensureFiles();
  }

  private filePath(name: string): string {
    return join(this.dataDir, `${name}.json`);
  }

  private ensureFiles(): void {
    const files = ['comments', 'users', 'sessions', 'admin-config'];
    for (const f of files) {
      const p = this.filePath(f);
      if (!existsSync(p)) {
        writeFileSync(p, f === 'admin-config' ? JSON.stringify(DEFAULT_CONFIG, null, 2) : '[]', 'utf-8');
      }
    }
  }

  private read<T>(name: string): T[] {
    const raw = readFileSync(this.filePath(name), 'utf-8');
    return JSON.parse(raw) as T[];
  }

  private write<T>(name: string, data: T[]): void {
    writeFileSync(this.filePath(name), JSON.stringify(data, null, 2), 'utf-8');
  }

  /* -------- Comments -------- */

  getComments(): Comment[] {
    return this.read<Comment>('comments');
  }

  getCommentsByPageId(pageId: string): Comment[] {
    return this.getComments().filter((c) => c.pageId === pageId);
  }

  getCommentById(id: string): Comment | undefined {
    return this.getComments().find((c) => c.id === id);
  }

  addComment(comment: Comment): void {
    const all = this.getComments();
    all.push(comment);
    this.write('comments', all);
  }

  updateComment(id: string, updates: Partial<Comment>): boolean {
    const all = this.getComments();
    const idx = all.findIndex((c) => c.id === id);
    if (idx === -1) return false;
    all[idx] = { ...all[idx], ...updates, updatedAt: new Date().toISOString() };
    this.write('comments', all);
    return true;
  }

  deleteComment(id: string): boolean {
    const all = this.getComments();
    const filtered = all.filter((c) => c.id !== id);
    if (filtered.length === all.length) return false;
    this.write('comments', filtered);
    return true;
  }

  /* -------- Users -------- */

  getUsers(): User[] {
    return this.read<User>('users');
  }

  getUserById(id: string): User | undefined {
    return this.getUsers().find((u) => u.id === id);
  }

  getUserByAccount(account: string): User | undefined {
    return this.getUsers().find((u) => u.account === account && u.source === 'guest');
  }

  getUserByGithubId(githubId: number): User | undefined {
    return this.getUsers().find((u) => u.githubId === githubId && u.source === 'github');
  }

  addUser(user: User): void {
    const all = this.getUsers();
    all.push(user);
    this.write('users', all);
  }

  updateUser(id: string, updates: Partial<User>): boolean {
    const all = this.getUsers();
    const idx = all.findIndex((u) => u.id === id);
    if (idx === -1) return false;
    all[idx] = { ...all[idx], ...updates };
    this.write('users', all);
    return true;
  }

  /* -------- Sessions -------- */

  getSessions(): Session[] {
    return this.read<Session>('sessions');
  }

  getSessionByToken(token: string): Session | undefined {
    return this.getSessions().find((s) => s.token === token);
  }

  addSession(session: Session): void {
    const all = this.getSessions();
    all.push(session);
    this.write('sessions', all);
  }

  removeSession(token: string): void {
    const all = this.getSessions().filter((s) => s.token !== token);
    this.write('sessions', all);
  }

  /* -------- Admin Config -------- */

  getAdminConfig(): AdminConfig {
    const raw = readFileSync(this.filePath('admin-config'), 'utf-8');
    return JSON.parse(raw) as AdminConfig;
  }

  updateAdminConfig(updates: Partial<AdminConfig>): AdminConfig {
    const current = this.getAdminConfig();
    const updated = { ...current, ...updates };
    writeFileSync(this.filePath('admin-config'), JSON.stringify(updated, null, 2), 'utf-8');
    return updated;
  }
}