import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";

describe("landing page", () => {
  it("introduces the product and shortening action", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({
          error: {
            code: "AUTHENTICATION_REQUIRED",
            message: "Authentication required.",
          },
        }),
      }),
    );

    render(
      <MemoryRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: /make every link work harder/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /shorten link/i }),
    ).toBeInTheDocument();
  });
});
