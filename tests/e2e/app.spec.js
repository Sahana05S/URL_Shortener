import { expect, test } from "@playwright/test";

const user = {
  id: "user_1",
  name: "Sahana",
  email: "sahana@example.com",
  createdAt: "2026-06-13T12:00:00.000Z",
};

test("carries a landing-page URL into the authenticated create flow", async ({
  page,
}) => {
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({
        error: {
          code: "AUTHENTICATION_REQUIRED",
          message: "Authentication is required.",
        },
      }),
    }),
  );
  await page.route("**/api/auth/signup", (route) =>
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
          links: [],
          pagination: { page: 1, pageSize: 20, total: 0, totalPages: 1 },
        },
      }),
    }),
  );

  await page.goto("/");
  await page
    .getByLabel("Paste a long URL")
    .fill("https://example.com/campaign");
  await page.getByRole("button", { name: /shorten link/i }).click();
  await expect(page).toHaveURL(/\/signup$/);
  await page.getByLabel("Name").fill("Sahana");
  await page.getByLabel("Email address").fill("sahana@example.com");
  await page.getByRole("textbox", { name: "Password" }).fill("SecurePass123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole("dialog", { name: "Create a link" }),
  ).toBeVisible();
  await expect(page.getByLabel("Destination URL")).toHaveValue(
    "https://example.com/campaign",
  );
});

test("creates, copies, opens analytics, and deletes an owned link", async ({
  page,
  context,
}) => {
  let links = [];
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
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
          links,
          pagination: {
            page: 1,
            pageSize: 20,
            total: links.length,
            totalPages: 1,
          },
        },
      }),
    }),
  );
  await page.route("**/api/links", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    const input = route.request().postDataJSON();
    const link = {
      id: "link_1",
      shortCode: input.customAlias || "abc1234",
      shortUrl: `http://127.0.0.1:4000/${input.customAlias || "abc1234"}`,
      destinationUrl: input.destinationUrl,
      clickCount: 0,
      publicStats: false,
      expiresAt: null,
      createdAt: "2026-06-13T12:00:00.000Z",
    };
    links = [link];
    return route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ data: { link } }),
    });
  });
  await page.route("**/api/links/link_1", (route) =>
    route.fulfill({ status: 204, body: "" }),
  );
  page.on("dialog", (dialog) => dialog.accept());

  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Create link" }).click();
  await page.getByLabel("Destination URL").fill("https://example.com/product");
  await page.getByLabel("Custom alias").fill("product-launch");
  await page.getByRole("button", { name: "Create short link" }).click();
  const shortLink = page.getByRole("link", {
    name: /127\.0\.0\.1:4000\/product-launch/,
  });
  await expect(shortLink).toBeVisible();
  await page.getByRole("button", { name: "Copy short link" }).click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toContain("product-launch");
  await expect(
    page.getByRole("link", { name: "View link analytics" }),
  ).toHaveAttribute("href", "/dashboard/links/link_1");
  await page.getByRole("button", { name: "Delete short link" }).click();
  await expect(shortLink).not.toBeVisible();
});

test("keeps the dashboard usable at a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
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
          links: [],
          pagination: { page: 1, pageSize: 20, total: 0, totalPages: 1 },
        },
      }),
    }),
  );

  await page.goto("/dashboard");
  const main = page.getByRole("main");
  await expect(main.getByLabel("Linkora home")).toBeVisible();
  await expect(main.getByLabel("Bulk import")).toBeVisible();
  await expect(main.getByLabel("Log out")).toBeVisible();
  await expect(page.getByRole("button", { name: "Create link" })).toBeVisible();
});
