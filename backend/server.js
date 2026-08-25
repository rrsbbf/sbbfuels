const express = require('express');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const nodemailer = require('nodemailer');
const projectRoot = path.resolve(__dirname, '..');
try { require('dotenv').config({ path: path.join(projectRoot, '.env') }); } catch (e) { /* dotenv not installed — env vars can still be set manually */ }
const app = express();
const port = process.env.PORT || 3000;
const dataDir = path.join(projectRoot, 'data');
const submissionsFile = path.join(dataDir, 'submissions.csv');
const excelFile = path.join(dataDir, 'submissions.xlsx');

app.use(express.urlencoded({ extended: false }));
app.use(express.static(projectRoot));

// ---- Live admin alert plumbing (Server-Sent Events) ----
// Any browser tab with admin.html open receives a push the instant a form is submitted,
// so the admin gets an on-screen + sound alert even without email/SMTP configured.
let adminClients = [];

function broadcastToAdmins(payload) {
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  adminClients.forEach(res => res.write(data));
}

app.get('/admin/events', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  });
  res.flushHeaders();
  res.write('retry: 3000\n\n');
  adminClients.push(res);

  req.on('close', () => {
    adminClients = adminClients.filter(c => c !== res);
  });
});

// Returns all recorded submissions (newest first) for the admin dashboard table
app.get('/admin/submissions', (req, res) => {
  try {
    if (!fs.existsSync(excelFile)) return res.json({ submissions: [] });
    const workbook = XLSX.readFile(excelFile);
    const ws = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
    res.json({ submissions: data.reverse() });
  } catch (error) {
    console.error('Error reading submissions:', error);
    res.status(500).json({ submissions: [], message: 'Unable to read submissions.' });
  }
});

function ensureCsvHeader() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(submissionsFile)) {
    fs.writeFileSync(submissionsFile, 'timestamp,name,email,subject,message\n', 'utf8');
  }
}

app.post('/submit-contact', (req, res) => {
  try {
    ensureCsvHeader();
    const timestamp = new Date().toISOString();
    const name = (req.body.name || '').replace(/\r?\n/g, ' ').replace(/"/g, '""');
    const email = (req.body.email || '').replace(/\r?\n/g, ' ').replace(/"/g, '""');
    const subject = (req.body.subject || '').replace(/\r?\n/g, ' ').replace(/"/g, '""');
    const message = (req.body.message || '').replace(/\r?\n/g, ' ').replace(/"/g, '""');

    const row = `"${timestamp}","${name}","${email}","${subject}","${message}"\n`;
    fs.appendFileSync(submissionsFile, row, 'utf8');

    // Update Excel file (submissions.xlsx) with latest submissions
    try {
      let data = [];
      if (fs.existsSync(excelFile)) {
        const workbook = XLSX.readFile(excelFile);
        const ws = workbook.Sheets[workbook.SheetNames[0]];
        data = XLSX.utils.sheet_to_json(ws, { defval: '' });
      }

      data.push({ timestamp, name, email, subject, message });
      const wsNew = XLSX.utils.json_to_sheet(data);
      const wbNew = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wbNew, wsNew, 'submissions');
      XLSX.writeFile(wbNew, excelFile);
    } catch (ex) {
      console.error('Excel write error:', ex);
    }

    // Live alert to any open admin dashboard tab (works instantly, no setup needed)
    broadcastToAdmins({ timestamp, name, email, subject, message });

    // Optionally send an admin email if SMTP is configured
    const adminEmail = process.env.ADMIN_EMAIL || 'rishiraj@sbbfuels.com';
    const smtpHost = process.env.SMTP_HOST;
    if (adminEmail && smtpHost) {
      (async () => {
        try {
          const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
          });

          const mailOpts = {
            from: process.env.SMTP_FROM || `no-reply@${req.hostname}`,
            to: adminEmail,
            subject: `New enquiry from ${name || 'Website Visitor'} — ${subject || 'No subject'}`,
            text: `You have a new enquiry from ${name}.\n\nTime: ${timestamp}\nName: ${name}\nEmail: ${email}\nSubject: ${subject}\nMessage:\n${message}`
          };

          await transporter.sendMail(mailOpts);
          console.log('Admin notification email sent to', adminEmail);
        } catch (mailErr) {
          console.error('Failed sending admin email:', mailErr);
        }
      })();
    } else {
      console.log(`[ALERT] New enquiry from ${name} (${email}) — set SMTP_HOST in .env to also get this by email.`);
    }

    res.json({ success: true, message: 'Thank you for contacting us. Your submission has been recorded.' });
  } catch (error) {
    console.error('Contact submission error:', error);
    res.status(500).json({ success: false, message: 'Unable to process your request right now.' });
  }
});

// Lightweight status endpoint used by the client to detect whether the backend is reachable
app.get('/_status', (req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

const server = app.listen(port, () => {
  console.log(`SBBFuels website server running at http://localhost:${port}`);
});

server.on('error', error => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. The website server may already be running at http://localhost:${port}.`);
    process.exit(0);
  }

  throw error;
});
