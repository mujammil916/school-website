// =============================================
// Summer Academy School — Backend Server
// Node.js + Express
// =============================================

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const nodemailer = require('nodemailer');
const { body, validationResult } = require('express-validator');
const rateLimit  = require('express-rate-limit');
const path       = require('path');
const fs         = require('fs');
require('dotenv').config();

const app  = express();
const PORT = process.env.PORT || 3000;

// =============================================
// JSON FILE DATABASE (no native build needed)
// =============================================
const DB_FILE = path.join(__dirname, 'data', 'messages.json');

// Ensure data directory and file exist
function initDB() {
  const dir = path.join(__dirname, 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ messages: [], admissions: [], newsletter: [] }, null, 2));
  }
}

function readDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  } catch {
    return { messages: [], admissions: [], newsletter: [] };
  }
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

initDB();

// =============================================
// MIDDLEWARE
// =============================================
app.use(helmet({ contentSecurityPolicy: false }));  // Security headers
app.use(cors({ origin: '*' }));                      // Allow all origins (adjust for production)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..', 'frontend', 'public')));

// =============================================
// RATE LIMITING
// =============================================
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,                    // max 5 requests per window
  message: { success: false, message: 'Too many submissions. Please wait 15 minutes and try again.' }
});

const admissionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: { success: false, message: 'Too many admission requests. Please try again in an hour.' }
});

// =============================================
// EMAIL TRANSPORTER
// =============================================
const transporter = nodemailer.createTransport({
  host:   process.env.EMAIL_HOST   || 'smtp.gmail.com',
  port:   parseInt(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || ''
  }
});

// Check email config
const emailConfigured = !!(process.env.EMAIL_USER && process.env.EMAIL_PASS &&
  process.env.EMAIL_USER !== 'your-school-email@gmail.com');

async function sendEmail(opts) {
  if (!emailConfigured) {
    console.log('[EMAIL SKIPPED - not configured]', opts.subject);
    return;
  }
  await transporter.sendMail(opts);
}

// =============================================
// ROUTES
// =============================================

// Health check
app.get('/api/health', (req, res) => {
  const db = readDB();
  res.json({
    status: 'ok',
    school: process.env.SCHOOL_NAME || 'Summer Academy School Punjab',
    emailConfigured,
    stats: {
      totalMessages:   db.messages.length,
      totalAdmissions: db.admissions.length,
      totalNewsletter: db.newsletter.length
    }
  });
});

// ─────────────────────────────────────────────
// 1. CONTACT FORM
// ─────────────────────────────────────────────
app.post('/api/contact',
  contactLimiter,
  [
    body('name').trim().notEmpty().withMessage('Full name is required').isLength({ max: 100 }),
    body('email').trim().isEmail().withMessage('Valid email address is required').normalizeEmail(),
    body('message').trim().notEmpty().withMessage('Message is required').isLength({ min: 10, max: 2000 }),
    body('phone').optional().trim().isLength({ max: 20 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, email, phone, message } = req.body;
    const timestamp = new Date().toISOString();
    const id = 'MSG-' + Date.now();

    // Save to database
    const db = readDB();
    db.messages.push({ id, name, email, phone: phone || '', message, timestamp, read: false });
    writeDB(db);

    // Send notification email to admin
    try {
      await sendEmail({
        from: `"${process.env.SCHOOL_NAME}" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_TO || process.env.EMAIL_USER,
        subject: `📬 New Contact Message from ${name} — ${process.env.SCHOOL_NAME}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #dde3f0;border-radius:10px;overflow:hidden">
            <div style="background:linear-gradient(135deg,#0d1f40,#2456b4);padding:28px 32px">
              <h2 style="color:white;margin:0;font-size:1.3rem">📬 New Contact Message</h2>
              <p style="color:rgba(255,255,255,0.7);margin:6px 0 0;font-size:0.9rem">${process.env.SCHOOL_NAME}</p>
            </div>
            <div style="padding:28px 32px;background:#faf7f0">
              <table style="width:100%;border-collapse:collapse">
                <tr><td style="padding:8px 0;color:#6b7080;font-size:0.85rem;width:120px">Reference ID</td><td style="padding:8px 0;font-weight:600;color:#0d1f40">${id}</td></tr>
                <tr><td style="padding:8px 0;color:#6b7080;font-size:0.85rem">Name</td><td style="padding:8px 0;font-weight:600;color:#0d1f40">${name}</td></tr>
                <tr><td style="padding:8px 0;color:#6b7080;font-size:0.85rem">Email</td><td style="padding:8px 0"><a href="mailto:${email}" style="color:#2456b4">${email}</a></td></tr>
                <tr><td style="padding:8px 0;color:#6b7080;font-size:0.85rem">Phone</td><td style="padding:8px 0;color:#0d1f40">${phone || 'Not provided'}</td></tr>
                <tr><td style="padding:8px 0;color:#6b7080;font-size:0.85rem;vertical-align:top">Date</td><td style="padding:8px 0;color:#0d1f40">${new Date(timestamp).toLocaleString()}</td></tr>
              </table>
              <div style="margin-top:20px;padding:20px;background:white;border-radius:8px;border-left:4px solid #2456b4">
                <p style="color:#6b7080;font-size:0.8rem;margin:0 0 8px;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Message</p>
                <p style="color:#0d1f40;line-height:1.7;margin:0">${message.replace(/\n/g, '<br>')}</p>
              </div>
            </div>
          </div>`
      });

      // Auto-reply to sender
      await sendEmail({
        from: `"${process.env.SCHOOL_NAME}" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `✅ We received your message — ${process.env.SCHOOL_NAME}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #dde3f0;border-radius:10px;overflow:hidden">
            <div style="background:linear-gradient(135deg,#0d1f40,#2456b4);padding:28px 32px">
              <h2 style="color:white;margin:0">Thank You, ${name}! 🎓</h2>
              <p style="color:rgba(255,255,255,0.7);margin:6px 0 0;font-size:0.9rem">Your message has been received</p>
            </div>
            <div style="padding:28px 32px;background:#faf7f0">
              <p style="color:#0d1f40;line-height:1.7">We have received your message and our team will get back to you within <strong>1-2 business days</strong>.</p>
              <div style="background:#eafaf1;border:1px solid #a9dfbf;border-radius:8px;padding:14px 18px;margin:20px 0">
                <p style="color:#27ae60;margin:0;font-size:0.9rem">✅ Reference ID: <strong>${id}</strong></p>
              </div>
              <p style="color:#6b7080;font-size:0.9rem">If you need urgent assistance, please call us at <strong>+91 (183) 123-4567</strong>.</p>
              <hr style="border:none;border-top:1px solid #dde3f0;margin:24px 0">
              <p style="color:#6b7080;font-size:0.85rem;margin:0">© ${new Date().getFullYear()} ${process.env.SCHOOL_NAME}. 123 Education Street, Amritsar, Punjab.</p>
            </div>
          </div>`
      });
    } catch (err) {
      console.error('Email error:', err.message);
      // Don't fail the request if email fails
    }

    res.json({
      success: true,
      message: 'Your message has been received! We will get back to you within 1-2 business days.',
      referenceId: id
    });
  }
);

// ─────────────────────────────────────────────
// 2. ADMISSION ENQUIRY
// ─────────────────────────────────────────────
app.post('/api/admission',
  admissionLimiter,
  [
    body('studentName').trim().notEmpty().withMessage('Student name is required'),
    body('parentName').trim().notEmpty().withMessage('Parent/Guardian name is required'),
    body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('phone').trim().notEmpty().withMessage('Phone number is required'),
    body('grade').trim().notEmpty().withMessage('Grade/Class is required'),
    body('dob').trim().notEmpty().withMessage('Date of birth is required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { studentName, parentName, email, phone, grade, dob, message } = req.body;
    const timestamp = new Date().toISOString();
    const id = 'ADM-' + Date.now();

    const db = readDB();
    db.admissions.push({ id, studentName, parentName, email, phone, grade, dob, message: message || '', timestamp, status: 'pending' });
    writeDB(db);

    try {
      await sendEmail({
        from: `"${process.env.SCHOOL_NAME}" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_TO || process.env.EMAIL_USER,
        subject: `🎓 New Admission Enquiry — ${studentName} (${grade})`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #dde3f0;border-radius:10px;overflow:hidden">
            <div style="background:linear-gradient(135deg,#0d1f40,#2456b4);padding:28px 32px">
              <h2 style="color:white;margin:0">🎓 New Admission Enquiry</h2>
            </div>
            <div style="padding:28px 32px;background:#faf7f0">
              <table style="width:100%;border-collapse:collapse">
                <tr><td style="padding:6px 0;color:#6b7080;font-size:.85rem;width:140px">Reference</td><td style="font-weight:600;color:#0d1f40">${id}</td></tr>
                <tr><td style="padding:6px 0;color:#6b7080;font-size:.85rem">Student Name</td><td style="font-weight:600;color:#0d1f40">${studentName}</td></tr>
                <tr><td style="padding:6px 0;color:#6b7080;font-size:.85rem">Parent/Guardian</td><td>${parentName}</td></tr>
                <tr><td style="padding:6px 0;color:#6b7080;font-size:.85rem">Grade Applying For</td><td><strong>${grade}</strong></td></tr>
                <tr><td style="padding:6px 0;color:#6b7080;font-size:.85rem">Date of Birth</td><td>${dob}</td></tr>
                <tr><td style="padding:6px 0;color:#6b7080;font-size:.85rem">Email</td><td><a href="mailto:${email}">${email}</a></td></tr>
                <tr><td style="padding:6px 0;color:#6b7080;font-size:.85rem">Phone</td><td>${phone}</td></tr>
              </table>
              ${message ? `<div style="margin-top:18px;padding:16px;background:white;border-radius:8px;border-left:4px solid #d4a017"><p style="color:#0d1f40;margin:0">${message}</p></div>` : ''}
            </div>
          </div>`
      });

      await sendEmail({
        from: `"${process.env.SCHOOL_NAME}" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `✅ Admission Enquiry Received — ${process.env.SCHOOL_NAME}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #dde3f0;border-radius:10px;overflow:hidden">
            <div style="background:linear-gradient(135deg,#0d1f40,#2456b4);padding:28px 32px">
              <h2 style="color:white;margin:0">Admission Enquiry Received 🎓</h2>
            </div>
            <div style="padding:28px 32px;background:#faf7f0">
              <p style="color:#0d1f40">Dear <strong>${parentName}</strong>,</p>
              <p style="color:#0d1f40;line-height:1.7">Thank you for your interest in admitting <strong>${studentName}</strong> to ${process.env.SCHOOL_NAME}. We have received your enquiry for <strong>${grade}</strong>.</p>
              <p style="color:#0d1f40;line-height:1.7">Our admissions team will contact you within <strong>2-3 business days</strong> to schedule a meeting and share further details.</p>
              <div style="background:#eafaf1;border:1px solid #a9dfbf;border-radius:8px;padding:14px 18px;margin:20px 0">
                <p style="color:#27ae60;margin:0">✅ Reference ID: <strong>${id}</strong></p>
              </div>
            </div>
          </div>`
      });
    } catch (err) {
      console.error('Email error:', err.message);
    }

    res.json({
      success: true,
      message: 'Admission enquiry submitted successfully! Our team will contact you within 2-3 business days.',
      referenceId: id
    });
  }
);

// ─────────────────────────────────────────────
// 3. NEWSLETTER SUBSCRIPTION
// ─────────────────────────────────────────────
app.post('/api/newsletter',
  [
    body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email } = req.body;
    const db = readDB();

    // Check for duplicate
    if (db.newsletter.find(n => n.email === email)) {
      return res.json({ success: true, message: 'You are already subscribed to our newsletter!' });
    }

    db.newsletter.push({ email, subscribedAt: new Date().toISOString() });
    writeDB(db);

    try {
      await sendEmail({
        from: `"${process.env.SCHOOL_NAME}" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `📰 Welcome to ${process.env.SCHOOL_NAME} Newsletter!`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #dde3f0;border-radius:10px;overflow:hidden">
            <div style="background:linear-gradient(135deg,#0d1f40,#2456b4);padding:28px 32px">
              <h2 style="color:white;margin:0">Welcome to Our Newsletter! 📰</h2>
            </div>
            <div style="padding:28px 32px;background:#faf7f0">
              <p style="color:#0d1f40;line-height:1.7">Thank you for subscribing! You'll now receive updates about events, admissions, and news from <strong>${process.env.SCHOOL_NAME}</strong>.</p>
            </div>
          </div>`
      });
    } catch (err) {
      console.error('Email error:', err.message);
    }

    res.json({ success: true, message: 'Successfully subscribed to our newsletter!' });
  }
);

// ─────────────────────────────────────────────
// 4. ADMIN DASHBOARD (simple password protected)
// ─────────────────────────────────────────────
app.get('/api/admin/data', (req, res) => {
  const key = req.headers['x-admin-key'];
  if (key !== (process.env.ADMIN_KEY || 'school-admin-2026')) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  const db = readDB();
  res.json({ success: true, data: db });
});

// ─────────────────────────────────────────────
// SERVE FRONTEND for all other routes
// ─────────────────────────────────────────────
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'public', 'index.html'));
});

// =============================================
// START SERVER
// =============================================
app.listen(PORT, () => {
  console.log('\n🎓 Summer Academy School — Backend Server');
  console.log('==========================================');
  console.log(`🚀 Server running at: http://localhost:${PORT}`);
  console.log(`📬 Email configured: ${emailConfigured ? '✅ Yes' : '⚠️  No (set EMAIL_USER & EMAIL_PASS in .env)'}`);
  console.log(`🗄️  Database: ${DB_FILE}`);
  console.log('==========================================\n');
});
