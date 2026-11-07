'use strict';
/* E-mail delivery. With SMTP_* set (a Gmail app password works) mail is really sent.
 * Providers: BREVO_API_KEY or RESEND_API_KEY (HTTPS, work on Render's free plan) or SMTP_*. Without any, development and tests keep messages in
 * `outbox`; production lets people create accounts straight away (EMAIL_CONFIRMATION=auto) and says so, instead of pretending a mail was sent. */
const nodemailer = require('nodemailer');
const cfg = require('./config');

const outbox = [];
let transport = null;
const smtpConfigured = () => !!(cfg.SMTP_HOST && cfg.SMTP_USER && cfg.SMTP_PASS);
const configured = () => !!(cfg.BREVO_API_KEY || cfg.RESEND_API_KEY || smtpConfigured());
// Free Render instances block SMTP ports, so the HTTPS providers below are the ones that work there.
const addr = from => { const m = String(from).match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/); return m ? { name: m[1].trim() || 'EduLearn', email: m[2].trim() } : { name: 'EduLearn', email: String(from).trim() }; };
async function viaHttp(url, headers, body, label) {
  const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json', ...headers }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
  if (!r.ok) { const t = await r.text().catch(() => ''); throw new Error(`${label} ${r.status}: ${t.slice(0, 200)}`); }
}
function getTransport() {
  if (!transport) transport = nodemailer.createTransport({ host: cfg.SMTP_HOST, port: cfg.SMTP_PORT, secure: cfg.SMTP_PORT === 465, auth: { user: cfg.SMTP_USER, pass: cfg.SMTP_PASS } });
  return transport;
}
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function layout(title, bodyHtml, button) {
  return `<div style="font-family:Arial,Helvetica,sans-serif;background:#eef1f8;padding:24px"><div style="max-width:520px;margin:auto;background:#fff;border-radius:14px;overflow:hidden">
  <div style="background:#1b2f66;color:#fff;padding:18px 24px;font-size:20px;font-weight:bold">EduLearn</div>
  <div style="padding:24px;color:#1a2238;line-height:1.55"><h2 style="margin:0 0 12px">${esc(title)}</h2>${bodyHtml}
  ${button ? `<p style="margin:24px 0"><a href="${esc(button.url)}" style="background:#f5a800;color:#111;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:8px;display:inline-block">${esc(button.label)}</a></p>
  <p style="font-size:12px;color:#5a6580">If the button does not work, copy this address into your browser:<br>${esc(button.url)}</p>` : ''}
  <p style="font-size:12px;color:#5a6580;margin-top:24px">If you did not expect this message you can ignore it.</p></div></div></div>`;
}

async function send({ to, subject, text, html, meta }) {
  if (!configured()) {
    if (cfg.IS_PROD) { const e = new Error('Email delivery is not configured'); e.code = 'mail_not_configured'; throw e; }
    outbox.push({ to, subject, text, meta, at: Date.now() }); if (outbox.length > 50) outbox.shift();
    console.log(`[mail:dev] to=${to} subject="${subject}"\n${text}`);
    return { dev: true };
  }
  if (cfg.BREVO_API_KEY) await viaHttp('https://api.brevo.com/v3/smtp/email', { 'api-key': cfg.BREVO_API_KEY }, { sender: addr(cfg.MAIL_FROM), to: [{ email: to }], subject, htmlContent: html, textContent: text }, 'Brevo');
  else if (cfg.RESEND_API_KEY) await viaHttp('https://api.resend.com/emails', { authorization: 'Bearer ' + cfg.RESEND_API_KEY }, { from: cfg.MAIL_FROM, to: [to], subject, html, text }, 'Resend');
  else await getTransport().sendMail({ from: cfg.MAIL_FROM, to, subject, text, html });
  return { dev: false };
}

function verificationMail(user, url) {
  return { to: user.email, subject: 'Confirm your EduLearn email', meta: { url },
    text: `Hello ${user.name},\n\nConfirm your email to activate your EduLearn account:\n${url}\n\nThe link works for 24 hours.`,
    html: layout('Confirm your email', `<p>Hello ${esc(user.name)}, welcome to EduLearn. Confirm that this email address is yours to activate your account.</p>`, { label: 'Confirm my email', url }) };
}
// Whether a new account must click an emailed link before signing in.
const confirmationRequired = () => cfg.EMAIL_CONFIRMATION === 'on' || (cfg.EMAIL_CONFIRMATION !== 'off' && (configured() || !cfg.IS_PROD));
module.exports = { send, verificationMail, configured, confirmationRequired, outbox };
