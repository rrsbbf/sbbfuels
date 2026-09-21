const express = require('express');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx-js-style');
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

function readSubmissions() {
  const sourceFile = fs.existsSync(excelFile) ? excelFile : submissionsFile;
  if (!fs.existsSync(sourceFile)) return [];

  const workbook = XLSX.readFile(sourceFile);
  const ws = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { defval: '' }).map((submission, index) => ({
    id: submission.id || `legacy-${index}-${submission.timestamp || 'entry'}`,
    timestamp: submission.timestamp || '',
    name: submission.name || '',
    email: submission.email || '',
    subject: submission.subject || '',
    message: submission.message || '',
    status: submission.status || 'Active',
    deletedAt: submission.deletedAt || ''
  }));
}

function writeSubmissions(submissions) {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const ws = XLSX.utils.json_to_sheet(submissions);
  const deletedStyle = { font: { color: { rgb: 'FF0000' } } };
  for (let rowIndex = 1; rowIndex <= submissions.length; rowIndex += 1) {
    if (submissions[rowIndex - 1].status !== 'Deleted') continue;
    for (let columnIndex = 0; columnIndex < 8; columnIndex += 1) {
      const cell = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
      if (ws[cell]) ws[cell].s = deletedStyle;
    }
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, ws, 'submissions');
  XLSX.writeFile(workbook, excelFile);
  fs.writeFileSync(submissionsFile, XLSX.utils.sheet_to_csv(ws), 'utf8');
}

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
    res.json({ submissions: readSubmissions().reverse() });
  } catch (error) {
    console.error('Error reading submissions:', error);
    res.status(500).json({ submissions: [], message: 'Unable to read submissions.' });
  }
});

app.delete('/admin/submissions/:id', (req, res) => {
  try {
    const submissions = readSubmissions();
    const submission = submissions.find(entry => entry.id === req.params.id);
    if (!submission) return res.status(404).json({ success: false, message: 'Submission not found.' });

    if (submission.status !== 'Deleted') {
      submission.status = 'Deleted';
      submission.deletedAt = new Date().toISOString();
      writeSubmissions(submissions);
    }

    res.json({ success: true, submission });
  } catch (error) {
    console.error('Submission delete error:', error);
    res.status(500).json({ success: false, message: 'Unable to delete this submission.' });
  }
});

app.get('/admin/download/submissions.xlsx', (req, res) => {
  if (!fs.existsSync(excelFile)) {
    return res.status(404).send('No submission data is available yet.');
  }

  res.download(excelFile, 'sbbfuels-submissions.xlsx');
});

app.get('/admin/download/submissions.csv', (req, res) => {
  if (!fs.existsSync(submissionsFile)) {
    return res.status(404).send('No submission data is available yet.');
  }

  res.download(submissionsFile, 'sbbfuels-submissions.csv');
});

function ensureCsvHeader() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(submissionsFile)) {
    fs.writeFileSync(submissionsFile, 'id,timestamp,name,email,subject,message,status,deletedAt\n', 'utf8');
  }
}

app.post('/submit-contact', (req, res) => {
  try {
    ensureCsvHeader();
    const timestamp = new Date().toISOString();
    const clean = value => String(value || '').replace(/\r?\n/g, ' ');
    const name = clean(req.body.name);
    const email = clean(req.body.email);
    const subject = clean(req.body.subject);
    const message = clean(req.body.message);
    const submission = {
      id: require('crypto').randomUUID(), timestamp, name, email, subject, message,
      status: 'Active', deletedAt: ''
    };
    const data = readSubmissions();
    data.push(submission);
    writeSubmissions(data);

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
