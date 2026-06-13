import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import {
  createSessionToken,
  hashSessionToken,
  SESSION_COOKIE,
  SESSION_TTL_MS,
  sessionCookieOptions,
} from "../lib/session.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
const DUMMY_PASSWORD_HASH =
  "$2b$12$9QKmzWj9bLt13gRaM6ZP4eD2QpBqJc1pDQAZdM3A5yFH8wSrm/2sK";

function createAuthLimiter({ limit, keyGenerator }) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    keyGenerator,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: (req, res) => {
      logAuthEvent("auth.rate_limited", req);
      res.status(429).json({
        error: {
          code: "RATE_LIMITED",
          message: "Too many authentication attempts. Please try again later.",
          requestId: req.id,
        },
      });
    },
  });
}

const signupLimiter = createAuthLimiter({ limit: 10 });
const loginIpLimiter = createAuthLimiter({ limit: 20 });
const loginAccountLimiter = createAuthLimiter({
  limit: 10,
  keyGenerator: (req) =>
    crypto
      .createHmac(
        "sha256",
        process.env.SESSION_SECRET || "local-rate-limit-key",
      )
      .update(
        String(req.body?.email || "")
          .trim()
          .toLowerCase(),
      )
      .digest("hex"),
});

const signupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254).transform(normalizeEmail),
  password: z
    .string()
    .min(10)
    .max(128)
    .regex(/[a-z]/, "Password must include a lowercase letter.")
    .regex(/[A-Z]/, "Password must include an uppercase letter.")
    .regex(/[0-9]/, "Password must include a number."),
});

const loginSchema = z.object({
  email: z.string().trim().email().max(254).transform(normalizeEmail),
  password: z.string().min(1).max(128),
});

router.post("/signup", signupLimiter, async (req, res, next) => {
  try {
    const input = signupSchema.parse(req.body);
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });

    if (existingUser) {
      logAuthEvent("auth.signup_rejected", req);
      return res.status(409).json({
        error: {
          code: "ACCOUNT_UNAVAILABLE",
          message: "An account could not be created with these details.",
          requestId: req.id,
        },
      });
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await prisma.user.create({
      data: { name: input.name, email: input.email, passwordHash },
      select: { id: true, name: true, email: true, createdAt: true },
    });
    await establishSession(user.id, res);

    return res.status(201).json({ data: { user } });
  } catch (error) {
    return handleValidation(error, req, res, next);
  }
});

router.post(
  "/login",
  loginIpLimiter,
  loginAccountLimiter,
  async (req, res, next) => {
    try {
      const input = loginSchema.parse(req.body);
      const user = await prisma.user.findUnique({
        where: { email: input.email },
      });
      const matches = await bcrypt.compare(
        input.password,
        user?.passwordHash || DUMMY_PASSWORD_HASH,
      );

      if (!user || !matches) {
        logAuthEvent("auth.login_failed", req);
        return res.status(401).json({
          error: {
            code: "INVALID_CREDENTIALS",
            message: "The email or password is incorrect.",
            requestId: req.id,
          },
        });
      }

      await establishSession(user.id, res);
      return res.json({
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            createdAt: user.createdAt,
          },
        },
      });
    } catch (error) {
      return handleValidation(error, req, res, next);
    }
  },
);

router.post("/logout", requireAuth, async (req, res, next) => {
  try {
    await prisma.session.delete({ where: { id: req.session.id } });
    res.clearCookie(SESSION_COOKIE, { path: "/" });
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ data: { user: req.user } });
});

async function establishSession(userId, res) {
  const token = createSessionToken();
  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashSessionToken(token),
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      lastSeenAt: new Date(),
    },
  });
  res.cookie(SESSION_COOKIE, token, sessionCookieOptions());
}

function logAuthEvent(event, req) {
  console.warn(
    JSON.stringify({
      event,
      requestId: req.id,
      timestamp: new Date().toISOString(),
    }),
  );
}

function normalizeEmail(email) {
  return email.toLowerCase();
}

function handleValidation(error, req, res, next) {
  if (!(error instanceof z.ZodError)) return next(error);
  return res.status(422).json({
    error: {
      code: "VALIDATION_ERROR",
      message: "Please correct the highlighted fields.",
      fields: error.flatten().fieldErrors,
      requestId: req.id,
    },
  });
}

export default router;
