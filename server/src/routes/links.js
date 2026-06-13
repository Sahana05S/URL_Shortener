import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import {
  aliasSchema,
  destinationSchema,
  generateShortCode,
  isUniqueConstraintError,
} from "../lib/links.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);
const listLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  keyGenerator: (req) => req.user.id,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});
const mutationLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  keyGenerator: (req) => req.user.id,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

const expirySchema = z
  .union([z.string().datetime({ offset: true }), z.literal(""), z.null()])
  .refine(
    (value) => !value || new Date(value).getTime() > Date.now() + 30_000,
    "Expiry must be in the future.",
  );

const createLinkSchema = z
  .object({
    destinationUrl: destinationSchema,
    customAlias: z.union([aliasSchema, z.literal("")]).optional(),
    expiresAt: expirySchema.optional(),
    publicStats: z.boolean().optional().default(false),
  })
  .strict();

const updateLinkSchema = z
  .object({
    destinationUrl: destinationSchema.optional(),
    expiresAt: expirySchema.optional(),
    publicStats: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be updated.",
  });

const listLinksSchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  search: z.string().trim().max(200).default(""),
  sort: z.enum(["newest", "oldest", "clicks"]).default("newest"),
});

router.post("/", mutationLimiter, async (req, res, next) => {
  try {
    const input = createLinkSchema.parse(req.body);
    const requestedAlias = input.customAlias || null;
    const link = requestedAlias
      ? await createWithCode(input, requestedAlias, req.user.id)
      : await createGenerated(input, req.user.id);

    return res.status(201).json({ data: { link: serializeLink(link, req) } });
  } catch (error) {
    if (error instanceof z.ZodError) return validationError(error, req, res);
    if (isUniqueConstraintError(error)) {
      return res.status(409).json({
        error: {
          code: "ALIAS_UNAVAILABLE",
          message: "That custom alias is already in use.",
          requestId: req.id,
        },
      });
    }
    return next(error);
  }
});

router.get("/", listLimiter, async (req, res, next) => {
  try {
    const query = listLinksSchema.parse(req.query);
    const where = {
      userId: req.user.id,
      ...(query.search
        ? {
            OR: [
              {
                destinationUrl: {
                  contains: query.search,
                  mode: "insensitive",
                },
              },
              {
                shortCode: {
                  contains: query.search,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {}),
    };
    const orderBy =
      query.sort === "clicks"
        ? { clickCount: "desc" }
        : { createdAt: query.sort === "oldest" ? "asc" : "desc" };
    const [links, total] = await prisma.$transaction([
      prisma.link.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.link.count({ where }),
    ]);

    return res.json({
      data: {
        links: links.map((link) => serializeLink(link, req)),
        pagination: {
          page: query.page,
          pageSize: query.pageSize,
          total,
          totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) return validationError(error, req, res);
    return next(error);
  }
});

router.post("/check-alias", async (req, res, next) => {
  try {
    const { alias } = z.object({ alias: aliasSchema }).parse(req.body);
    const existing = await prisma.link.findUnique({
      where: { shortCode: alias },
      select: { id: true },
    });
    return res.json({ data: { available: !existing } });
  } catch (error) {
    if (error instanceof z.ZodError) return validationError(error, req, res);
    return next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const link = await prisma.link.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!link) return linkNotFound(req, res);
    return res.json({ data: { link: serializeLink(link, req) } });
  } catch (error) {
    return next(error);
  }
});

router.patch("/:id", mutationLimiter, async (req, res, next) => {
  try {
    const input = updateLinkSchema.parse(req.body);
    const data = {
      ...(input.destinationUrl !== undefined
        ? { destinationUrl: input.destinationUrl }
        : {}),
      ...(input.expiresAt !== undefined
        ? { expiresAt: input.expiresAt ? new Date(input.expiresAt) : null }
        : {}),
      ...(input.publicStats !== undefined
        ? { publicStats: input.publicStats }
        : {}),
    };
    const result = await prisma.link.updateMany({
      where: { id: req.params.id, userId: req.user.id },
      data,
    });
    if (result.count === 0) return linkNotFound(req, res);
    const link = await prisma.link.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    return res.json({ data: { link: serializeLink(link, req) } });
  } catch (error) {
    if (error instanceof z.ZodError) return validationError(error, req, res);
    return next(error);
  }
});

router.delete("/:id", mutationLimiter, async (req, res, next) => {
  try {
    const result = await prisma.link.deleteMany({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (result.count === 0) return linkNotFound(req, res);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

async function createGenerated(input, userId) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await createWithCode(input, generateShortCode(), userId);
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
    }
  }
  const error = new Error("Unable to generate a unique short link.");
  error.status = 503;
  error.code = "SHORT_CODE_EXHAUSTED";
  throw error;
}

function createWithCode(input, shortCode, userId) {
  return prisma.link.create({
    data: {
      destinationUrl: input.destinationUrl,
      shortCode,
      userId,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      publicStats: input.publicStats,
    },
  });
}

function serializeLink(link, _req) {
  return {
    ...link,
    shortUrl: `${env.PUBLIC_BASE_URL}/${link.shortCode}`,
  };
}

function validationError(error, req, res) {
  return res.status(422).json({
    error: {
      code: "VALIDATION_ERROR",
      message: "Please correct the highlighted fields.",
      fields: error.flatten().fieldErrors,
      requestId: req.id,
    },
  });
}

function linkNotFound(req, res) {
  return res.status(404).json({
    error: {
      code: "LINK_NOT_FOUND",
      message: "The link was not found.",
      requestId: req.id,
    },
  });
}

export default router;
