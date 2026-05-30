import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";

// Spy on the clipboard helper so copy actions don't touch the real clipboard.
vi.mock("@/app/clipboard", () => ({ copyToClipboard: vi.fn() }));

import ChatMessage, { type Message } from "@/app/components/ChatMessage";
import { copyToClipboard } from "@/app/clipboard";

const mockedCopy = vi.mocked(copyToClipboard);

beforeEach(() => mockedCopy.mockReset().mockResolvedValue(undefined));

describe("ChatMessage", () => {
  it("renders a user message as raw text (no markdown processing)", () => {
    const message: Message = { id: 1, role: "user", content: "hello **world**" };
    render(<ChatMessage message={message} />);
    // The literal asterisks survive — user text is not run through Markdown.
    expect(screen.getByText("hello **world**")).toBeInTheDocument();
  });

  it("renders an assistant message through Markdown", () => {
    const message: Message = {
      id: 2,
      role: "assistant",
      content: "# Heading\n\nsome **bold** text",
    };
    render(<ChatMessage message={message} />);
    expect(
      screen.getByRole("heading", { name: "Heading" }),
    ).toBeInTheDocument();
    expect(screen.getByText("bold")).toBeInTheDocument();
  });

  it("copies the content and flips to a 'Copied' state, then resets", async () => {
    // Fake timers control the 2s reset; use fireEvent (synchronous) for the
    // click so user-event's own timers don't fight the fake clock.
    vi.useFakeTimers();
    const message: Message = { id: 3, role: "assistant", content: "copy me" };
    render(<ChatMessage message={message} />);

    fireEvent.click(screen.getByRole("button", { name: /^copy$/i }));
    // Flush the async copy handler so setCopied(true) is applied.
    await act(async () => {});

    expect(mockedCopy).toHaveBeenCalledWith("copy me");
    expect(screen.getByRole("button", { name: /copied/i })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByRole("button", { name: /^copy$/i })).toBeInTheDocument();

    vi.useRealTimers();
  });
});
