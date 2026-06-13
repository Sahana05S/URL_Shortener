# AI-Assisted Planning

## Goal

Build a polished, explainable URL shortener that satisfies every mandatory and
bonus requirement in the Katomaran problem statement.

## Delivery Modules

1. Foundation, design system, CI, and documentation
2. PostgreSQL schema and secure authentication
3. Core shortening, redirects, ownership, and link management
4. Visit collection and analytics dashboards
5. QR codes, expiry, public statistics, and destination editing
6. CSV bulk shortening
7. Landing page, accessibility, and responsive polish
8. OWASP hardening and independent security review
9. Automated quality and dynamic security testing
10. Deployment, evidence, and demonstration video

Each module must pass its relevant quality and security checks before receiving
a focused commit and push to `main`.

## Product Decisions

- Use a white-first interface with `#5D1C6A`, `#CA5995`, `#FFB090`, and
  `#FFF1D3` for branding and emphasis.
- Use a single-origin production deployment to simplify cookies, CORS, and
  evaluator setup.
- Use PostgreSQL constraints as the final authority for uniqueness and
  ownership-safe database queries for authorization.
- Avoid retaining raw IP addresses in analytics.
- Use original content and assets while taking layout inspiration from
  Rebrandly.

## AI Workflow

AI assistance is used for planning, implementation, test generation, security
review, and documentation. Every generated change is inspected, run locally,
and retained only when it can be explained and verified.

