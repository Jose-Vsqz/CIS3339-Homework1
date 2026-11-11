# Phase 1 backend

Requires Node.js 22 or newer, npm, and MongoDB Community Edition running
locally (a standalone server is sufficient). On Windows, start the installed
MongoDB service through Services if it is not already running.

From the project root:

```powershell
cd backend
npm install
npm start
```

The API runs at `http://localhost:3000`. `npm run dev` enables Node's watch mode.
The server reads the real project-root `.env` regardless of the working directory:

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017/cis3339_homework1
PORT=3000
```

Existing environment variables take precedence. Startup connects to MongoDB
and awaits automatic collection and index creation before listening. No seed,
import, migration, replica set, credentials, or cloud database is needed.
`students.json` is preserved for reference and is never read or written by the API.
Its sample record is not automatically imported.

## REST API

Student and course `:id` parameters mean their public IDs, not MongoDB `_id`.
URL-encode IDs containing spaces. All input fields below must be nonempty
strings; surrounding whitespace is trimmed. IDs are case-sensitive. Limits:
names 200 characters, IDs 100, phone 50, ZIP 20. Phone and ZIP are strings to
preserve punctuation and leading zeros, without imposing a country-specific format.

| Method | Path | Body / result |
| --- | --- | --- |
| GET | `/api/students` | Array of all students |
| GET | `/api/students?name=John` | Array of exact, case-sensitive name matches |
| GET | `/api/students/:id` | Student record |
| POST | `/api/students` | `{ "name", "id", "phone", "zip" }`; returns `{ message, student }` |
| DELETE | `/api/students/:id` | Deletes student and their enrollments; returns `{ message, student }` |
| GET | `/api/courses` | Array of all courses |
| POST | `/api/courses` | `{ "id", "name" }`; returns `{ message, course }` |
| DELETE | `/api/courses/:id` | Deletes course and its enrollments; returns `{ message, course }` |
| POST | `/api/enrollments` | `{ "studentId", "courseId" }` using public IDs; returns `{ message, enrollment }` |
| GET | `/api/courses/:id/students` | `{ course, students }` with full enrolled student records |

The body notation above lists property names; supply string values for each.
Creation returns 201; reads/deletes return 200. Errors use `{ error }` with
optional validation `details`: 400 invalid input/JSON, 404 missing resource,
409 duplicate or ambiguous legacy deletion, 413 oversized request, 503 database
unavailable, and 500 unexpected failures. MongoDB unique indexes enforce student
IDs, course IDs, and student/course pairs.

Starter compatibility endpoints remain:

- `POST /add-student`: same body and response as student creation.
- `POST /find-student`: `{ "name": "John" }`, returning the first exact match.
- `POST /delete-student`: `{ "name": "John" }`, returning `{ message, student }`.
  Ambiguous names return 409; use the ID-based endpoint to select the student.

## Integrity and deployment scope

Run one backend process for this local assignment. API mutations are serialized
within that process so enrollment creation cannot race student/course deletion.
Enrollment references are checked before insertion. Cascading deletions remove
enrollments before the parent; requests report success only after both finish.
There are no MongoDB transactions. A process/database failure partway through a
delete can remove enrollments while leaving the parent; retrying deletion is safe.
Multiple API processes or direct writes through Compass bypass this serialization
and application-level reference checks. Use the API for application data changes.

## Integration tests

```powershell
cd backend
npm test
```

Tests require the local MongoDB service at `127.0.0.1:27017`. Each run uses a new
`cis3339_homework1_test_<uuid>` database and an OS-assigned HTTP port. They do not
use or clear the configured assignment database. Tests create/delete only their
own fixtures and leave their isolated database in place, printing its name.
No database is dropped. Tests cover automatic startup/indexes, validation,
duplicates, CRUD, references, rosters, restart persistence, cascading deletion,
concurrent requests, legacy compatibility, and connection failures.

## Production frontend hosting

Express also serves the Vue production assets from `frontend/dist/`, using an
absolute path independent of the working directory. Run `npm install`,
`npm run build`, and `npm start` from the repository root for the full application
at **http://localhost:3000**. The backend-only commands above still work.

Page refresh and direct links to `/students`, `/students/:id`, `/courses`, and
`/enrollments` return the built Vue entry page; `/`, `/index.html`, and
`/courses.html` are also supported. API and legacy endpoint handlers retain
their existing JSON behavior. Unknown APIs and missing assets return JSON 404;
missing frontend builds return a helpful JSON 503 for page requests.

Root `npm run test:production` builds Vue and tests this integration against a
new isolated local database, retained after tests. No existing database is cleared.
