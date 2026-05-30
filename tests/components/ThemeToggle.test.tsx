import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ThemeToggle from "@/app/components/ThemeToggle";

beforeEach(() => {
  // Reset the global theme state the component reads/writes.
  document.documentElement.classList.remove("dark");
  localStorage.clear();
});

describe("ThemeToggle", () => {
  it("enables dark mode and persists it when toggled from light", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    // Starts light: the control offers to switch to dark.
    const button = screen.getByRole("button", { name: /switch to dark mode/i });
    await user.click(button);

    expect(document.documentElement).toHaveClass("dark");
    expect(localStorage.getItem("theme")).toBe("dark");
    expect(
      screen.getByRole("button", { name: /switch to light mode/i }),
    ).toBeInTheDocument();
  });

  it("disables dark mode when toggled from dark", async () => {
    document.documentElement.classList.add("dark");
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.click(
      screen.getByRole("button", { name: /switch to light mode/i }),
    );

    expect(document.documentElement).not.toHaveClass("dark");
    expect(localStorage.getItem("theme")).toBe("light");
  });
});
