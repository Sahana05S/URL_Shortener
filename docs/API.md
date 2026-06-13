# REST API

All JSON endpoints return successful payloads under `data` and errors under
`error`. Error objects contain a stable `code`, safe `message`, and `requestId`.
Private endpoints use the HTTP-only `linkora_session` cookie.

## Authentication

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/auth/signup` | Create an account and session |
| POST | `/api/auth/login` | Start a database-backed session |
| POST | `/api/auth/logout` | Delete the active session |
| GET | `/api/auth/me` | Restore the authenticated user |

## Links

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/links` | Create a generated or custom short link |
| GET | `/api/links` | Search, sort, and paginate owned links |
| POST | `/api/links/check-alias` | Check custom alias availability |
| GET | `/api/links/:id` | Read one owned link |
| PATCH | `/api/links/:id` | Edit destination, expiry, or public sharing |
| DELETE | `/api/links/:id` | Delete an owned link and its visits |
| GET | `/api/links/:id/analytics` | Read private analytics |
| POST | `/api/links/bulk` | Preview or process a CSV import |

## Public Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Deployment health check |
| GET | `/api/public/stats/:shortCode` | Aggregate owner-enabled statistics |
| GET | `/:shortCode` | Track a click and return an HTTP 302 redirect |

## CSV Contract

The header order is strict:

```csv
original_url,custom_alias,expires_at,public_stats
```

`expires_at` accepts an ISO 8601 timestamp with an offset. `public_stats`
accepts `true`, `false`, `yes`, `no`, `1`, or `0`. Imports allow one file,
1 MB, and 100 rows.

