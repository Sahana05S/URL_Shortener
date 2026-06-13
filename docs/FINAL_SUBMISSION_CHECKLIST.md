# Final Submission Checklist

The repository implementation is complete. These steps require the owner's
Render, Neon, Google Form, and recording accounts.

## Deploy

1. Create a free Neon PostgreSQL project.
2. Open the README **Deploy to Render** button.
3. Enter the Neon pooled `DATABASE_URL`.
4. Enter the resulting Render HTTPS origin for both `APP_ORIGIN` and
   `PUBLIC_BASE_URL`.
5. Use separate generated values for `SESSION_SECRET` and `IP_HASH_SECRET`.
6. Wait for migrations, tests, build, and startup to finish.
7. Replace the README live-application placeholder with the Render URL.

## Verify

1. Run the production checks in `docs/DEPLOYMENT.md`.
2. Trigger the **OWASP ZAP Baseline** GitHub workflow with the Render URL.
3. Resolve any critical/high results and retain a screenshot of the green run.
4. Capture deployed CSV, database, logs, and security evidence according to
   `docs/DEMO_SCRIPT.md`.
5. Keep all secrets, password/session hashes, and visitor hashes hidden.

## Record And Submit

1. Record the Loom/YouTube walkthrough using `docs/DEMO_SCRIPT.md`.
2. Put its public URL in the README.
3. Run:

```bash
npm run submission:check
```

4. Commit and push the completed URLs and evidence.
5. Submit the GitHub repository once in the provided Google Form before the
   stated deadline.

Do not submit while `npm run submission:check` reports missing artifacts.
