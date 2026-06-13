import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App.jsx";

describe("landing page", () => {
  it("introduces the product and shortening action", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: /make every link work harder/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /shorten link/i })).toBeInTheDocument();
  });
});

