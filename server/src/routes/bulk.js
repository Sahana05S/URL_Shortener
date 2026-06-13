import { parse } from "csv-parse/sync";
import crypto from "node:crypto";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import multer from "multer";
import { z } from "zod";
import { env } from "../config/env.js";
import {
  aliasSchema,
  destinationSchema,
  generateShortCode,
  isUniqueConstraintError,
} from "../lib/links.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);
router.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    keyGenerator: (req) => req.user.id,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  }),
);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const allowed = new Set([
      "text/csv",
      "application/csv",
      "application/vnd.ms-excel",
      "text/plain",
    ]);
    callback(
      allowed.has(file.mimetype)
        ? null
        : new Error("Only CSV files are allowed."),
      allowed.has(file.mimetype),
    );
  },
});

const rowSchema = z.object({
  original_url: destinationSchema,
  custom_alias: z.union([aliasSchema, z.literal("")]).default(""),
  expires_at: z
    .union([z.string().datetime({ offset: true }), z.literal("")])
    .refine(
      (value) => !value || new Date(value).getTime() > Date.now() + 30_000,
      "Expiry must be in the future.",
    )
    .default(""),
  public_stats: z
    .string()
    .trim()
    .toLowerCase()
    .transform((value, context) => {
      if (["true", "1", "yes"].includes(value)) return true;
      if (["", "false", "0", "no"].includes(value)) return false;
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Use true or false.",
      });
      return z.NEVER;
    })
    .default("false"),
});

router.post("/", (req, res, next) => {
  upload.single("file")(req, res, (uploadError) => {
    if (uploadError) {
      return res.status(422).json({
        error: {
          code: "INVALID_CSV_UPLOAD",
          message: safeUploadMessage(uploadError),
          requestId: req.id,
        },
      });
    }
    return handleBulk(req, res, next);
  });
});

async function handleBulk(req, res, next) {
  try {
    if (!req.file) {
      return res.status(422).json({
        error: {
          code: "CSV_REQUIRED",
          message: "Choose a CSV file to continue.",
          requestId: req.id,
        },
      });
    }
    const mode = req.body.mode === "process" ? "process" : "preview";
    const importId = z.string().uuid().parse(req.body.importId);
    const records = parseCsv(req.file.buffer);
    if (records.length === 0 || records.length > 100) {
      return res.status(422).json({
        error: {
          code: "CSV_ROW_LIMIT",
          message: "CSV files must contain between 1 and 100 data rows.",
          requestId: req.id,
        },
      });
    }

    const seenAliases = new Set();
    const rows = records.map((record, index) => {
      const parsed = rowSchema.safeParse(record);
      if (!parsed.success) {
        return {
          row: index + 2,
          status: "invalid",
          originalUrl: record.original_url || "",
          alias: record.custom_alias || "",
          errors: parsed.error.issues.map((issue) => issue.message),
        };
      }
      const aliasKey = parsed.data.custom_alias.toLowerCase();
      if (aliasKey && seenAliases.has(aliasKey)) {
        return {
          row: index + 2,
          status: "invalid",
          originalUrl: parsed.data.original_url,
          alias: parsed.data.custom_alias,
          errors: ["Custom alias is duplicated within the CSV file."],
        };
      }
      if (aliasKey) seenAliases.add(aliasKey);
      return {
        row: index + 2,
        status: "valid",
        originalUrl: parsed.data.original_url,
        alias: parsed.data.custom_alias,
        input: parsed.data,
        errors: [],
      };
    });
    const requestedAliases = rows
      .filter((row) => row.status === "valid" && row.alias)
      .map((row) => row.alias);
    if (requestedAliases.length) {
      const existing = await prisma.link.findMany({
        where: { shortCode: { in: requestedAliases } },
        select: { shortCode: true },
      });
      const unavailable = new Set(existing.map((link) => link.shortCode));
      for (const row of rows) {
        if (row.status === "valid" && unavailable.has(row.alias)) {
          row.status = "invalid";
          row.errors = ["Custom alias is already in use."];
        }
      }
    }

    if (mode === "process") {
      for (const row of rows) {
        if (row.status !== "valid") continue;
        try {
          const idempotencyKey = createIdempotencyKey(
            importId,
            row.row,
            req.user.id,
          );
          const link = await createBulkLink(
            row.input,
            req.user.id,
            idempotencyKey,
          );
          row.status = "created";
          row.shortCode = link.shortCode;
          row.shortUrl = `${env.PUBLIC_BASE_URL}/${link.shortCode}`;
        } catch (error) {
          row.status = "failed";
          row.errors = [
            isUniqueConstraintError(error)
              ? "Custom alias is already in use."
              : "Link could not be created.",
          ];
        }
      }
    }

    return res.json({
      data: {
        mode,
        summary: summarize(rows),
        rows: rows.map(({ input: _input, ...row }) => row),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(422).json({
        error: {
          code: "INVALID_IMPORT_ID",
          message: "The import session is invalid. Choose the file again.",
          requestId: req.id,
        },
      });
    }
    if (error.code === "CSV_INVALID") {
      return res.status(422).json({
        error: {
          code: error.code,
          message: error.message,
          requestId: req.id,
        },
      });
    }
    return next(error);
  }
}

function parseCsv(buffer) {
  try {
    return parse(buffer, {
      bom: true,
      columns: (headers) => {
        const normalized = headers.map((header) => header.trim().toLowerCase());
        const expected = [
          "original_url",
          "custom_alias",
          "expires_at",
          "public_stats",
        ];
        if (
          normalized.length !== expected.length ||
          normalized.some((header, index) => header !== expected[index])
        ) {
          const error = new Error(
            `CSV headers must be exactly: ${expected.join(", ")}`,
          );
          error.code = "CSV_INVALID";
          throw error;
        }
        return normalized;
      },
      relax_column_count: false,
      max_record_size: 16 * 1024,
      skip_empty_lines: true,
      to: 101,
      trim: true,
    });
  } catch (error) {
    if (error.code === "CSV_INVALID") throw error;
    const invalid = new Error("The CSV file could not be parsed.");
    invalid.code = "CSV_INVALID";
    throw invalid;
  }
}

async function createBulkLink(input, userId, idempotencyKey) {
  const existing = await prisma.bulkImportRow.findUnique({
    where: { idempotencyKey },
    include: { link: true },
  });
  if (existing) return existing.link;

  return prisma.$transaction(async (transaction) => {
    const repeated = await transaction.bulkImportRow.findUnique({
      where: { idempotencyKey },
      include: { link: true },
    });
    if (repeated) return repeated.link;

    const link = await createLinkWithTransaction(transaction, input, userId);
    await transaction.bulkImportRow.create({
      data: { idempotencyKey, userId, linkId: link.id },
    });
    return link;
  });
}

async function createLinkWithTransaction(transaction, input, userId) {
  if (input.custom_alias) {
    return transaction.link.create({
      data: toLinkData(input, input.custom_alias, userId),
    });
  }
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await transaction.link.create({
        data: toLinkData(input, generateShortCode(), userId),
      });
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
    }
  }
  throw new Error("Unable to generate a unique code.");
}

function createIdempotencyKey(importId, row, userId) {
  return crypto
    .createHash("sha256")
    .update(`${userId}|${importId}|${row}`)
    .digest("hex");
}

function safeUploadMessage(error) {
  if (error.code === "LIMIT_FILE_SIZE")
    return "The CSV file must be 1 MB or less.";
  if (error.code === "LIMIT_FILE_COUNT")
    return "Upload one CSV file at a time.";
  return "The CSV upload is invalid.";
}

function toLinkData(input, shortCode, userId) {
  return {
    destinationUrl: input.original_url,
    shortCode,
    userId,
    expiresAt: input.expires_at ? new Date(input.expires_at) : null,
    publicStats: input.public_stats,
  };
}

function summarize(rows) {
  return rows.reduce(
    (summary, row) => {
      summary.total += 1;
      summary[row.status] = (summary[row.status] || 0) + 1;
      return summary;
    },
    { total: 0, valid: 0, invalid: 0, created: 0, failed: 0 },
  );
}

export default router;
