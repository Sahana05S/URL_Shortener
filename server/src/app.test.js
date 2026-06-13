import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";

describe("application foundation", () => {
  it("returns service health and security headers", async () => {
    const response = await request(createApp()).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-powered-by"]).toBeUndefined();
    expect(response.headers["x-request-id"]).toBeTruthy();
  });

  it("returns a safe structured 404", async () => {
    const response = await request(createApp()).get("/api/missing");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
    expect(response.body.error.requestId).toBeTruthy();
  });
});
