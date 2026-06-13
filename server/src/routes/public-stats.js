import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { shortCodeSchema } from "../lib/links.js";
import { prisma } from "../lib/prisma.js";

const router = Router();
const reportCache = new Map();
const CACHE_TTL_MS = 30_000;
const MAX_CACHE_ENTRIES = 500;

router.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 30,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  }),
);

router.get("/stats/:shortCode", async (req, res, next) => {
  try {
    const { shortCode } = z
      .object({ shortCode: shortCodeSchema })
      .parse(req.params);
    const now = new Date();
    const link = await prisma.link.findFirst({
      where: {
        shortCode,
        publicStats: true,
        isDisabled: false,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: {
        id: true,
        shortCode: true,
        clickCount: true,
        createdAt: true,
        lastVisitedAt: true,
      },
    });
    if (!link) {
      return res.status(404).json({
        error: {
          code: "PUBLIC_STATS_NOT_FOUND",
          message: "Public statistics are not available for this link.",
          requestId: req.id,
        },
      });
    }

    const cached = reportCache.get(link.id);
    if (cached && cached.expiresAt > Date.now()) {
      return res.json({
        data: { link: serializeLink(link), ...cached.report },
      });
    }
    if (cached) reportCache.delete(link.id);

    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 29);
    since.setUTCHours(0, 0, 0, 0);
    const rows = await prisma.$queryRaw`
      SELECT DATE("visitedAt") AS "date", COUNT(*)::int AS "clicks"
      FROM "Visit"
      WHERE "linkId" = ${link.id} AND "visitedAt" >= ${since}
      GROUP BY DATE("visitedAt")
      ORDER BY DATE("visitedAt") ASC
    `;
    const report = { dailyClicks: fillDailyClicks(rows, 30) };
    setCachedReport(link.id, {
      report,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return res.json({ data: { link: serializeLink(link), ...report } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(404).json({
        error: {
          code: "PUBLIC_STATS_NOT_FOUND",
          message: "Public statistics are not available for this link.",
          requestId: req.id,
        },
      });
    }
    return next(error);
  }
});

const abuseSchema = z
  .object({
    reason: z.enum(["phishing", "malware", "spam", "other"]),
    details: z.string().trim().max(500).optional(),
  })
  .strict();

router.post(
  "/report/:shortCode",
  rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  }),
  async (req, res, next) => {
    try {
      const { shortCode } = z
        .object({ shortCode: shortCodeSchema })
        .parse(req.params);
      const input = abuseSchema.parse(req.body);
      const link = await prisma.link.findUnique({
        where: { shortCode },
        select: { id: true },
      });
      if (link) {
        await prisma.abuseReport.create({
          data: {
            linkId: link.id,
            reason: input.reason,
            details: input.details,
          },
        });
      }
      return res.status(202).json({ data: { received: true } });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(422).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Choose a valid report reason.",
            requestId: req.id,
          },
        });
      }
      return next(error);
    }
  },
);

function serializeLink(link) {
  return {
    shortCode: link.shortCode,
    clickCount: link.clickCount,
    createdAt: link.createdAt,
    lastVisitedAt: link.lastVisitedAt,
  };
}

function fillDailyClicks(rows, days) {
  const totals = new Map(
    rows.map((row) => [
      new Date(row.date).toISOString().slice(0, 10),
      Number(row.clicks),
    ]),
  );
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const result = [];
  for (let index = days - 1; index >= 0; index -= 1) {
    const day = new Date(today);
    day.setUTCDate(today.getUTCDate() - index);
    const date = day.toISOString().slice(0, 10);
    result.push({ date, clicks: totals.get(date) || 0 });
  }
  return result;
}

function setCachedReport(linkId, entry) {
  const now = Date.now();
  for (const [key, cached] of reportCache) {
    if (cached.expiresAt <= now) reportCache.delete(key);
  }
  if (reportCache.size >= MAX_CACHE_ENTRIES) {
    reportCache.delete(reportCache.keys().next().value);
  }
  reportCache.set(linkId, entry);
}

export default router;
