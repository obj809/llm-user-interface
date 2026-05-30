import { describe, it, expect, vi, afterEach } from "vitest";
import { copyToClipboard } from "@/app/clipboard";

const originalClipboardDescriptor = Object.getOwnPropertyDescriptor(
  navigator,
  "clipboard",
);

function setClipboard(value: unknown) {
  Object.defineProperty(navigator, "clipboard", {
    value,
    configurable: true,
    writable: true,
  });
}

afterEach(() => {
  if (originalClipboardDescriptor) {
    Object.defineProperty(navigator, "clipboard", originalClipboardDescriptor);
  } else {
    // @ts-expect-error cleaning up the test-injected property
    delete navigator.clipboard;
  }
  vi.restoreAllMocks();
});

describe("copyToClipboard", () => {
  it("uses the async Clipboard API when available", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });

    await copyToClipboard("hello");

    expect(writeText).toHaveBeenCalledWith("hello");
  });

  it("falls back to execCommand when the Clipboard API is unavailable", async () => {
    setClipboard(undefined);
    const execCommand = vi.fn().mockReturnValue(true);
    // jsdom doesn't implement execCommand; install a spy.
    document.execCommand = execCommand;
    const appendChild = vi.spyOn(document.body, "appendChild");

    await copyToClipboard("fallback text");

    expect(execCommand).toHaveBeenCalledWith("copy");
    const appended = appendChild.mock.calls[0][0] as HTMLTextAreaElement;
    expect(appended.tagName).toBe("TEXTAREA");
    expect(appended.value).toBe("fallback text");
    // The temporary textarea is cleaned up.
    expect(document.querySelector("textarea")).toBeNull();
  });

  it("falls back when writeText rejects", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    setClipboard({ writeText });
    const execCommand = vi.fn().mockReturnValue(true);
    document.execCommand = execCommand;

    await copyToClipboard("retry");

    expect(writeText).toHaveBeenCalled();
    expect(execCommand).toHaveBeenCalledWith("copy");
  });
});
