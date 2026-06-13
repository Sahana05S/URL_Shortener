import bcrypt from "bcryptjs";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  session: {
    create: vi.fn(),
    delete: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  user: {
    create: vi.fn(),
    findUnique: vi.fn(),
  },
}));

vi.mock("../lib/prisma.js", () => ({ prisma: database }));

const { createApp } = await import("../app.js");

describe("authentication API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects weak signup credentials with field errors", async () => {
    const response = await request(createApp()).post("/api/auth/signup").send({
      name: "A",
      email: "not-an-email",
      password: "weak",
    });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.fields).toMatchObject({
      email: expect.any(Array),
      name: expect.any(Array),
      password: expect.any(Array),
    });
    expect(database.user.create).not.toHaveBeenCalled();
  });

  it("creates a hashed account and secure session cookie", async () => {
    database.user.findUnique.mockResolvedValue(null);
    database.user.create.mockImplementation(async ({ data }) => ({
      id: "user_1",
      name: data.name,
      email: data.email,
      createdAt: new Date("2026-06-13T12:00:00.000Z"),
    }));
    database.session.create.mockResolvedValue({ id: "session_1" });

    const response = await request(createApp()).post("/api/auth/signup").send({
      name: "Sahana",
      email: "SAHANA@example.com",
      password: "SecurePass123",
    });

    expect(response.status).toBe(201);
    expect(response.body.data.user.email).toBe("sahana@example.com");
    expect(database.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          passwordHash: expect.not.stringContaining("SecurePass123"),
        }),
      }),
    );
    expect(response.headers["set-cookie"][0]).toContain("HttpOnly");
    expect(response.headers["set-cookie"][0]).toContain("SameSite=Lax");
  });

  it("uses a generic error when login credentials are wrong", async () => {
    database.user.findUnique.mockResolvedValue({
      id: "user_1",
      passwordHash: await bcrypt.hash("DifferentPass123", 4),
    });

    const response = await request(createApp()).post("/api/auth/login").send({
      email: "person@example.com",
      password: "WrongPass123",
    });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("INVALID_CREDENTIALS");
    expect(response.body.error.message).toBe(
      "The email or password is incorrect.",
    );
  });

  it("restores a user from a valid database session", async () => {
    database.session.findUnique.mockResolvedValue({
      id: "session_1",
      expiresAt: new Date(Date.now() + 60_000),
      lastSeenAt: new Date(),
      user: {
        id: "user_1",
        name: "Sahana",
        email: "sahana@example.com",
        createdAt: new Date(),
      },
    });

    const response = await request(createApp())
      .get("/api/auth/me")
      .set("Cookie", "linkora_session=valid-session-token");

    expect(response.status).toBe(200);
    expect(response.body.data.user.email).toBe("sahana@example.com");
  });

  it("rejects state changes from an untrusted origin", async () => {
    const response = await request(createApp())
      .post("/api/auth/login")
      .set("Origin", "https://attacker.example")
      .send({ email: "person@example.com", password: "WrongPass123" });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("UNTRUSTED_ORIGIN");
    expect(database.user.findUnique).not.toHaveBeenCalled();
  });

  it("deletes an idle session and rejects replay", async () => {
    database.session.findUnique.mockResolvedValue({
      id: "session_1",
      expiresAt: new Date(Date.now() + 60_000),
      lastSeenAt: new Date(Date.now() - 31 * 60 * 1000),
      user: { id: "user_1" },
    });
    database.session.delete.mockResolvedValue({ id: "session_1" });

    const response = await request(createApp())
      .get("/api/auth/me")
      .set("Cookie", "linkora_session=idle-session-token");

    expect(response.status).toBe(401);
    expect(database.session.delete).toHaveBeenCalledWith({
      where: { id: "session_1" },
    });
  });

  it("deletes the active session during logout", async () => {
    database.session.findUnique.mockResolvedValue({
      id: "session_1",
      expiresAt: new Date(Date.now() + 60_000),
      lastSeenAt: new Date(),
      user: {
        id: "user_1",
        name: "Sahana",
        email: "sahana@example.com",
      },
    });
    database.session.delete.mockResolvedValue({ id: "session_1" });

    const response = await request(createApp())
      .post("/api/auth/logout")
      .set("Cookie", "linkora_session=valid-session-token");

    expect(response.status).toBe(204);
    expect(database.session.delete).toHaveBeenCalledWith({
      where: { id: "session_1" },
    });
    expect(response.headers["set-cookie"][0]).toContain("linkora_session=");
  });
});
