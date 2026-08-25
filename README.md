# SBBFuels Website (local development)

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

## Admin alerts — live dashboard (works immediately, no setup)

Open `http://localhost:3000/admin.html` in a browser tab (keep it open on your desk / office screen).
The moment someone submits the contact form:

- A toast popup appears saying "New enquiry from **\<name\>**"
- A short beep plays
- A browser notification pops up (if you allow notifications when prompted)
- The submission is added instantly to the on-page table, and stays there (backed by `data/submissions.xlsx`)

This needs no email/SMTP configuration — it works out of the box over a live connection (Server-Sent Events).

## Admin email notifications (optional, in addition to the dashboard)

To enable admin email alerts when a contact form is submitted, set the environment variables below (example provided in `.env.example`):

- `ADMIN_EMAIL` — recipient email address
	- Default: `rishiraj@sbbfuels.com` (used when `ADMIN_EMAIL` is not set)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` — SMTP server settings
- `SMTP_USER`, `SMTP_PASS` — SMTP credentials (if required)
- `SMTP_FROM` — optional From address

Example (PowerShell):

```powershell
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
