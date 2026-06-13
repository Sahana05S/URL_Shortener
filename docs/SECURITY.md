# Security Baseline

## Standard

Linkora targets OWASP ASVS 5.0 Level 1 and explicitly tests applicable risks
from the OWASP Top 10:2025. This is a verification target, not a claim of
absolute invulnerability.

## Initial Threat Model

Protected assets include account credentials, link ownership, private
analytics, destination integrity, session tokens, and configuration secrets.
Likely attackers include anonymous abusive clients and authenticated users
attempting to access another account's resources.

Primary trust boundaries are the browser/API boundary, API/database boundary,
deployment proxy, CSV upload parser, and outbound redirect boundary.

## Controls

| OWASP category            | Planned controls                                              |
| ------------------------- | ------------------------------------------------------------- |
| Broken Access Control     | Deny by default, ownership-scoped queries, IDOR tests         |
| Security Misconfiguration | Helmet, CSP, strict CORS, safe errors, environment validation |
| Supply Chain Failures     | Lockfile, dependency audit, Dependabot, minimal packages      |
| Cryptographic Failures    | bcrypt, TLS, strong independent secrets, secure cookies       |
| Injection                 | Zod validation, Prisma parameterization, React escaping       |
| Insecure Design           | Threat model, abuse limits, private-by-default analytics      |
| Authentication Failures   | Rate limiting, generic errors, session rotation               |
| Integrity Failures        | Server validation, protected CI, reviewed migrations          |
| Logging Failures          | Request IDs, redaction, structured security events            |
| Exceptional Conditions    | Central error handling, rollback, safe fallbacks              |

## Release Gate

Deployment is blocked by unresolved critical or high findings from dependency
audits, static review, authorization tests, or OWASP ZAP.

## Review Log

### Module 2: Authentication

- Independent security-agent review completed.
- No critical or high findings.
- Account timing behavior, session idle expiry, origin validation, production
  secret enforcement, cookie naming, and security event logging were hardened
  before commit.
- Authentication uses separate IP and normalized-account throttles. Their state
  is process-local because the planned Render deployment runs one instance;
  move the limiter to a shared store before horizontal scaling.

### Module 3: Link Management And Redirects

- Independent security-agent review completed.
- Ownership-scoped reads and deletes showed no IDOR defect; destination output
  remains React-escaped and Prisma-parameterized.
- Reserved static namespaces, bounded pagination, canonical short URL
  generation, destination defense-in-depth, referrer minimization, and
  redirect write-amplification controls were added before commit.
- Redirects continue when a single client exceeds the analytics write limit,
  but excess requests are intentionally not recorded.

### Analytics Privacy Defaults

- Raw IP addresses are never stored.
- Daily visitor pseudonyms are HMAC-protected and scoped to a single link.
- Geolocation headers are ignored unless `TRUST_GEO_HEADERS=true` is explicitly
  set behind an edge proxy that strips visitor-supplied versions.
- City-level location is not retained; country is the maximum precision.
- Visits older than 180 days are removed opportunistically during analytics
  requests.
