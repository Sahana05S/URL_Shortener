import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { requireTrustedOrigin } from "./middleware/origin.js";
import authRouter from "./routes/auth.js";
import analyticsRouter from "./routes/analytics.js";
import linksRouter from "./routes/links.js";
import redirectRouter from "./routes/redirect.js";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(currentDirectory, "../../client/dist");

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", env.NODE_ENV === "production" ? 1 : false);
  app.use((req, res, next) => {
    req.id = req.get("x-request-id") || crypto.randomUUID();
    res.setHeader("x-request-id", req.id);
    next();
  });
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          "script-src": ["'self'"],
          "style-src": ["'self'", "https://fonts.googleapis.com"],
          "font-src": ["'self'", "https://fonts.gstatic.com"],
          "img-src": ["'self'", "data:"],
        },
      },
      crossOriginResourcePolicy: { policy: "same-site" },
    }),
  );
  app.use(cors({ origin: env.APP_ORIGIN, credentials: true }));
  app.use(compression());
  app.use(cookieParser());
  app.use(express.json({ limit: "100kb" }));
  app.use("/api", requireTrustedOrigin);

  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "linkora-api",
      timestamp: new Date().toISOString(),
    });
  });
  app.use("/api/auth", authRouter);
  app.use("/api/links", linksRouter);
  app.use("/api/links", analyticsRouter);

  if (env.NODE_ENV === "production") {
    app.use(express.static(clientDist, { index: false }));
    app.get(
      ["/", "/login", "/signup", "/dashboard", "/stats/:shortCode"],
      (_req, res) => res.sendFile(path.join(clientDist, "index.html")),
    );
  }

  app.use(redirectRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
