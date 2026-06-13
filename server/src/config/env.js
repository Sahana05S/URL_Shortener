import "dotenv/config";
import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: z.coerce.number().int().positive().default(4000),
    APP_ORIGIN: z.string().url().default("http://localhost:5173"),
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
  })
  .superRefine((values, context) => {
    if (values.NODE_ENV !== "production") return;
    const forbidden = [
      ["DATABASE_URL", "postgresql://user:password@localhost:5432/linkora"],
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
