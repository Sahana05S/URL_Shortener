import crypto from "node:crypto";
import { UAParser } from "ua-parser-js";
import { env } from "../config/env.js";

export function getVisitMetadata(req, linkId, visitedAt = new Date()) {
  const userAgent = (req.get("user-agent") || "").slice(0, 512);
  const parsed = UAParser(userAgent);
  const dateBucket = visitedAt.toISOString().slice(0, 10);
  const visitorHash = crypto
    .createHmac("sha256", env.IP_HASH_SECRET)
    .update(`${linkId}|${dateBucket}|${req.ip}|${userAgent}`)
    .digest("hex");

  return {
    visitorHash,
    country: env.TRUST_GEO_HEADERS
      ? cleanCountry(req.get("cf-ipcountry") || req.get("x-vercel-ip-country"))
      : null,
    city: null,
    deviceType: normalizeDevice(parsed.device.type),
    browser: cleanLabel(parsed.browser.name),
    os: cleanLabel(parsed.os.name),
  };
}

export function aggregateDaily(visits, days) {
  const totals = new Map();
  const today = startUtcDay(new Date());
  for (let index = days - 1; index >= 0; index -= 1) {
    const day = new Date(today);
    day.setUTCDate(today.getUTCDate() - index);
    totals.set(day.toISOString().slice(0, 10), 0);
  }
  for (const visit of visits) {
    const key = visit.visitedAt.toISOString().slice(0, 10);
    if (totals.has(key)) totals.set(key, totals.get(key) + 1);
  }
  return [...totals].map(([date, clicks]) => ({ date, clicks }));
}

export function aggregateField(visits, field, fallback = "Unknown") {
  const totals = new Map();
  for (const visit of visits) {
    const label = visit[field] || fallback;
    totals.set(label, (totals.get(label) || 0) + 1);
  }
  return [...totals]
    .map(([name, value]) => ({ name, value }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 10);
}

function normalizeDevice(type) {
  if (type === "mobile" || type === "tablet") return type;
  return "desktop";
}

function cleanCountry(value) {
  if (!value || !/^[A-Za-z]{2}$/.test(value)) return null;
  return value.toUpperCase();
}

function cleanLabel(value) {
  if (!value) return null;
  return value.trim().slice(0, 80) || null;
}

function startUtcDay(date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}
