import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  $transaction: vi.fn(),
  link: {
    count: vi.fn(),
    create: vi.fn(),
    deleteMany: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
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
  },
}));

vi.mock("../lib/prisma.js", () => ({ prisma: database }));

const { createApp } = await import("../app.js");

describe("links API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});

function authenticated(testRequest) {
  return testRequest.set("Cookie", "linkora_session=valid-session-token");
}
