/* ============================================================
   Yuamli 邮件通知服务
   ============================================================ */
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { AdminConfig, Comment } from '../types/index.js';

export class EmailService {
  private transporter: Transporter | null = null;

  /** 根据 AdminConfig 创建/重建邮件传输器 */
  private buildTransporter(smtp: AdminConfig['smtp']): Transporter | null {
    if (!smtp) return null;
    try {
      return nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        auth: {
          user: smtp.user,
          pass: smtp.pass,
        },
      });
    } catch (e) {
      console.error('[Yuamli Email] 创建邮件传输器失败:', e);
      return null;
    }
  }

  /** 发送新评论通知邮件 */
  async sendNewCommentNotification(
    config: AdminConfig,
    comment: Comment
  ): Promise<{ success: boolean; error?: string }> {
    if (!config.emailEnabled || !config.adminEmail) {
      return { success: false, error: '邮件通知未启用或未配置站长邮箱' };
    }
    if (!config.smtp) {
      return { success: false, error: '未配置 SMTP 服务' };
    }

    const transport = this.buildTransporter(config.smtp);
    if (!transport) {
      return { success: false, error: '无法创建邮件传输器' };
    }

    // 替换模板变量
    const snippet = comment.content.length > 100
      ? comment.content.substring(0, 100) + '...'
      : comment.content;

    const subject = config.emailSubject;
    const body = config.emailBody
      .replace('{authorName}', comment.authorName)
      .replace('{createdAt}', new Date(comment.createdAt).toLocaleString('zh-CN'))
      .replace('{contentSnippet}', snippet);

    try {
      await transport.sendMail({
        from: `"Yuamli" <${config.smtp.user}>`,
        to: config.adminEmail,
        subject,
        text: body,
      });
      return { success: true };
    } catch (e: any) {
      console.error('[Yuamli Email] 发送邮件失败:', e.message);
      return { success: false, error: e.message };
    }
  }

  /** 测试邮件发送 */
  async testEmail(config: AdminConfig): Promise<{ success: boolean; error?: string }> {
    if (!config.smtp || !config.adminEmail) {
      return { success: false, error: '请先配置 SMTP 和站长邮箱' };
    }
    const transport = this.buildTransporter(config.smtp);
    if (!transport) {
      return { success: false, error: '无法创建邮件传输器' };
    }
    try {
      await transport.sendMail({
        from: `"Yuamli" <${config.smtp.user}>`,
        to: config.adminEmail,
        subject: '【Yuamli】邮件通知测试',
        text: '这是一封来自 Yuamli 评论系统的测试邮件。如果您收到此邮件，说明邮件通知配置正确。\n\n—— Yuamli 评论系统',
      });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
}