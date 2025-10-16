const nodemailer = require('nodemailer');

const FROM_NAME = process.env.NODEMAILER_USER || 'MM Fashion';
const FROM_EMAIL = process.env.NODEMAILER_EMAIL;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.NODEMAILER_EMAIL,
    pass: process.env.NODEMAILER_PASS
  }
});

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