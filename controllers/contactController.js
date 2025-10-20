const nodemailer = require('nodemailer');
const ContactInquiry = require('../models/contactInquiryModel'); 
require('dotenv').config();  // Load .env

// ✅ Transporter Setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.NODEMAILER_EMAIL,  // marifamisam@gmail.com
    pass: process.env.NODEMAILER_PASS    // enxxrcjmvivvlbyw
  }
});

// Verify on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('Nodemailer Verify Error:', error);
  } else {
    console.log('✅ Nodemailer Ready!');
  }
});

// ✅ Full Submit Function
module.exports.submitInquiry = async (req, res) => {
  try {
    const { name, email, mobile, message, website, userId, source } = req.body;
    const ip = req.ip || req.connection.remoteAddress;
    const submittedAt = new Date().toLocaleString('bn-BD');

    // Spam Honeypot Check
    if (website?.trim()) {
      return res.status(400).json({ success: false, message: 'Spam detected' });
    }

    // Server-Side Validation
    if (!name?.trim() || !email?.trim() || !mobile?.trim() || !message?.trim()) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    // Save to Database
    const inquiry = await ContactInquiry.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      mobile: mobile.trim(),
      message: message.trim(),
      userId,
      ip,
      source: source || 'contact-page'
    });

    // Logo URL (Upload logo.png to public/ or use Cloudinary)
    const logoUrl = `https://res.cloudinary.com/dpd5xwjqp/image/upload/v1757668954/Misam_Marifa_Fashion_World_oo94yx.png` ;

    // ✅ ADMIN EMAIL (Enhanced Design)
    const adminHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Customer Inquiry</title>
  <style>
    body { margin: 0; padding: 20px; font-family: Arial, sans-serif; background: #f4f4f4; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #149777, #0f6b5a); color: #fff; padding: 30px 20px; text-align: center; }
    .logo { max-width: 120px; height: auto; margin-bottom: 10px; }
    .priority-high { background: #dc3545; color: #fff; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: bold; }
    .priority-medium { background: #ffc107; color: #212529; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: bold; }
    .content { padding: 30px 20px; }
    .card { background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
    .message-box { background: #fff; padding: 15px; border-left: 4px solid #149777; border-radius: 0 6px 6px 0; }
    .btn { display: inline-block; background: #149777; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 6px; margin: 5px; font-weight: 500; transition: background 0.3s; }
    .btn:hover { background: #0f6b5a !important; }
    .btn-primary { background: #007bff; }
    .btn-success { background: #28a745; }
    .btn-wa { background: #25D366; }
    .footer { background: #149777; color: #fff; text-align: center; padding: 20px; font-size: 14px; }
    @media (max-width: 600px) { .container { margin: 0 !important; border-radius: 0 !important; } .btn { display: block; width: 100%; text-align: center; margin: 10px 0 !important; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${logoUrl}" alt="MM Fashion World" class="logo">
      <h1>🆕 New Customer Inquiry</h1>
      <span class="priority-${userId ? 'high' : 'medium'}">${userId ? 'HIGH PRIORITY (Logged User)' : 'Medium Priority'}</span>
    </div>
    <div class="content">
      <div class="card">
        <h3>👤 Customer Info</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
        <p><strong>Mobile:</strong> <a href="tel:${mobile}">${mobile}</a></p>
        ${userId ? `<p><strong>User ID:</strong> <a href="${process.env.CLIENT_URL}/admin/users/${userId}">View Profile</a></p>` : ''}
        <p><strong>IP / Source:</strong> ${ip} / ${source}</p>
      </div>
      <div class="card">
        <h3>💬 Message</h3>
        <div class="message-box">
          ${message.replace(/\n/g, '<br>')}
        </div>
      </div>
      <p><strong>📅 Submitted:</strong> ${submittedAt}</p>
      <div style="text-align: center;">
        <a href="${process.env.CLIENT_URL}/admin/inquiries/${inquiry._id}" class="btn">📊 Dashboard View</a>
        <a href="mailto:${email}?subject=Re:${name}'s Inquiry&body=Hi ${name},%0AThanks for reaching out." class="btn btn-primary">📧 Quick Reply</a>
        <a href="https://wa.me/${mobile.replace(/^0/, '880')}" class="btn btn-wa">💬 WhatsApp</a>
        <a href="tel:${mobile}" class="btn btn-success">📞 Call</a>
      </div>
    </div>
    <div class="footer">
      <p>MM Fashion World Admin | Auto-Generated</p>
    </div>
  </div>
</body>
</html>
    `;

    const mailOptions = {
      from: `"${process.env.NODEMAILER_USER}" <${process.env.NODEMAILER_EMAIL}>`,
      to: process.env.ADMIN_EMAIL,
      cc: email,
      subject: `🆕 New Contact Inquiry: ${name}`,
      html: adminHtml
    };
    await transporter.sendMail(mailOptions);

    // ✅ CUSTOMER AUTO-REPLY (Enhanced)
    const customerHtml = `
<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thank You - MM Fashion World</title>
  <style>
    body { margin: 0; padding: 20px; font-family: Arial, sans-serif; background: #f4f4f4; }
    .container { max-width: 500px; margin: 0 auto; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #149777, #0f6b5a); color: #fff; padding: 30px 20px; text-align: center; }
    .logo { max-width: 120px; height: auto; margin-bottom: 10px; }
    .content { padding: 30px 20px; text-align: center; }
    .btn { display: inline-block; background: #25D366; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 25px; margin: 10px; font-weight: 500; }
    .btn-primary { background: #007bff; }
    .social { display: flex; justify-content: center; gap: 20px; margin: 20px 0; }
    .social a { color: #149777; font-size: 28px; text-decoration: none; }
    .footer { background: #149777; color: #fff; text-align: center; padding: 20px; font-size: 14px; }
    @media (max-width: 500px) { .container { margin: 0 !important; border-radius: 0 !important; } .btn { display: block; width: 100%; margin: 10px 0 !important; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://res.cloudinary.com/dpd5xwjqp/image/upload/v1757668954/Misam_Marifa_Fashion_World_oo94yx.png" alt="MM Fashion World" class="logo">
      <h1>ধন্যবাদ ${name}!</h1>
      <p style="margin: 0; opacity: 0.9;">আপনার যোগাযোগ গ্রহণ করা হয়েছে</p>
    </div>
    <div class="content">
      <p style="font-size: 16px; line-height: 1.6; color: #333;">
        আপনার বার্তা সফলভাবে আমাদের কাছে পৌঁছেছে। আমাদের টিম <strong>২৪-৪৮ ঘণ্টার মধ্যে</strong> আপনার সাথে যোগাযোগ করবে।
      </p>
      <p><strong>জরুরি সাহায্যের জন্য:</strong></p>
      <a href="https://wa.me/8801749889595?text=Hi%2C%20I%20have%20submitted%20a%20contact%20form" class="btn">💬 WhatsApp চ্যাট করুন</a>
      <a href="${process.env.CLIENT_URL}/track-order" class="btn btn-primary">Messanger</a>
      
      <div class="social">
        <a href="https://facebook.com/MMFashionWorld" title="Facebook" target="_blank">📘</a>
        <a href="https://www.facebook.com/mmfashionworldonline" title="Instagram" target="_blank">📷</a>
      </div>
      
      <p style="font-size: 14px; color: #666;">
        আরও তথ্য: <a href="${process.env.CLIENT_URL}/faq" style="color: #149777;">FAQ</a> | 
        <a href="${process.env.CLIENT_URL}/privacy-policy" style="color: #149777;">Privacy</a>
      </p>
    </div>
    <div class="footer">
      <p>Trendy Fashion Shop in Bangladesh</p>
      <p><small>MM Fashion World | ${process.env.CLIENT_URL}</small></p>
    </div>
  </div>
</body>
</html>
    `;

    const userReply = {
      from: `"${process.env.NODEMAILER_USER}" <${process.env.NODEMAILER_EMAIL}>`,
      to: email,
      subject: `✅ Thank you ${name} - MM Fashion World`,
      html: customerHtml
    };
    await transporter.sendMail(userReply);

    res.json({ 
      success: true, 
      message: 'Message sent successfully! We will get in touch with you soon.' 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error. Try WhatsApp.' });
  }
};

