import crypto from "node:crypto";
import { z } from "zod";

const alphabet =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const reservedCodes = new Set([
  "api",
  "app",
  "assets",
  "dashboard",
  "login",
  "logout",
  "signup",
  "stats",
  "health",
]);

export const aliasSchema = z
  .string()
  .trim()
  .min(3)
  .max(40)
  .regex(
    /^[a-zA-Z0-9](?:[a-zA-Z0-9_-]*[a-zA-Z0-9])?$/,
    "Use letters, numbers, hyphens, or underscores.",
  )
  .refine((value) => !reservedCodes.has(value.toLowerCase()), {
    message: "This alias is reserved.",
  })
  .transform((value) => value.toLowerCase());

export const destinationSchema = z
  .string()
  .trim()
  .max(4096)
  .url()
  .transform((value, context) => {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Only HTTP and HTTPS URLs are allowed.",
      });
      return z.NEVER;
    }
    if (url.username || url.password) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "URLs containing credentials are not allowed.",
      });
      return z.NEVER;
    }
    return url.toString();
  });

export function generateShortCode(length = 7) {
  let code = "";
  for (let index = 0; index < length; index += 1) {
    code += alphabet[crypto.randomInt(0, alphabet.length)];
  }
  return code;
}

export function isUniqueConstraintError(error) {
  return error?.code === "P2002";
}
