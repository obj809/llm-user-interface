import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Stub on-demand grammar loading so CodeBlock renders synchronously (no async
// import, no global Prism setup) — we only assert structure here, not tokens.
vi.mock("@/app/components/prism-languages", () => ({
  resolveLanguage: (s: string) => s,
  isLoaded: () => true,
  ensureLanguage: () => Promise.resolve(),
}));

import Markdown from "@/app/components/Markdown";

describe("Markdown", () => {
  it("renders paragraphs, lists, and external links", () => {
    render(
      <Markdown content={"A paragraph.\n\n- one\n- two\n\n[site](https://example.com)"} />,
    );

    expect(screen.getByText("A paragraph.")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);

    const link = screen.getByRole("link", { name: "site" });
    expect(link).toHaveAttribute("href", "https://example.com");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("renders inline code as a styled span, not a code block card", () => {
    render(<Markdown content={"run `npm test` now"} />);
    const code = screen.getByText("npm test");
    expect(code.tagName).toBe("CODE");
    // No code-block header label is rendered for inline code.
    expect(screen.queryByText("Shell")).not.toBeInTheDocument();
  });

  it("routes a fenced block to CodeBlock with a friendly language label", () => {
    const { container } = render(
      <Markdown content={"```js\nconst x = 1;\n```"} />,
    );
    expect(screen.getByText("JavaScript")).toBeInTheDocument(); // header label
    expect(screen.getByRole("button", { name: /copy code/i })).toBeInTheDocument();
    expect(container).toHaveTextContent("const x = 1;");
  });

  it("renders GFM tables", () => {
    render(
      <Markdown content={"| A | B |\n| - | - |\n| 1 | 2 |"} />,
    );
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "A" }),
    ).toBeInTheDocument();
  });
});
