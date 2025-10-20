const nodemailer = require('nodemailer');

const FROM_NAME = process.env.NODEMAILER_USER || 'MM Fashion World';
const FROM_EMAIL = process.env.NODEMAILER_EMAIL;

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.NODEMAILER_EMAIL,
    pass: process.env.NODEMAILER_PASS
  },
  pool: true, // Reuse connections for production
  maxConnections: 5,
  maxMessages: 100
});
transporter.verify().then(() => console.log('SMTP OK')).catch(console.error);

async function sendMail({ to, subject, html, text }) {
  const mail = {
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to,
    subject,
    html,
    text
  };
  return transporter.sendMail(mail);
}

module.exports = { transporter, sendMail };