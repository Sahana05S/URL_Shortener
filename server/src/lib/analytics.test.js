import { describe, expect, it } from "vitest";
import {
  aggregateDaily,
  aggregateField,
  getVisitMetadata,
} from "./analytics.js";

describe("analytics aggregation", () => {
  it("fills missing days and counts visits in UTC", () => {
    const today = new Date();
    today.setUTCHours(12, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setUTCDate(today.getUTCDate() - 1);

    const result = aggregateDaily(
      [
        { visitedAt: yesterday },
        { visitedAt: yesterday },
        { visitedAt: today },
      ],
      7,
    );

    expect(result).toHaveLength(7);
    expect(result.at(-1).clicks).toBe(1);
    expect(result.at(-2).clicks).toBe(2);
  });

  it("groups and orders categorical analytics", () => {
    const result = aggregateField(
      [
        { browser: "Chrome" },
        { browser: "Firefox" },
        { browser: "Chrome" },
        { browser: null },
      ],
      "browser",
    );

    expect(result).toEqual([
      { name: "Chrome", value: 2 },
      { name: "Firefox", value: 1 },
      { name: "Unknown", value: 1 },
    ]);
  });

  it("creates link-scoped pseudonyms without trusting geo headers by default", () => {
    const headers = {
      "user-agent": "Mozilla/5.0 Test Browser",
      "cf-ipcountry": "US",
    };
    const req = {
      ip: "203.0.113.8",
      get: (name) => headers[name.toLowerCase()],
    };
    const visitedAt = new Date("2026-06-13T12:00:00.000Z");

    const firstLink = getVisitMetadata(req, "link_1", visitedAt);
    const secondLink = getVisitMetadata(req, "link_2", visitedAt);

    expect(firstLink.visitorHash).not.toBe(secondLink.visitorHash);
    expect(firstLink.country).toBeNull();
    expect(firstLink).not.toHaveProperty("ip");
  });
});
