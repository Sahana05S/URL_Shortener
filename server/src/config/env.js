import "dotenv/config";
import { z } from "zod";

const originSchema = z
  .string()
  .url()
  .transform((value, context) => {
    const url = new URL(value);
    if (
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Must be an origin without credentials, path, query, or fragment.",
      });
      return z.NEVER;
    }
    return url.origin;
  });

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: z.coerce.number().int().positive().default(4000),
    APP_ORIGIN: originSchema.default("http://localhost:5173"),
    PUBLIC_BASE_URL: originSchema.default("http://localhost:4000"),
    DATABASE_URL: z
      .string()
      .min(1)
      .default("postgresql://user:password@localhost:5432/linkora"),
    SESSION_SECRET: z
      .string()
      .min(32)
      .default("development-session-secret-change-me"),
    IP_HASH_SECRET: z
      .string()
      .min(32)
      .default("development-analytics-secret-change"),
    TRUST_GEO_HEADERS: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
  })
  .superRefine((values, context) => {
    if (values.NODE_ENV !== "production") return;
    const forbidden = [
      ["DATABASE_URL", "postgresql://user:password@localhost:5432/linkora"],
      ["APP_ORIGIN", "http://localhost:5173"],
      ["PUBLIC_BASE_URL", "http://localhost:4000"],
      ["SESSION_SECRET", "development-session-secret-change-me"],
      ["IP_HASH_SECRET", "development-analytics-secret-change"],
    ];
    for (const [field, placeholder] of forbidden) {
      if (values[field] === placeholder) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${field} must be explicitly configured in production.`,
          path: [field],
        });
      }
    }
    for (const field of ["APP_ORIGIN", "PUBLIC_BASE_URL"]) {
      if (new URL(values[field]).protocol !== "https:") {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${field} must use HTTPS in production.`,
          path: [field],
        });
      }
    }
    if (values.SESSION_SECRET === values.IP_HASH_SECRET) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "SESSION_SECRET and IP_HASH_SECRET must be different.",
        path: ["IP_HASH_SECRET"],
      });
    }
  });

export function parseEnv(values) {
  return envSchema.parse(values);
}

export const env = parseEnv(process.env);
