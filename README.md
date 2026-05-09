# 🎓 Summer Academy School Punjab — Full-Stack Website

A complete school website with **Node.js + Express backend** and a polished frontend.

---

## 📁 Project Structure

```
school-website/
├── backend/
│   ├── server.js          ← Express server (all API routes)
│   ├── package.json
│   ├── .env.example       ← Copy this to .env and fill in values
│   └── data/
│       └── messages.json  ← Auto-created database file
├── frontend/
│   └── public/
│       └── index.html     ← Complete frontend (HTML + CSS + JS)
├── package.json
└── README.md
```

---

## ⚡ Quick Start

### Step 1 — Install Node.js
Download from https://nodejs.org (version 18 or higher)

### Step 2 — Install dependencies
```bash
cd backend
npm install
```

### Step 3 — Configure environment
```bash
cp .env.example .env
```
Edit `.env` with your details (see Email Setup below).

### Step 4 — Start the server
```bash
# From the project root:
node backend/server.js
```

### Step 5 — Open the website
Visit: **http://localhost:3000**

---

## 📬 Email Setup (Gmail)

1. Go to your Google Account → Security → **2-Step Verification** (enable it)
2. Go to **App Passwords** → create one for "Mail"
3. Copy the 16-character password
4. Edit your `.env` file:

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=yourschool@gmail.com
EMAIL_PASS=abcd efgh ijkl mnop    ← the 16-char app password
EMAIL_TO=admin@yourschool.edu     ← where to receive messages
```

> **Without email config**, the server still works — form submissions are saved to the database, but no emails are sent.

---

## 🗄️ Database

The website uses a **JSON file database** (`backend/data/messages.json`).  
No MySQL, no PostgreSQL — just a file. Easy to view and backup.

It stores 3 collections:
- `messages` — contact form submissions
- `admissions` — admission enquiries  
- `newsletter` — email subscribers

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Server status & stats |
| POST | `/api/contact` | Submit contact message |
| POST | `/api/admission` | Submit admission enquiry |
| POST | `/api/newsletter` | Subscribe to newsletter |
| GET | `/api/admin/data` | View all data (needs admin key) |

### View admin data
```bash
curl -H "x-admin-key: school-admin-2026" http://localhost:3000/api/admin/data
```

### Test contact form
```bash
curl -X POST http://localhost:3000/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","message":"Hello from the school!"}'
```

---

## 🌐 Features

### Frontend
- ✅ Sticky responsive navigation with hamburger menu
- ✅ Hero section with animated welcome message
- ✅ Stats bar (students, faculty, courses, success rate)
- ✅ About section with features grid
- ✅ 4 course cards (Science, Math, Languages, Arts)
- ✅ **Admission enquiry form** (new)
- ✅ Contact form with field-level validation
- ✅ Newsletter subscription strip
- ✅ Toast notifications for all actions
- ✅ Loading spinners during form submission
- ✅ Reference ID shown after submission
- ✅ Mobile-responsive design

### Backend
- ✅ Express.js REST API
- ✅ JSON file database (no setup required)
- ✅ Nodemailer email delivery (admin notification + auto-reply)
- ✅ Rate limiting (prevents spam)
- ✅ Helmet.js security headers
- ✅ Input validation with express-validator
- ✅ Admin endpoint to view all submissions
- ✅ CORS enabled

---

## 🚀 Deploy to the Internet (Free Options)

### Option A — Railway.app (easiest)
1. Push code to GitHub
2. Go to railway.app → New Project → Deploy from GitHub
3. Add environment variables from `.env`
4. Done! You get a public URL.

### Option B — Render.com
1. Push to GitHub
2. New Web Service → connect repo
3. Build command: `cd backend && npm install`
4. Start command: `node backend/server.js`
5. Add environment variables

---

## 🔒 Security Notes

- Change `ADMIN_KEY` in your `.env` before going live
- For production, restrict CORS to your domain in `server.js`
- Consider adding HTTPS (handled automatically by Railway/Render)

---

## 📞 Support

For classroom use — built for Summer Academy School Punjab.  
Email: info@summeracademypunjab.edu
