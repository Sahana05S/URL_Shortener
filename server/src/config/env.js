import "dotenv/config";
import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: z.coerce.number().int().positive().default(4000),
    APP_ORIGIN: z.string().url().default("http://localhost:5173"),
    PUBLIC_BASE_URL: z.string().url().default("http://localhost:4000"),
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
  });

export const env = envSchema.parse(process.env);
