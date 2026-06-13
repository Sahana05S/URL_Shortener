import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { aggregateDaily, aggregateField } from "../lib/analytics.js";
import { linkIdSchema } from "../lib/links.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);
router.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 30,
    keyGenerator: (req) => req.user.id,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  }),
);

const querySchema = z.object({
  days: z.coerce.number().int().min(7).max(90).default(30),
});
const paramsSchema = z.object({ id: linkIdSchema });

router.get("/:id/analytics", async (req, res, next) => {
  try {
    const { days } = querySchema.parse(req.query);
    const { id } = paramsSchema.parse(req.params);
    const link = await prisma.link.findFirst({
      where: { id, userId: req.user.id },
    });
    if (!link) {
      return res.status(404).json({
        error: {
          code: "LINK_NOT_FOUND",
          message: "The link was not found.",
          requestId: req.id,
        },
      });
    }

    const since = new Date();
    since.setUTCDate(since.getUTCDate() - (days - 1));
    since.setUTCHours(0, 0, 0, 0);

    const [periodVisits, recentVisits] = await Promise.all([
      prisma.visit.findMany({
        where: { linkId: link.id, visitedAt: { gte: since } },
        orderBy: { visitedAt: "asc" },
        take: 5_000,
        select: {
          visitedAt: true,
          visitorHash: true,
          deviceType: true,
          browser: true,
          country: true,
        },
      }),
      prisma.visit.findMany({
        where: { linkId: link.id },
        orderBy: { visitedAt: "desc" },
        take: 20,
        select: {
          id: true,
          visitedAt: true,
          country: true,
          city: true,
          deviceType: true,
          browser: true,
          os: true,
          referrer: true,
        },
      }),
    ]);

    return res.json({
      data: {
        link: {
          id: link.id,
          shortCode: link.shortCode,
          destinationUrl: link.destinationUrl,
          clickCount: link.clickCount,
          lastVisitedAt: link.lastVisitedAt,
          createdAt: link.createdAt,
        },
        period: { days, from: since.toISOString() },
        dailyClicks: aggregateDaily(periodVisits, days),
        devices: aggregateField(periodVisits, "deviceType"),
        browsers: aggregateField(periodVisits, "browser"),
        countries: aggregateField(periodVisits, "country"),
        approximateDailyVisitors: new Set(
          periodVisits.map((visit) => visit.visitorHash).filter(Boolean),
        ).size,
        recentVisits,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(422).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "The analytics range is invalid.",
          requestId: req.id,
        },
      });
    }
    return next(error);
  }
});

export default router;
