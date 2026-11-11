# Phase 2 Vue frontend

Requires Node.js 22.12 or newer (Node 24 is recommended), npm, the Phase 1 backend,
and MongoDB Community Edition running locally. The backend reads the existing
root `.env`; no frontend environment variables or credentials are required.

## Development

From the project root, start the backend in one terminal:

```powershell
cd backend
npm install
npm start
```

In a second terminal, from the project root:

```powershell
cd frontend
npm install
npm run dev
```

Open **http://127.0.0.1:5173**. Vite forwards `/api` requests to the real Express
server at `http://127.0.0.1:3000`. Both processes must be running. The dev server
uses a strict port so it does not silently switch to another address. It is
bound to loopback for local development. Do not open HTML files directly.

## Features and structure

- `/students`: all students, exact case-sensitive name search, student creation,
  individual details, and confirmed deletion with enrollment cascade feedback.
- `/students/:id`: the individual record loaded directly from the API. IDs are
  public student IDs and are URL-encoded.
- `/courses`: all courses, creation with backend fields `id` and `name`, and
  confirmed deletion with enrollment cascade feedback.
- `/enrollments`: backend-populated student/course choices, creation with
  `studentId` and `courseId`, duplicate feedback, and course roster retrieval.
- `/` redirects to Students. Old `/index.html` and `/courses.html` URLs redirect
  through Vue Router for development compatibility.

All application logic uses Composition API (`<script setup>` components and a
Pinia setup store). `src/stores/records.js` shares student/course records across
views; the API module preserves real JSON response shapes. Components provide
navigation, forms, tables, loading/feedback, and inline deletion confirmation.
The legacy DOM script and course placeholder HTML were replaced by these views.

Required inputs are validated in the browser, trimmed, and constrained to the
backend's maximum lengths. IDs, phones, and ZIPs remain strings. Error messages
include backend validation details; 409 errors have operation-specific duplicate
messages. Failed submissions keep the input. Forms reset only after successful
API responses. Search uses the backend's exact-name endpoint, rather than
guessing partial or case-insensitive matches. Refresh controls retry failed reads
and pick up changes made outside this browser session.

## Build and tests

From `frontend/`:

```powershell
npm run build
npm test
```

`npm run build` generates `frontend/dist/` (ignored by Git). This is a frontend
compilation check only. Express static serving, the final production URL, and
production route refresh handling belong to Phase 3 and are not configured here.

`npm test` runs Vitest and Vue Test Utils using jsdom for rendered component
interactions. It starts the real Phase 1 backend on a temporary port against a
new `cis3339_homework1_vue_test_<uuid>` database on `127.0.0.1:27017`. It needs the
backend dependencies installed and local MongoDB running; a separately running
backend is not required. HTTP requests are real. Only the network-error scenario
intentionally rejects requests. No fake successful API responses are used.

Tests create/delete only their own fixtures. They never clear an existing
database or change `backend/students.json`. Their isolated database is retained
after each run, and no MongoDB database files or generated artifacts are tracked.
The suite checks CRUD flows, backend duplicate errors, exact search, detail
navigation, delete confirmation/cancel, enrollment choices/rosters, cascading
deletion, API/network errors and retry, and whitespace validation. jsdom does not
verify browser layout; manual desktop/mobile and keyboard checks remain useful.

Useful manual checks: add two students and courses; search by full name; visit a
student details page; cancel then confirm a deletion; attempt each duplicate;
enroll a student and inspect the roster; switch courses while loading; refresh
after deleting a student or course; stop the backend to inspect error/retry states.
Test at desktop and mobile widths and navigate forms using only the keyboard.
