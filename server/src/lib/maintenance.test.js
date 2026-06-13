import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  $executeRaw: vi.fn(),
}));

vi.mock("./prisma.js", () => ({ prisma: database }));

const { runVisitRetention } = await import("./maintenance.js");

describe("visit retention", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stops after a partial bounded deletion batch", async () => {
    database.$executeRaw.mockResolvedValue(42);

    const deleted = await runVisitRetention();

    expect(deleted).toBe(42);
    expect(database.$executeRaw).toHaveBeenCalledTimes(1);
  });

  it("limits one maintenance run to ten full batches", async () => {
    database.$executeRaw.mockResolvedValue(1000);

    const deleted = await runVisitRetention();

    expect(deleted).toBe(10_000);
    expect(database.$executeRaw).toHaveBeenCalledTimes(10);
  });
});
