import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  $transaction: vi.fn(),
  $queryRaw: vi.fn(),
  bulkImportRow: {
    create: vi.fn(),
    findUnique: vi.fn(),
  },
  link: {
    count: vi.fn(),
    create: vi.fn(),
    deleteMany: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  session: {
    delete: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  user: {
    create: vi.fn(),
    findUnique: vi.fn(),
  },
  visit: {
    create: vi.fn(),
    deleteMany: vi.fn(),
    findMany: vi.fn(),
  },
}));

vi.mock("../lib/prisma.js", () => ({ prisma: database }));

const { createApp } = await import("../app.js");

describe("links API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    database.link.findMany.mockResolvedValue([]);
    database.bulkImportRow.findUnique.mockResolvedValue(null);
    database.bulkImportRow.create.mockResolvedValue({ id: "import_row_1" });
    database.$transaction.mockImplementation((operations) => {
      if (typeof operations === "function") return operations(database);
      return Promise.resolve([]);
    });
    database.session.findUnique.mockResolvedValue({
      id: "session_1",
      expiresAt: new Date(Date.now() + 60_000),
      lastSeenAt: new Date(),
      user: {
        id: "owner_1",
        name: "Sahana",
        email: "sahana@example.com",
        createdAt: new Date(),
      },
    });
  });

  it("rejects unsafe URL schemes", async () => {
    const response = await authenticated(
      request(createApp()).post("/api/links"),
    ).send({ destinationUrl: "javascript:alert(1)", customAlias: "" });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(database.link.create).not.toHaveBeenCalled();
  });

  it("creates an owned link with a validated custom alias", async () => {
    database.link.create.mockResolvedValue({
      id: "link_1",
      shortCode: "launch-26",
      destinationUrl: "https://example.com/campaign",
      userId: "owner_1",
      clickCount: 0,
      createdAt: new Date("2026-06-13T12:00:00.000Z"),
      updatedAt: new Date("2026-06-13T12:00:00.000Z"),
    });

    const response = await authenticated(
      request(createApp()).post("/api/links"),
    ).send({
      destinationUrl: "https://example.com/campaign",
      customAlias: "launch-26",
    });

    expect(response.status).toBe(201);
    expect(response.body.data.link.shortUrl).toMatch(/\/launch-26$/);
    expect(database.link.create).toHaveBeenCalledWith({
      data: {
        destinationUrl: "https://example.com/campaign",
        expiresAt: null,
        publicStats: false,
        shortCode: "launch-26",
        userId: "owner_1",
      },
    });
  });

  it("rejects aliases that collide with static application paths", async () => {
    const response = await authenticated(
      request(createApp()).post("/api/links"),
    ).send({
      destinationUrl: "https://example.com",
      customAlias: "assets",
    });

    expect(response.status).toBe(422);
    expect(database.link.create).not.toHaveBeenCalled();
  });

  it("rejects pagination offsets beyond the bounded window", async () => {
    const response = await authenticated(
      request(createApp()).get("/api/links?page=1001"),
    );

    expect(response.status).toBe(422);
    expect(database.$transaction).not.toHaveBeenCalled();
  });

  it("does not reveal whether another user's link exists during deletion", async () => {
    database.link.deleteMany.mockResolvedValue({ count: 0 });

    const response = await authenticated(
      request(createApp()).delete("/api/links/another-users-link"),
    );

    expect(response.status).toBe(404);
    expect(database.link.deleteMany).toHaveBeenCalledWith({
      where: { id: "another-users-link", userId: "owner_1" },
    });
  });

  it("scopes destination updates to the authenticated owner", async () => {
    database.link.updateMany.mockResolvedValue({ count: 0 });

    const response = await authenticated(
      request(createApp()).patch("/api/links/another-users-link"),
    ).send({ destinationUrl: "https://example.com/new" });

    expect(response.status).toBe(404);
    expect(database.link.updateMany).toHaveBeenCalledWith({
      where: { id: "another-users-link", userId: "owner_1" },
      data: { destinationUrl: "https://example.com/new" },
    });
  });

  it("keeps private public statistics indistinguishable from missing links", async () => {
    database.link.findFirst.mockResolvedValue(null);

    const response = await request(createApp()).get(
      "/api/public/stats/private-code",
    );

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("PUBLIC_STATS_NOT_FOUND");
    expect(database.link.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          shortCode: "private-code",
          publicStats: true,
        }),
      }),
    );
  });

  it("rejects past expiries and unknown update fields", async () => {
    const response = await authenticated(
      request(createApp()).patch("/api/links/link_1"),
    ).send({
      expiresAt: "2020-01-01T00:00:00.000Z",
      clickCount: 999999,
    });

    expect(response.status).toBe(422);
    expect(database.link.updateMany).not.toHaveBeenCalled();
  });

  it("previews CSV rows without writing to the database", async () => {
    const csv = [
      "original_url,custom_alias,expires_at,public_stats",
      "https://example.com/one,launch-one,,true",
      "javascript:alert(1),bad-row,,false",
    ].join("\n");

    const response = await authenticated(
      request(createApp())
        .post("/api/links/bulk")
        .field("mode", "preview")
        .field("importId", "26f8f4ec-2c96-4c84-ae3b-f27cb81a4dd9")
        .attach("file", Buffer.from(csv), {
          filename: "links.csv",
          contentType: "text/csv",
        }),
    );

    expect(response.status).toBe(200);
    expect(response.body.data.summary).toMatchObject({
      total: 2,
      valid: 1,
      invalid: 1,
    });
    expect(database.link.create).not.toHaveBeenCalled();
  });

  it("processes valid CSV rows and reports alias collisions", async () => {
    const csv = [
      "original_url,custom_alias,expires_at,public_stats",
      "https://example.com/one,launch-one,,true",
      "https://example.com/two,launch-two,,false",
    ].join("\n");
    database.link.create
      .mockResolvedValueOnce({ id: "link_1", shortCode: "launch-one" })
      .mockRejectedValueOnce({ code: "P2002" });

    const response = await authenticated(
      request(createApp())
        .post("/api/links/bulk")
        .field("mode", "process")
        .field("importId", "26f8f4ec-2c96-4c84-ae3b-f27cb81a4dd9")
        .attach("file", Buffer.from(csv), {
          filename: "links.csv",
          contentType: "text/csv",
        }),
    );

    expect(response.status).toBe(200);
    expect(response.body.data.summary.created).toBe(1);
    expect(response.body.data.summary.failed).toBe(1);
    expect(response.body.data.rows[1].errors).toContain(
      "Custom alias is already in use.",
    );
  });

  it("returns the existing link when a processed import row is retried", async () => {
    const csv = [
      "original_url,custom_alias,expires_at,public_stats",
      "https://example.com/one,launch-one,,false",
    ].join("\n");
    database.bulkImportRow.findUnique.mockResolvedValue({
      link: { id: "link_1", shortCode: "launch-one" },
    });

    const response = await authenticated(
      request(createApp())
        .post("/api/links/bulk")
        .field("mode", "process")
        .field("importId", "26f8f4ec-2c96-4c84-ae3b-f27cb81a4dd9")
        .attach("file", Buffer.from(csv), {
          filename: "links.csv",
          contentType: "text/csv",
        }),
    );

    expect(response.status).toBe(200);
    expect(response.body.data.rows[0].shortUrl).toMatch(/\/launch-one$/);
    expect(database.link.create).not.toHaveBeenCalled();
  });

  it("does not expose another user's analytics", async () => {
    database.link.findFirst.mockResolvedValue(null);

    const response = await authenticated(
      request(createApp()).get("/api/links/another-users-link/analytics"),
    );

    expect(response.status).toBe(404);
    expect(database.link.findFirst).toHaveBeenCalledWith({
      where: { id: "another-users-link", userId: "owner_1" },
    });
    expect(database.visit.findMany).not.toHaveBeenCalled();
  });

  it("redirects and records a visit transactionally", async () => {
    database.link.findUnique.mockResolvedValue({
      id: "link_1",
      shortCode: "abc1234",
      destinationUrl: "https://example.com/destination",
      expiresAt: null,
    });
    database.link.update.mockReturnValue({ operation: "update" });
    database.visit.create.mockReturnValue({ operation: "visit" });
    database.$transaction.mockResolvedValue([]);

    const response = await request(createApp())
      .get("/abc1234")
      .set("Referer", "https://referrer.example/path?secret=value");

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("https://example.com/destination");
    expect(database.$transaction).toHaveBeenCalledWith([
      { operation: "update" },
      { operation: "visit" },
    ]);
    expect(database.visit.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        linkId: "link_1",
        referrer: "referrer.example",
      }),
    });
  });

  it("returns 410 for expired links without recording analytics", async () => {
    database.link.findUnique.mockResolvedValue({
      id: "link_1",
      shortCode: "expired",
      destinationUrl: "https://example.com/destination",
      expiresAt: new Date(Date.now() - 60_000),
    });

    const response = await request(createApp()).get("/expired");

    expect(response.status).toBe(410);
    expect(database.visit.create).not.toHaveBeenCalled();
    expect(database.$transaction).not.toHaveBeenCalled();
  });
});

function authenticated(testRequest) {
  return testRequest.set("Cookie", "linkora_session=valid-session-token");
}
