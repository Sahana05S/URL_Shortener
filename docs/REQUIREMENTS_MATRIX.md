# Problem Statement Requirements Matrix

This matrix maps the Katomaran PDF to implementation evidence. `Complete`
means the behavior exists in the repository and has local automated or visual
verification. `External` means completion depends on the final hosted service
or a human-recorded video.

## Mandatory Features

| Requirement                               | Status   | Evidence                                                        |
| ----------------------------------------- | -------- | --------------------------------------------------------------- |
| Signup and login                          | Complete | Auth REST routes, bcrypt, session tests, auth UI                |
| Protected dashboard                       | Complete | Database session middleware and route guards                    |
| Per-user link ownership                   | Complete | Ownership-scoped reads/updates/deletes/analytics and IDOR tests |
| Generate unique short URL                 | Complete | Random generator, collision retries, database uniqueness        |
| Server-side redirect                      | Complete | `GET /:shortCode` returns HTTP 302                              |
| Proper URL validation                     | Complete | Zod HTTP(S)-only schema and unsafe-scheme tests                 |
| View created links                        | Complete | Responsive dashboard table/cards with search and sorting        |
| Show destination, short URL, date, clicks | Complete | Dashboard link row and fixture screenshots                      |
| Delete link                               | Complete | Owner-scoped delete API and UI confirmation                     |
| Copy link                                 | Complete | Clipboard UI and Playwright verification                        |
| Count clicks                              | Complete | Transactional aggregate update                                  |
| Record visit timestamp                    | Complete | `Visit` database model and redirect transaction                 |
| Per-link analytics                        | Complete | Private analytics endpoint and page                             |
| Total, last visit, recent history         | Complete | Analytics API/UI and screenshot                                 |
| Responsive clean UI                       | Complete | White-first desktop/mobile layouts and visual evidence          |
| Loading, success, error states            | Complete | Skeletons, alerts, empty states, retry controls                 |
| Form validation messages                  | Complete | API field errors and accessible inline messages                 |

## Bonus Features

| Requirement                | Status   | Evidence                                                                                 |
| -------------------------- | -------- | ---------------------------------------------------------------------------------------- |
| Custom alias               | Complete | Validated normalized aliases and conflict handling                                       |
| QR generation              | Complete | Local PNG generation and download                                                        |
| Expiry date                | Complete | Future expiry validation and branded HTTP 410                                            |
| Geolocation/device/browser | Complete | Privacy-aware country, device, browser, and OS metadata                                  |
| Daily charts               | Complete | Lazy-loaded Recharts analytics                                                           |
| Public stats               | Complete | Owner-controlled aggregate-only public page                                              |
| Edit destination           | Complete | Owner-scoped strict PATCH allowlist and settings dialog                                  |
| CSV bulk shortening        | Complete | Preview, row validation, retry idempotency, safe export                                  |
| Live demo                  | External | Render blueprint and deployment guide are ready; final URL requires Render/Neon accounts |

## Technical Constraints

| Constraint                 | Status   | Evidence                                               |
| -------------------------- | -------- | ------------------------------------------------------ |
| React frontend             | Complete | React 19/Vite client                                   |
| Node.js backend            | Complete | Express 5 server                                       |
| PostgreSQL                 | Complete | Prisma PostgreSQL schema and migration                 |
| REST APIs                  | Complete | Documented JSON endpoints                              |
| Server redirect handling   | Complete | Express redirect route                                 |
| Environment variables      | Complete | Validated `.env.example`, HTTPS production enforcement |
| Hashed passwords           | Complete | bcrypt work factor 12                                  |
| Persist analytics          | Complete | `Visit` PostgreSQL model                               |
| Backend validation         | Complete | Zod schemas, limits, and strict allowlists             |
| No external shortener core | Complete | Local code generation and database resolution          |
| UI libraries documented    | Complete | README technology section                              |

## Evaluation Deliverables

| Deliverable                        | Status   | Evidence                                                         |
| ---------------------------------- | -------- | ---------------------------------------------------------------- |
| Planning document                  | Complete | `docs/AI_PLANNING.md`                                            |
| Feature documentation              | Complete | README and this matrix                                           |
| Setup instructions                 | Complete | README                                                           |
| Assumptions                        | Complete | README                                                           |
| Architecture diagram               | Complete | README and `docs/architecture.md`                                |
| AI workflow documentation          | Complete | `docs/AI_PLANNING.md`                                            |
| Required Katomaran line            | Complete | Final line of README                                             |
| UI images                          | Complete | Deterministic evidence screenshots under `docs/evidence/`        |
| Sanitized live logs and DB entries | External | Capture after Neon/Render deployment using `docs/DEMO_SCRIPT.md` |
| Loom/YouTube explanation           | External | Must be recorded and linked after deployment                     |
| GitHub repository                  | Complete | `https://github.com/Sahana05S/URL_Shortener`                     |
| Deployment and ZAP evidence        | External | Workflows/configuration ready; requires final HTTPS URL          |

## Verification Results

- ESLint: passed
- Prettier check: passed
- Client unit tests: 1 passed
- Server tests: 34 passed
- Playwright: 6 passed across desktop and mobile projects
- Production client build: passed
- `npm audit --audit-level=high`: zero known vulnerabilities
- Independent OWASP review: no critical or high findings after remediation
