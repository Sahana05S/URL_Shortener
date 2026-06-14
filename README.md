# Linkora

Linkora is a full-stack URL shortener for creating, managing, and measuring
short links from one clean workspace. It combines branded aliases, QR codes,
expiry controls, bulk CSV imports, and privacy-aware traffic analytics in a
responsive white-first interface.

[Open the live application](https://linkora-i208.onrender.com)

> The free Render service may take up to a minute to wake after a period of
> inactivity.

## Product Preview

### Landing page

![Linkora landing page](docs/evidence/landing.png)

### Link dashboard

![Linkora dashboard](docs/evidence/dashboard.png)

### Traffic analytics

![Linkora analytics dashboard](docs/evidence/analytics.png)

### Responsive layout

![Linkora mobile interface](docs/evidence/mobile.png)

## What You Can Do

### Accounts and access

- Create an account, sign in, sign out, and restore an active session.
- Keep the dashboard, links, and analytics private to their owner.
- Use secure, revocable, database-backed sessions across browser visits.

### Short links

- Turn any valid HTTP or HTTPS destination into a short URL.
- Let Linkora generate a unique code or choose a memorable custom alias.
- Copy, open, search, sort, edit, and delete links from the dashboard.
- Redirect visitors from the short URL through the Express server.
- Disable expired links automatically and show a friendly expiration page.

### QR codes and public statistics

- Generate a QR code for every short link.
- Download the QR code as a PNG for sharing or print.
- Make aggregate statistics public on a link-by-link basis.
- Keep public statistics disabled by default.

### Analytics

- Track total clicks, the most recent visit, and approximate daily visitors.
- Explore traffic over selectable time periods.
- Review daily click trends in a chart.
- Break traffic down by device type, browser, and approximate country.
- Inspect recent visits without storing raw visitor IP addresses.

### Bulk shortening

- Upload as many as 100 links in a CSV file of up to 1 MB.
- Preview and validate every row before creating links.
- Import valid rows even when another row needs correction.
- Add custom aliases, expiration dates, and public-statistics preferences.
- Retry processing safely without duplicating already imported rows.
- Download the included [sample CSV](samples/linkora-test-import.csv).

The required CSV columns are:

```csv
original_url,custom_alias,expires_at,public_stats
https://example.com/docs,my-docs,2027-12-31T23:59:59Z,true
```

## Using the Live Version

1. Open [Linkora on Render](https://linkora-i208.onrender.com).
2. Select **Start free** and create an account, or select **Log in**.
3. Choose **Create link** from the dashboard.
4. Enter a destination URL and optionally configure an alias, expiry date, and
   public statistics.
5. Copy or open the resulting short URL.
6. Open the analytics icon beside a link to review its traffic.
7. Open the edit icon to change its destination, expiry, public access, or
   download its QR code.
8. Use **Bulk import** to validate and create links from a CSV file.

Accounts and links created on the deployed application are stored in its Neon
PostgreSQL database. Do not use real passwords that you also use elsewhere.

## Technology

| Layer               | Technology                                     |
| ------------------- | ---------------------------------------------- |
| Frontend            | React 19, Vite, React Router, Recharts, Lucide |
| Backend             | Node.js 22, Express 5, Zod                     |
| Database            | PostgreSQL, Prisma ORM                         |
| Hosting             | Render web service and Neon PostgreSQL         |
| Testing             | Vitest, Testing Library, Supertest, Playwright |
| Security automation | CodeQL, Dependabot, npm audit, OWASP ZAP       |

## Architecture

```mermaid
flowchart LR
  Browser -->|Pages and REST requests| Express[Express server]
  Express --> React[Compiled React application]
  Express -->|Prisma queries| Postgres[(PostgreSQL)]
  Browser -->|Short URL| Express
  Express -->|HTTP 302| Destination[Destination website]
```

During local development, Vite serves React on port `5173` and proxies API
requests to Express on port `4000`. In production, Express serves the compiled
React application, REST API, and short-link redirects from one HTTPS origin.

## Run Locally

### Prerequisites

- Node.js 22 or newer
- npm
- A PostgreSQL database

The simplest database option is a free
[Neon PostgreSQL](https://neon.tech/) project. Copy its pooled connection
string after creating the project.

### 1. Clone and install

```bash
git clone https://github.com/Sahana05S/URL_Shortener.git
cd URL_Shortener
npm install
```

Windows PowerShell may block `npm.ps1`. In that case, use `npm.cmd` for every
npm command:

```powershell
npm.cmd install
```

### 2. Create the environment file

Copy the example file:

```powershell
Copy-Item .env.example .env
```

On macOS or Linux:

```bash
cp .env.example .env
```

Configure `.env`:

```dotenv
NODE_ENV=development
PORT=4000
APP_ORIGIN=http://localhost:5173
PUBLIC_BASE_URL=http://localhost:4000
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"
SESSION_SECRET="a-random-secret-containing-at-least-32-characters"
IP_HASH_SECRET="a-different-random-secret-containing-at-least-32-characters"
TRUST_GEO_HEADERS=false
DEMO_NAME=Demo User
DEMO_EMAIL=demo@example.com
DEMO_PASSWORD="choose-a-strong-demo-password"
```

Generate each secret separately with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Never commit `.env` or publish its database credentials and secrets.

### 3. Prepare the database

```powershell
npm.cmd run db:generate
npm.cmd run db:migrate
```

Optionally create the configured demonstration user and sample data:

```powershell
npm.cmd run db:seed
```

The seed writes to the database identified by `DATABASE_URL`. If local and
deployed environments use the same Neon database, the demo account will be
available in both.

### 4. Start the application

```powershell
npm.cmd run dev
```

Open:

- Website: <http://localhost:5173>
- API health check: <http://localhost:4000/api/health>

Keep the terminal open while using the application. Press `Ctrl+C` to stop
both development servers.

## Environment Variables

| Variable            | Purpose                                                    |
| ------------------- | ---------------------------------------------------------- |
| `NODE_ENV`          | Selects development, test, or production behavior          |
| `PORT`              | Express server port; defaults to `4000`                    |
| `APP_ORIGIN`        | Browser origin allowed to make authenticated API requests  |
| `PUBLIC_BASE_URL`   | Base address used when Linkora creates short URLs          |
| `DATABASE_URL`      | PostgreSQL connection string used by Prisma                |
| `SESSION_SECRET`    | Secret material for authentication session protection      |
| `IP_HASH_SECRET`    | Separate secret used for privacy-aware visitor identifiers |
| `TRUST_GEO_HEADERS` | Enables trusted edge-provided geographic headers           |
| `DEMO_*`            | Optional values used only by the database seed command     |

Local values belong in `.env`. Hosted values belong in the hosting provider's
environment-variable dashboard. Render does not read the `.env` file stored on
your computer.

## Useful Commands

| Command                  | Purpose                                                        |
| ------------------------ | -------------------------------------------------------------- |
| `npm run dev`            | Start the React and Express development servers                |
| `npm run check`          | Run ESLint, all unit/integration tests, and a production build |
| `npm run security:check` | Audit dependencies and run server security tests               |
| `npm run test:e2e`       | Run desktop and mobile Playwright browser tests                |
| `npm run build`          | Compile the React production application                       |
| `npm start`              | Start the production Express server                            |
| `npm run db:generate`    | Generate Prisma Client                                         |
| `npm run db:migrate`     | Create or apply development migrations                         |
| `npm run db:deploy`      | Apply committed migrations in production                       |
| `npm run db:seed`        | Create optional demonstration data                             |

Use the corresponding `npm.cmd` form on Windows when PowerShell script
execution is disabled.

## Deploy Your Own Copy

The repository includes [render.yaml](render.yaml), so it can be deployed as a
Render Blueprint.

1. Fork or clone this repository to your GitHub account.
2. Create a Neon PostgreSQL project and copy its pooled connection string.
3. In Render, choose **New**, then **Blueprint**.
4. Connect the GitHub repository and allow Render to read `render.yaml`.
5. Configure `DATABASE_URL` with the Neon connection string.
6. Initially set `APP_ORIGIN` and `PUBLIC_BASE_URL` to the expected Render
   HTTPS address.
7. Deploy the Blueprint.
8. After Render assigns the final URL, set both variables to that exact origin,
   for example `https://your-service.onrender.com`, and save the changes.
9. Verify `https://your-service.onrender.com/api/health`.

Render installs dependencies, runs linting and tests, builds React, applies
Prisma migrations, and starts Express. Free Render services sleep after
inactivity, so the first request may be delayed.

See [the deployment guide](docs/DEPLOYMENT.md) for production verification.

## Security

Linkora includes layered controls based on applicable OWASP guidance:

- Password hashing with bcrypt
- Revocable server-side sessions and secure production cookies
- Origin validation for authenticated API requests
- Ownership checks on links and analytics
- Zod validation and Prisma parameterized database access
- Authentication, link-creation, and bulk-import rate limits
- Helmet security headers and a restrictive Content Security Policy
- Bounded request bodies, CSV sizes, row counts, and analytics retention
- Separate session and analytics secrets
- No storage of raw visitor IP addresses
- Dependency auditing, CodeQL, and an on-demand OWASP ZAP workflow

Security controls reduce known risks but do not guarantee that any application
is invulnerable. See [SECURITY.md](docs/SECURITY.md) for the threat model and
review notes.

## Testing

Run the complete local verification suite:

```powershell
npm.cmd run check
npm.cmd run security:check
```

The repository also runs CI, browser tests, and CodeQL through GitHub Actions.

## Additional Documentation

- [Architecture](docs/architecture.md)
- [REST API](docs/API.md)
- [Security model](docs/SECURITY.md)
- [OWASP ASVS checklist](docs/ASVS_CHECKLIST.md)
- [Render and Neon deployment](docs/DEPLOYMENT.md)
