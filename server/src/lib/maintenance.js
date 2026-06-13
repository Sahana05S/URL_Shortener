import { prisma } from "./prisma.js";

const RETENTION_DAYS = 180;
const BATCH_SIZE = 1000;
const MAX_BATCHES = 10;
const INTERVAL_MS = 6 * 60 * 60 * 1000;
let cleanupRunning = false;

export function startMaintenance() {
  const timer = setInterval(runVisitRetention, INTERVAL_MS);
  timer.unref();
  void runVisitRetention();
  return () => clearInterval(timer);
}

export async function runVisitRetention() {
  if (cleanupRunning) return 0;
  cleanupRunning = true;
  try {
    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - RETENTION_DAYS);
    let deleted = 0;
    for (let batch = 0; batch < MAX_BATCHES; batch += 1) {
      const count = await prisma.$executeRaw`
        WITH expired AS (
          SELECT "id"
          FROM "Visit"
          WHERE "visitedAt" < ${cutoff}
          ORDER BY "visitedAt" ASC
          LIMIT ${BATCH_SIZE}
        )
        DELETE FROM "Visit"
        WHERE "id" IN (SELECT "id" FROM expired)
      `;
      deleted += Number(count);
      if (Number(count) < BATCH_SIZE) break;
    }
    return deleted;
  } catch (error) {
    console.error({
      event: "maintenance.visit_retention_failed",
      message: error.message,
    });
    return 0;
  } finally {
    cleanupRunning = false;
  }
}
