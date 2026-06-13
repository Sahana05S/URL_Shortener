import { Router } from "express";
import rateLimit from "express-rate-limit";
import { getVisitMetadata } from "../lib/analytics.js";
import { destinationSchema } from "../lib/links.js";
import { prisma } from "../lib/prisma.js";

const router = Router();
const analyticsWriteLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: false,
  legacyHeaders: false,
  handler: (req, _res, next) => {
    req.skipAnalytics = true;
    next();
  },
});

router.get("/:shortCode", analyticsWriteLimiter, async (req, res, next) => {
  try {
    const link = await prisma.link.findUnique({
      where: { shortCode: req.params.shortCode },
    });

    if (!link) {
      return res.status(404).send(renderStatusPage("Link not found", "404"));
    }
    if (link.expiresAt && link.expiresAt <= new Date()) {
      return res
        .status(410)
        .send(renderStatusPage("This short link has expired", "410"));
    }

    const destination = destinationSchema.safeParse(link.destinationUrl);
    if (!destination.success) {
      const error = new Error("Stored link destination is invalid.");
      error.code = "INVALID_STORED_DESTINATION";
      throw error;
    }

    if (!req.skipAnalytics) {
      const now = new Date();
      const metadata = getVisitMetadata(req, link.id, now);
      await prisma.$transaction([
        prisma.link.update({
          where: { id: link.id },
          data: { clickCount: { increment: 1 }, lastVisitedAt: now },
        }),
        prisma.visit.create({
          data: {
            linkId: link.id,
            visitedAt: now,
            referrer: cleanReferrer(req.get("referer")),
            ...metadata,
          },
        }),
      ]);
    }

    res.setHeader("cache-control", "no-store");
    return res.redirect(302, destination.data);
  } catch (error) {
    return next(error);
  }
});

function cleanReferrer(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url.hostname.slice(0, 253);
  } catch {
    return null;
  }
}

function renderStatusPage(message, code) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${code} | Linkora</title>
    <style>
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: system-ui, sans-serif; color: #342d36; background: #fff; }
      main { width: min(520px, calc(100% - 40px)); text-align: center; }
      strong { color: #ca5995; font-size: 14px; letter-spacing: .12em; }
      h1 { color: #5d1c6a; font-size: clamp(36px, 8vw, 58px); line-height: 1.05; }
      a { display: inline-block; margin-top: 18px; border-radius: 10px; padding: 13px 20px; color: #fff; background: #5d1c6a; text-decoration: none; font-weight: 700; }
    </style>
  </head>
  <body><main><strong>${code}</strong><h1>${message}</h1><p>The address may be incorrect or no longer available.</p><a href="/">Go to Linkora</a></main></body>
</html>`;
}

export default router;
