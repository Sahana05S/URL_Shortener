# Render And Neon Deployment

## 1. Create PostgreSQL

1. Create a Neon project and copy its pooled PostgreSQL connection string.
2. Keep SSL enabled in the connection string.
3. Do not run the demo seed against production unless a reviewer account is
   intentionally required.

## 2. Create The Render Service

1. Connect the GitHub repository to Render.
2. Create a Blueprint from `render.yaml`, or create one Node web service.
3. Use the repository root as the root directory.
4. Configure these values:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Neon pooled connection string |
| `APP_ORIGIN` | Final Render HTTPS origin |
| `PUBLIC_BASE_URL` | Final Render HTTPS origin |
| `SESSION_SECRET` | At least 32 random characters |
| `IP_HASH_SECRET` | A different 32+ character random value |
| `TRUST_GEO_HEADERS` | `false` unless a trusted edge overwrites geo headers |

The service runs migrations before starting and exposes `/api/health`.

## 3. Production Verification

1. Confirm the health endpoint returns `status: "ok"`.
2. Create two users and verify neither can access the other's link IDs.
3. Create and open a short link, then confirm its click appears in analytics.
4. Verify expiry, QR download, edit, public stats, and CSV import.
5. Run the GitHub **OWASP ZAP Baseline** workflow with the Render URL.
6. Review Render logs for stack traces, secrets, raw IP addresses, and errors.
7. Confirm the browser cookie is `Secure`, `HttpOnly`, `SameSite=Lax`, and
   prefixed `__Host-`.

## Free-Tier Note

Render free services can sleep when idle. Open the demo URL before recording
and before an interview demonstration so the service has time to wake.

