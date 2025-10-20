// controllers/contactController.js
"use strict";

require("dotenv").config();
const ContactInquiry = require("../models/contactInquiryModel");
const { sendMail } = require("../utils/mailer");

// Brand / URLs
const BRAND_NAME = process.env.NODEMAILER_USER || "MM Fashion World";
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const ADMIN_URL = process.env.CLIENT_ADMIN_PRO_URL || CLIENT_URL;

const LOGO_URL =
  "https://res.cloudinary.com/dpd5xwjqp/image/upload/v1757668954/Misam_Marifa_Fashion_World_oo94yx.png";

// Helpers
const esc = (s = "") =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const isValidEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s).trim());
const isValidBDMobile = (s) => {
  const digits = String(s || "").replace(/\D/g, "");
  return (
    (digits.length === 11 && digits.startsWith("01")) ||
    (digits.length === 13 && digits.startsWith("8801"))
  );
};

const getRequestIP = (req) => {
  const xfwd = req.headers["x-forwarded-for"];
  if (xfwd) return xfwd.split(",")[0].trim();
  return req.ip || req.connection?.remoteAddress || "";
};

const normalizeBDMobileTo880 = (s) => {
  const d = String(s || "").replace(/\D/g, "");
  if (d.startsWith("8801")) return d;
  if (d.startsWith("01")) return `880${d.slice(1)}`;
  return d; // fallback
};

const buildAdminHtml = ({
  name,
  email,
  mobile,
  message,
  userId,
  ip,
  source,
  submittedAt,
  inquiryId,
}) => {
  const waNumber = normalizeBDMobileTo880(mobile);
  const quickReplySubject = encodeURIComponent(`Re: ${name}'s Inquiry`);
  const quickReplyBody = encodeURIComponent(
    `Hi ${name},\nThanks for reaching out. We will get back to you shortly.\n\n— ${BRAND_NAME} Support`
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>New Customer Inquiry</title>
<style>
  body { margin:0; padding:20px; font-family:Arial,sans-serif; background:#f4f4f4; }
  .container { max-width:600px; margin:0 auto; background:#fff; border-radius:10px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.1); }
  .header { background:linear-gradient(135deg,#149777,#0f6b5a); color:#fff; padding:30px 20px; text-align:center; }
  .logo { max-width:120px; height:auto; margin-bottom:10px; }
  .priority-high { background:#dc3545; color:#fff; padding:4px 8px; border-radius:12px; font-size:12px; font-weight:bold; }
  .priority-medium { background:#ffc107; color:#212529; padding:4px 8px; border-radius:12px; font-size:12px; font-weight:bold; }
  .content { padding:30px 20px; }
  .card { background:#f8f9fa; border:1px solid #dee2e6; border-radius:8px; padding:20px; margin-bottom:20px; }
  .message-box { background:#fff; padding:15px; border-left:4px solid #149777; border-radius:0 6px 6px 0; }
  .btn { display:inline-block; background:#149777; color:#fff !important; padding:10px 20px; text-decoration:none; border-radius:6px; margin:5px; font-weight:500; transition:background .3s; }
  .btn:hover { background:#0f6b5a !important; }
  .btn-primary { background:#007bff; }
  .btn-success { background:#28a745; }
  .btn-wa { background:#25D366; }
  .footer { background:#149777; color:#fff; text-align:center; padding:20px; font-size:14px; }
  @media (max-width:600px) { .container { margin:0 !important; border-radius:0 !important; } .btn { display:block; width:100%; text-align:center; margin:10px 0 !important; } }
</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${LOGO_URL}" alt="${esc(BRAND_NAME)}" class="logo" />
      <h1>🆕 New Customer Inquiry</h1>
      <span class="priority-${userId ? "high" : "medium"}">${
    userId ? "HIGH PRIORITY (Logged User)" : "Medium Priority"
  }</span>
    </div>
    <div class="content">
      <div class="card">
        <h3>👤 Customer Info</h3>
        <p><strong>Name:</strong> ${esc(name)}</p>
        <p><strong>Email:</strong> <a href="mailto:${encodeURIComponent(
          email
        )}">${esc(email)}</a></p>
        <p><strong>Mobile:</strong> <a href="tel:${encodeURIComponent(
          mobile
        )}">${esc(mobile)}</a></p>
        ${
          userId
            ? `<p><strong>User ID:</strong> <a href="${ADMIN_URL}/admin/users/${encodeURIComponent(
                String(userId)
              )}">View Profile</a></p>`
            : ""
        }
        <p><strong>IP / Source:</strong> ${esc(ip)} / ${esc(source || "contact-page")}</p>
      </div>
      <div class="card">
        <h3>💬 Message</h3>
        <div class="message-box">
          ${esc(message).replace(/\n/g, "<br/>")}
        </div>
      </div>
      <p><strong>📅 Submitted:</strong> ${esc(submittedAt)}</p>
      <div style="text-align:center;">
        <a href="${ADMIN_URL}/admin/inquiries/${encodeURIComponent(
    String(inquiryId)
  )}" class="btn">📊 Dashboard View</a>
        <a href="mailto:${encodeURIComponent(
          email
        )}?subject=${quickReplySubject}&body=${quickReplyBody}" class="btn btn-primary">📧 Quick Reply</a>
        <a href="https://wa.me/${waNumber}" class="btn btn-wa">💬 WhatsApp</a>
        <a href="tel:${encodeURIComponent(mobile)}" class="btn btn-success">📞 Call</a>
      </div>
    </div>
    <div class="footer">
      <p>${esc(BRAND_NAME)} Admin | Auto-Generated</p>
    </div>
  </div>
</body>
</html>`;
};

const buildCustomerHtml = ({ name }) => {
  const messengerLink =
    process.env.MESSENGER_LINK || `${CLIENT_URL.replace(/\/$/, "")}/track-order`;

  return `<!DOCTYPE html>
<html lang="bn">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Thank You - ${esc(BRAND_NAME)}</title>
<style>
  body { margin:0; padding:20px; font-family:Arial,sans-serif; background:#f4f4f4; }
  .container { max-width:500px; margin:0 auto; background:#fff; border-radius:10px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.1); }
  .header { background:linear-gradient(135deg,#149777,#0f6b5a); color:#fff; padding:30px 20px; text-align:center; }
  .logo { max-width:120px; height:auto; margin-bottom:10px; }
  .content { padding:30px 20px; text-align:center; }
  .btn { display:inline-block; background:#25D366; color:#fff !important; padding:12px 24px; text-decoration:none; border-radius:25px; margin:10px; font-weight:500; }
  .btn-primary { background:#007bff; }
  .social { display:flex; justify-content:center; gap:20px; margin:20px 0; }
  .social a { color:#149777; font-size:28px; text-decoration:none; }
  .footer { background:#149777; color:#fff; text-align:center; padding:20px; font-size:14px; }
  @media (max-width:500px) { .container { margin:0 !important; border-radius:0 !important; } .btn { display:block; width:100%; margin:10px 0 !important; } }
</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${LOGO_URL}" alt="${esc(BRAND_NAME)}" class="logo" />
      <h1>ধন্যবাদ ${esc(name)}!</h1>
      <p style="margin:0;opacity:.9;">আপনার যোগাযোগ গ্রহণ করা হয়েছে</p>
    </div>
    <div class="content">
      <p style="font-size:16px;line-height:1.6;color:#333;">
        আপনার বার্তা সফলভাবে আমাদের কাছে পৌঁছেছে। আমাদের টিম <strong>২৪–৪৮ ঘণ্টার মধ্যে</strong> আপনার সাথে যোগাযোগ করবে।
      </p>
      <p><strong>জরুরি সাহায্যের জন্য:</strong></p>
      <a href="https://wa.me/8801749889595?text=${encodeURIComponent(
        "Hi, I have submitted a contact form"
      )}" class="btn">💬 WhatsApp চ্যাট করুন</a>
      <a href="${messengerLink}" class="btn btn-primary">Messenger</a>
      
      <div class="social">
        <a href="https://facebook.com/MMFashionWorld" title="Facebook" target="_blank">📘</a>
        <a href="https://www.facebook.com/mmfashionworldonline" title="Instagram" target="_blank">📷</a>
      </div>
      
      <p style="font-size:14px;color:#666;">
        আরও তথ্য: <a href="${CLIENT_URL}/faq" style="color:#149777;">FAQ</a> | 
        <a href="${CLIENT_URL}/privacy-policy" style="color:#149777;">Privacy</a>
      </p>
    </div>
    <div class="footer">
      <p>Trendy Fashion Shop in Bangladesh</p>
      <p><small>${esc(BRAND_NAME)} | ${CLIENT_URL}</small></p>
    </div>
  </div>
</body>
</html>`;
};

module.exports.submitInquiry = async (req, res) => {
  try {
    const { name, email, mobile, message, website, userId, source } = req.body || {};
    const ip = getRequestIP(req);
    const submittedAt = new Date().toLocaleString("bn-BD");

    // Honeypot (spam)
    if (website && String(website).trim().length > 0) {
      return res.status(400).json({ success: false, message: "Spam detected" });
    }

    // Server-side validation
    const e = {};
    if (!name || String(name).trim().length < 2) e.name = "Please enter correct name";
    if (!email || !isValidEmail(email)) e.email = "Please enter your valid email";
    if (!mobile || !isValidBDMobile(mobile))
      e.mobile = "Bangladeshi mobile (ex: 01xxxxxxxxx)";
    if (!message || String(message).trim().length < 8)
      e.message = "Please provide a concise message (at least 8 chars)";

    if (Object.keys(e).length) {
      return res.status(400).json({ success: false, message: "All fields are required", errors: e });
    }

    // Save to DB
    const inquiry = await ContactInquiry.create({
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      mobile: String(mobile).trim(),
      message: String(message).trim(),
      userId,
      ip,
      source: source || "contact-page",
    });

    // Build HTMLs
    const adminHtml = buildAdminHtml({
      name,
      email,
      mobile,
      message,
      userId,
      ip,
      source,
      submittedAt,
      inquiryId: inquiry?._id,
    });

    const customerHtml = buildCustomerHtml({ name });

    const adminTo = process.env.ADMIN_EMAIL || process.env.NODEMAILER_EMAIL;
    if (!adminTo) {
      console.warn("ADMIN_EMAIL/NODEMAILER_EMAIL not set; admin mail will be skipped.");
    }

    // Send emails (in parallel)
    const results = await Promise.allSettled([
      adminTo
        ? sendMail({
            to: adminTo,
            subject: `🆕 New Contact Inquiry: ${name}`,
            html: adminHtml,
            text: `${name} (${email}, ${mobile})\n\n${message}`,
            replyTo: email,
          })
        : Promise.resolve("skipped-admin"),
      sendMail({
        to: email,
        subject: `✅ Thank you ${name} - ${BRAND_NAME}`,
        html: customerHtml,
        text: `Thanks ${name}, we received your message. We will contact you within 24–48 hours.`,
      }),
    ]);

    const ok = results.some((r) => r.status === "fulfilled");
    if (!ok) {
      console.error("Email send failed:", results);
      return res
        .status(500)
        .json({ success: false, message: "Failed to send email. Try WhatsApp." });
    }

    res.json({
      success: true,
      message: "Message sent successfully! We will get in touch with you soon.",
      inquiryId: inquiry?._id,
    });
  } catch (err) {
    console.error("submitInquiry error:", err?.message || err);
    res.status(500).json({ success: false, message: "Server error. Try WhatsApp." });
  }
};