// utils/mailer.js
const nodemailer = require('nodemailer');

const FROM_EMAIL = process.env.NODEMAILER_EMAIL;
const FROM_NAME  = process.env.NODEMAILER_USER || 'MM Fashion World';

if (!FROM_EMAIL || !process.env.NODEMAILER_PASS) {
  console.error('Missing NODEMAILER_EMAIL or NODEMAILER_PASS in env');
}

const isProd = process.env.NODE_ENV === 'production';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,           // TLS
  secure: true,        // true for 465, false for 587
  auth: {
    user: FROM_EMAIL,               // your Gmail address
    pass: process.env.NODEMAILER_PASS // Gmail App Password
  },
  pool: isProd,        // reuse connections only in production
  maxConnections: 5,
  maxMessages: 100,
  tls: { minVersion: 'TLSv1.2' }
});

transporter.verify()
  .then(() => console.log('✅ SMTP ready'))
  .catch(err => console.error('❌ SMTP verify failed:', err?.message || err));

const stripHtml = (s = '') => s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

async function sendMail({ to, subject, html, text, replyTo, cc, bcc }) {
  const mail = {
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to,
    subject,
    html,
    text: text || stripHtml(html).slice(0, 2000),
    replyTo, // important: lets you reply to the user directly
    cc,
    bcc
  };
  const info = await transporter.sendMail(mail);
  console.log('📩 Mail sent:', info.messageId, info.response);
  return info;
}

module.exports = { transporter, sendMail };