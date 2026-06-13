import { prisma } from "../lib/prisma.js";
import {
  hashSessionToken,
  SESSION_COOKIE,
  SESSION_IDLE_MS,
} from "../lib/session.js";

export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies[SESSION_COOKIE];
    if (!token) return unauthorized(res, req.id);

    const session = await prisma.session.findUnique({
      where: { tokenHash: hashSessionToken(token) },
      include: {
        user: {
          select: { id: true, name: true, email: true, createdAt: true },
        },
      },
    });

    const now = new Date();
    const isIdle =
      session && now.getTime() - session.lastSeenAt.getTime() > SESSION_IDLE_MS;
    if (!session || session.expiresAt <= now || isIdle) {
      if (session) {
        await prisma.session.delete({ where: { id: session.id } });
      }
      res.clearCookie(SESSION_COOKIE, { path: "/" });
      return unauthorized(res, req.id);
    }

    if (now.getTime() - session.lastSeenAt.getTime() > 5 * 60 * 1000) {
      await prisma.session.update({
        where: { id: session.id },
        data: { lastSeenAt: now },
      });
    }

    req.user = session.user;
    req.session = { id: session.id };
    return next();
  } catch (error) {
    return next(error);
  }
}

function unauthorized(res, requestId) {
  return res.status(401).json({
    error: {
      code: "AUTHENTICATION_REQUIRED",
      message: "Authentication is required.",
      requestId,
    },
  });
}
