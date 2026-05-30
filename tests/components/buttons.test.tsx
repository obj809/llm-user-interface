import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HomeButton from "@/app/components/HomeButton";
import SendButton from "@/app/components/SendButton";
import Spark from "@/app/components/Spark";

describe("HomeButton", () => {
  it("calls onClick when pressed", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<HomeButton onClick={onClick} />);
    await user.click(screen.getByRole("button", { name: /return home/i }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe("SendButton", () => {
  it("calls onClick when pressed", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<SendButton onClick={onClick} />);
    await user.click(screen.getByRole("button", { name: /send message/i }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe("Spark", () => {
  it("renders an accessible lightning-bolt indicator", () => {
    render(<Spark />);
    const spark = screen.getByRole("img", { name: /lightning bolt/i });
    expect(spark).toHaveTextContent("⚡");
  });
});
