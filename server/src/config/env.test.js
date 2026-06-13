import { describe, expect, it } from "vitest";
import { parseEnv } from "./env.js";

const secureProduction = {
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://user:password@db.example.com:5432/linkora",
  APP_ORIGIN: "https://linkora.example.com",
  PUBLIC_BASE_URL: "https://linkora.example.com",
  SESSION_SECRET: "session-secret-with-at-least-32-characters",
  IP_HASH_SECRET: "analytics-secret-with-at-least-32-characters",
};

describe("environment validation", () => {
  it("accepts origin-only HTTPS production configuration", () => {
    const result = parseEnv(secureProduction);

    expect(result.APP_ORIGIN).toBe("https://linkora.example.com");
  });

  it("rejects HTTP origins and reused production secrets", () => {
    expect(() =>
      parseEnv({
        ...secureProduction,
        APP_ORIGIN: "http://linkora.example.com",
        IP_HASH_SECRET: secureProduction.SESSION_SECRET,
      }),
    ).toThrow();
  });

  it("rejects origins containing credentials or paths", () => {
    expect(() =>
      parseEnv({
        ...secureProduction,
        PUBLIC_BASE_URL: "https://user:pass@linkora.example.com/path",
      }),
    ).toThrow();
  });
});
