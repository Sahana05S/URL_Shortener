import { Router } from "express";
import rateLimit from "express-rate-limit";
import { prisma } from "../lib/prisma.js";

const router = Router();
const reportCache = new Map();
const CACHE_TTL_MS = 30_000;

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
    const now = new Date();
    const link = await prisma.link.findFirst({
      where: {
        shortCode: req.params.shortCode,
        publicStats: true,
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
    reportCache.set(link.id, {
      report,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return res.json({ data: { link: serializeLink(link), ...report } });
  } catch (error) {
    return next(error);
  }
});

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

export default router;
