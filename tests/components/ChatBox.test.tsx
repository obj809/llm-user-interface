import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChatBox from "@/app/components/ChatBox";

describe("ChatBox", () => {
  it("submits trimmed text on Enter and clears the input", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ChatBox onSubmit={onSubmit} />);

    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "  hello  {Enter}");

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith("hello");
    expect(textarea).toHaveValue("");
  });

  it("inserts a newline on Shift+Enter without submitting", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ChatBox onSubmit={onSubmit} />);

    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "line1{Shift>}{Enter}{/Shift}line2");

    expect(onSubmit).not.toHaveBeenCalled();
    expect(textarea).toHaveValue("line1\nline2");
  });

  it("ignores whitespace-only input", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ChatBox onSubmit={onSubmit} />);

    await user.type(screen.getByRole("textbox"), "    {Enter}");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits when the send button is clicked", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ChatBox onSubmit={onSubmit} />);

    await user.type(screen.getByRole("textbox"), "hi there");
    await user.click(screen.getByRole("button", { name: /send message/i }));

    expect(onSubmit).toHaveBeenCalledWith("hi there");
  });

  it("does not submit when disabled", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ChatBox onSubmit={onSubmit} disabled />);

    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "blocked{Enter}");
    await user.click(screen.getByRole("button", { name: /send message/i }));

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
