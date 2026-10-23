# Connect Attendance Sync

A Chrome Manifest V3 extension for BRAC Connect. It adds **Sync using Database API** beneath the Class (date) dropdown on the attendance entry page.

## Install

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select this folder (the folder containing `manifest.json`). If using the ZIP, extract it first.
4. Click the extension’s toolbar icon to open settings. Paste your API key and select **Save settings**.
5. Refresh the Connect attendance page after installing.

## Use

1. Select Semester, Academic Degree, Course, Section, and Class/date. Wait for the full roster to load.
2. Click **Sync using Database API**.
3. Review totals and each student’s current and database status. Search by ID/name or filter changes/errors. Use **Apply as** to override a result or keep its current value.
4. Click **Apply reviewed changes**, then **Done**.
5. Check the page and click Connect’s own **Save** or **Update** button to persist the changes.

Cancel or Escape closes the review without changing attendance. An API error never becomes an automatic absence. A changed class, roster, or attendance selection invalidates the review. Existing attendance can be reviewed using the same workflow.

## API and privacy

Endpoint: `https://bracu.partho.org/api/attendance/status`

Query parameters: `api_key`, `date` (YYYY-MM-DD), `student_id`, `course_code`.

Accepted responses: plain `A` / `P`, JSON strings, or JSON objects containing `status`, `attendance_status`, or `data.status` with an exact A/P value. Other results appear as errors. Requests have a 15-second timeout and run with at most four concurrent lookups per review. Closing a review prevents further queued lookups; already-running requests may finish.

The key is stored in local extension storage, not Chrome Sync, and is accessible only to trusted extension contexts. It is not bundled in the source. Requests omit browser credentials and reject redirects. No student names are sent. No roster or API results are persisted. API keys in query strings may appear in the API server’s access logs; this follows the supplied API contract.

## Validation and scope

The field and radio selectors were inspected on the live Connect page with Summer 2026 / Undergraduate / MAT215 / Section 17 / 10 June 2026. The extension clicks the native Material radio inputs so Angular receives normal change events. It never clicks Save/Update.

Run `node --test tests/*.test.cjs` for date, course, and response-parser checks. Run `node --check content.js` and `node --check background.js` for syntax checks.

Live extension installation and an end-to-end API sync still need to be verified after loading unpacked. No live student attendance was modified during development. The adapter reads all rendered rows in the attendance table; if Connect later introduces pagination or virtualized rows, show the complete roster before syncing or update the adapter. Site markup changes may also require adapter updates.

## Files

- `content.js`: Connect page adapter, review dialog, and apply workflow.
- `background.js`: Restricted API requests and settings launcher.
- `core.js`: Date, course, and response parsing.
- `options.html`, `options.css`, `options.js`: API-key settings.
- `tests/`: automated parser tests.
