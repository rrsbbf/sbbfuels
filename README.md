# SBBFuels Website

This is a small static website with a lightweight Express backend to collect contact form submissions.

## Install

```bash
cd d:/website
npm install
```

## Run

Start the server locally:

```bash
npm start
```

Open in your browser at `http://localhost:3000` (do not open `index.html` via `file://` — the contact form requires the backend).

## Submissions storage

- CSV: `data/submissions.csv`
- Excel: `data/submissions.xlsx` (updated on each form submission)
- Admin deletion is a soft delete: the submission stays in both exports with `status` set to `Deleted`, and its Excel row is colored red.

## Admin alerts — live dashboard (works immediately, no setup)

Set `ADMIN_USER` and `ADMIN_PASSWORD` in `.env` first, then open `http://localhost:3000/admin.html` in a browser tab. The browser will show its standard sign-in prompt.
The moment someone submits the contact form:

- A toast popup appears saying "New enquiry from **\<name\>**"
- A short beep plays
- A browser notification pops up (if you allow notifications when prompted)
- The submission is added instantly to the on-page table, and stays there (backed by `data/submissions.xlsx`)

The dashboard uses a live connection (Server-Sent Events), but it always requires the configured admin credentials. Email/SMTP is optional.

## Browser and source-code security

HTML, CSS, client-side JavaScript, and images must be sent to a browser to render the public site, so they cannot be made genuinely invisible to a visitor. Browser developer tools and JavaScript disabling also cannot be reliably disabled by a website.

The server does protect the actual sensitive boundary: admin APIs and downloads require authentication, and backend source, environment files, package metadata, and stored submissions are not served as public static files. Keep API keys, database credentials, and SMTP credentials in server environment variables only.

## Admin email notifications (optional, in addition to the dashboard)

To enable admin email alerts when a contact form is submitted, set the environment variables below (example provided in `.env.example`):

- `ADMIN_EMAIL` — recipient email address
	- Default: `rishiraj@sbbfuels.com` (used when `ADMIN_EMAIL` is not set)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` — SMTP server settings
- `SMTP_USER`, `SMTP_PASS` — SMTP credentials (if required)
- `SMTP_FROM` — optional From address

Example (PowerShell):

```powershell
$env:ADMIN_USER="admin"
$env:ADMIN_PASSWORD="use-a-long-random-password"
$env:ADMIN_EMAIL="you@example.com"
$env:SMTP_HOST="smtp.example.com"
$env:SMTP_PORT="587"
$env:SMTP_USER="smtp-user"
$env:SMTP_PASS="smtp-pass"
npm start
```

You can also copy `.env.example` to `.env` and fill in the values — the server loads it automatically on startup.

## Notes

- A lightweight `/_status` endpoint is available for the client to detect backend availability.
- The site now shows a small banner when opened via `file://` or when the backend is not reachable.
- The backend entry point is `backend/server.js`; start it from the project root with `npm start`.
