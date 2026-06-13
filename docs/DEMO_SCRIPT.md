# Demonstration And Evidence Checklist

The problem statement says a submission without a Loom or YouTube explanation
will not be reviewed. Record the final deployed application, not only a local
build.

## Suggested 6–8 Minute Script

1. Introduce the architecture diagram and technology choices.
2. Show signup, logout, login, and a protected dashboard route.
3. Create a generated link and a custom alias.
4. Open the short URL and demonstrate the server-side redirect.
5. Show click total, last visit, recent visits, daily chart, browser, device,
   and country data.
6. Edit the destination, set expiry, and demonstrate the `410` page.
7. Download a QR code and open owner-enabled public statistics.
8. Preview and process a CSV import, including one invalid row.
9. Show responsive mobile layouts and loading/error states.
10. Show a sanitized database view, application logs, test output, dependency
    audit, and the ZAP workflow result.

## Evidence To Add Before Submission

Create `docs/evidence/` and add:

- `landing.png`
- `dashboard.png`
- `analytics.png`
- `mobile.png`
- `csv-import.png`
- `database.png` with passwords, tokens, connection strings, and visitor hashes
  hidden
- `security-checks.png`
- `demo-output.md` containing sanitized logs and representative database rows

Then replace the README video placeholder with the public Loom or YouTube URL.

Run `npm run evidence:capture` while the client is available at
`http://127.0.0.1:5173` to regenerate the landing, dashboard, and analytics
screenshots with deterministic, clearly labeled fixture data. Replace them
with deployed screenshots before final submission.

## Safe Log Example

```text
Linkora API listening on port 4000
GET /api/health 200 requestId=<redacted>
GET /demo-link 302 requestId=<redacted>
```

Never record `.env`, cookies, password hashes, session token hashes, database
credentials, or raw deployment secrets.
