# OWASP ASVS 5.0 Verification Checklist

This checklist records the controls applicable to Linkora's current feature
set. A checked item has an implementation and automated or documented
verification path. Deployment-dependent checks must be repeated against the
live Render service.

## Architecture And Threat Model

- [x] Trust boundaries and protected assets are documented.
- [x] Security-sensitive components use deny-by-default behavior.
- [x] Public analytics collect only the minimum data needed.
- [x] Abuse limits exist for authentication, link writes, redirects, analytics,
      public reports, and imports.

## Authentication And Sessions

- [x] Passwords use bcrypt with work factor 12.
- [x] Login errors do not identify which credential failed.
- [x] Unknown-account login performs a dummy password comparison.
- [x] Session tokens are random, stored as keyed hashes, and sent only in
      HTTP-only cookies.
- [x] Production cookies use `Secure`, `SameSite=Lax`, path `/`, and the
      `__Host-` prefix.
- [x] Sessions have 30-minute idle and seven-day absolute expiry.
- [x] Logout deletes the database session.
- [x] Authentication attempts are throttled and security events are redacted.

## Access Control

- [x] Every private endpoint requires a valid database session.
- [x] Link reads, updates, deletes, and analytics include `userId` in the
      database predicate.
- [x] Missing and unauthorized resources return the same response.
- [x] Public statistics require an explicit owner-controlled flag.
- [x] Public reports exclude visitor-level records and rare categories.

## Input And Output

- [x] Security-relevant bodies, query values, and identifiers are bounded and
      schema validated; multipart files are additionally constrained by Multer.
- [x] Destination URLs allow HTTP(S) only and reject embedded credentials.
- [x] Aliases use a constrained grammar and reserved namespace list.
- [x] Prisma parameterizes ordinary database operations.
- [x] Public-report SQL uses Prisma's tagged parameterized query API.
- [x] React escapes displayed values.
- [x] CSV parsing uses a maintained parser with file, row, and record limits.
- [x] Downloaded CSV fields neutralize spreadsheet formulas.

## Configuration And Operations

- [x] Production refuses placeholder database URLs and secrets.
- [x] Helmet supplies CSP and other browser security headers.
- [x] CORS accepts only the configured application origin.
- [x] Browser unsafe API requests reject mismatched origins; origin-less
      non-browser API clients remain supported.
- [x] Framework identity and production stack traces are hidden.
- [x] Request IDs accompany responses and server errors.
- [x] Dependency audit and CodeQL run in CI.
- [x] Dependabot monitors packages and GitHub Actions.
- [ ] Run the ZAP baseline workflow against the final HTTPS deployment.
- [ ] Review Render and Neon production logs after the demo smoke test.

## Data Protection

- [x] Raw IP addresses are never stored.
- [x] Visitor pseudonyms use an independent HMAC secret and link scope.
- [x] Geolocation headers are opt-in behind a trusted edge.
- [x] City-level data is not retained.
- [x] A non-overlapping scheduled maintenance task deletes visits older than
      180 days in bounded indexed batches.
- [x] Secrets and environment files are excluded from Git.
