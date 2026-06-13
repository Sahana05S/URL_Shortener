import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const outputDirectory = path.resolve("docs/evidence");
const baseURL = process.env.EVIDENCE_BASE_URL || "http://127.0.0.1:5173";

const user = {
  id: "user_1",
  name: "Sahana",
  email: "sahana@example.com",
  createdAt: "2026-06-13T12:00:00.000Z",
};
const link = {
  id: "link_1",
  shortCode: "product-launch",
  shortUrl: "https://linkora.example/product-launch",
  destinationUrl: "https://example.com/products/summer-launch",
  clickCount: 1284,
  publicStats: true,
  expiresAt: null,
  lastVisitedAt: "2026-06-13T16:20:00.000Z",
  createdAt: "2026-06-01T10:00:00.000Z",
};

await fs.mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

await page.route("**/api/auth/me", (route) =>
  route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ data: { user } }),
  }),
);
await page.route("**/api/links?**", (route) =>
  route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      data: {
        links: [link],
        pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      },
    }),
  }),
);
await page.route("**/api/links/link_1/analytics?**", (route) =>
  route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      data: {
        link,
        period: { days: 30, from: "2026-05-15T00:00:00.000Z" },
        dailyClicks: makeDailyClicks(),
        devices: [
          { name: "mobile", value: 740 },
          { name: "desktop", value: 468 },
          { name: "tablet", value: 76 },
        ],
        browsers: [
          { name: "Chrome", value: 820 },
          { name: "Safari", value: 310 },
          { name: "Firefox", value: 154 },
        ],
        countries: [
          { name: "IN", value: 610 },
          { name: "US", value: 402 },
          { name: "GB", value: 272 },
        ],
        approximateDailyVisitors: 906,
        recentVisits: [
          {
            id: "visit_1",
            visitedAt: "2026-06-13T16:20:00.000Z",
            country: "IN",
            city: null,
            deviceType: "mobile",
            browser: "Chrome",
            os: "Android",
            referrer: "example.com",
          },
          {
            id: "visit_2",
            visitedAt: "2026-06-13T15:10:00.000Z",
            country: "US",
            city: null,
            deviceType: "desktop",
            browser: "Safari",
            os: "macOS",
            referrer: null,
          },
        ],
      },
    }),
  }),
);

await page.goto(baseURL);
await page.screenshot({
  path: path.join(outputDirectory, "landing.png"),
  fullPage: true,
});
await page.goto(`${baseURL}/dashboard`);
await page.getByRole("link", { name: /product-launch/ }).waitFor();
await page.screenshot({
  path: path.join(outputDirectory, "dashboard.png"),
  fullPage: true,
});
await page.goto(`${baseURL}/dashboard/links/link_1`);
await page.getByRole("heading", { name: "/product-launch" }).waitFor();
await page.waitForTimeout(1800);
await page.screenshot({
  path: path.join(outputDirectory, "analytics.png"),
  fullPage: true,
});

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${baseURL}/dashboard`);
await page.getByRole("link", { name: /product-launch/ }).waitFor();
await page.screenshot({
  path: path.join(outputDirectory, "mobile.png"),
  fullPage: true,
});
await browser.close();

console.log(`Evidence screenshots written to ${outputDirectory}`);

function makeDailyClicks() {
  return Array.from({ length: 30 }, (_, index) => {
    const date = new Date(Date.UTC(2026, 4, 15 + index));
    return {
      date: date.toISOString().slice(0, 10),
      clicks: 12 + ((index * 17) % 63),
    };
  });
}
