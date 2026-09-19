# Biometric Payroll App

A simple attendance and payroll deduction application for biometric punch-in/out systems.

## Features
- Create employees from the web UI
- Add punch-in/out timestamps and leave days
- Track half-day and leave status automatically
- Display attendance with a pie chart and hour trend line
- Import biometric punch data from CSV or API export
- Mobile-friendly responsive layout and API-driven data access

## Quick start
1. Install dependencies:
```bash
npm install
```
2. Start the server:
```bash
npm start
```
3. Open the browser at `http://localhost:3000`

## API Endpoints
- `GET /api/punches` - list all punch logs
- `GET /api/punches/employees` - list all employees
- `POST /api/punches/employees` - create employee
- `POST /api/punches/log` - add punch record
- `POST /api/punches/leave` - add leave request
- `POST /api/punches/import-csv` - import punch records via CSV or JSON body
- `GET /api/punches/attendance/:employeeId` - employee attendance records
- `GET /api/payroll/summary/:employeeId` - compute salary summary

## Web UI Features
- Employee creation form
- Punch entry form
- Leave entry form
- Attendance status pie chart
- Worked hours trend line chart
- Biometric CSV import form
- Responsive layout for mobile screens

## Mobile App Integration
The same REST API can be used by a React Native or Flutter client.

### Recommended mobile workflow
1. Load employees from `GET /api/punches/employees`
2. Select an employee and fetch attendance from `GET /api/punches/attendance/:employeeId`
3. Show salary deductions with `GET /api/payroll/summary/:employeeId`
4. Add punch data using `POST /api/punches/log`
5. Add leave records using `POST /api/punches/leave`
6. Import biometric exports via `POST /api/punches/import-csv`

## CSV import format
Use a CSV header row, for example:

```csv
employeeId,date,timestamp
abc123,2026-08-05,2026-08-05T09:00:00
abc123,2026-08-05,2026-08-05T18:00:00
```

If the CSV does not include `employeeId`, set a default employee ID in the import form.
