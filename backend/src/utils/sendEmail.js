import nodemailer from 'nodemailer';
import env from '../config/env.js';
import logger from './logger.js';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!env.SMTP_HOST) return null;
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });
  return transporter;
}

const escapeHtml = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function layout(title, bodyHtml) {
  return `<!doctype html>
<html><body style="font-family:Arial,Helvetica,sans-serif;background:#f5f7f6;padding:24px;">
  <div style="max-width:560px;margin:auto;background:#fff;border-radius:12px;padding:32px;border-top:6px solid #0f766e;">
    <h2 style="color:#0f766e;margin-top:0;">${escapeHtml(title)}</h2>
    ${bodyHtml}
    <p style="color:#888;font-size:12px;margin-top:32px;">${escapeHtml(env.APP_NAME)}</p>
  </div>
</body></html>`;
}

function button(url, label) {
  return `<p><a href="${escapeHtml(url)}" style="display:inline-block;background:#0f766e;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;">${escapeHtml(label)}</a></p>
<p style="font-size:12px;color:#666;">If the button does not work, copy this link:<br>${escapeHtml(url)}</p>`;
}

export const emailTemplates = {
  verifyEmail: ({ name, url }) => ({
    subject: `Verify your email - ${env.APP_NAME}`,
    html: layout(
      'Verify your email',
      `<p>Assalamu alaikum ${escapeHtml(name)},</p><p>Please confirm your email address to activate all features of your account.</p>${button(url, 'Verify email')}<p>This link expires in 24 hours.</p>`,
    ),
    text: `Assalamu alaikum ${name}, verify your email: ${url} (expires in 24 hours)`,
  }),
  resetPassword: ({ name, url }) => ({
    subject: `Reset your password - ${env.APP_NAME}`,
    html: layout(
      'Password reset',
      `<p>Assalamu alaikum ${escapeHtml(name)},</p><p>We received a request to reset your password.</p>${button(url, 'Reset password')}<p>This link expires in 1 hour. If you did not request it, ignore this email.</p>`,
    ),
    text: `Reset your password: ${url} (expires in 1 hour)`,
  }),
  generic: ({ title, message }) => ({
    subject: `${title} - ${env.APP_NAME}`,
    html: layout(title, `<p>${escapeHtml(message)}</p>`),
    text: message,
  }),
};

/**
 * Sends an email. When SMTP is not configured (or in tests) the email is logged instead.
 */
export async function sendEmail({ to, subject, html, text }) {
  const tx = getTransporter();
  if (!tx || env.isTest) {
    logger.info(`[email:dev] to=${to} subject="${subject}" text="${text || ''}"`);
    return { mocked: true };
  }
  try {
    const info = await tx.sendMail({ from: env.EMAIL_FROM, to, subject, html, text });
    logger.info(`Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (err) {
    logger.error(`Email to ${to} failed: ${err.message}`);
    throw err;
  }
}

export async function sendTemplateEmail(to, templateName, data) {
  const template = emailTemplates[templateName];
  if (!template) throw new Error(`Unknown email template: ${templateName}`);
  return sendEmail({ to, ...template(data) });
}

export default sendEmail;
