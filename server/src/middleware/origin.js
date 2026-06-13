import { env } from "../config/env.js";

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

export function requireTrustedOrigin(req, res, next) {
  if (safeMethods.has(req.method)) return next();
  const origin = req.get("origin");
  if (!origin || origin === env.APP_ORIGIN) return next();

  return res.status(403).json({
    error: {
      code: "UNTRUSTED_ORIGIN",
      message: "The request origin is not allowed.",
      requestId: req.id,
    },
  });
}
