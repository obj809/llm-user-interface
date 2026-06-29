import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ModelSelector from "@/app/components/ModelSelector";

describe("ModelSelector", () => {
  it("shows the selected model's label", () => {
    render(<ModelSelector value="claude-haiku-4-5" />);
    expect(
      screen.getByRole("button", { name: /Claude Haiku 4\.5/ }),
    ).toBeInTheDocument();
  });

  it("opens the menu and lists every available model", async () => {
    const user = userEvent.setup();
    render(<ModelSelector value="claude-haiku-4-5" />);

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Claude Haiku 4\.5/ }));

    expect(screen.getByRole("listbox")).toBeInTheDocument();
    // Claude Haiku 4.5, Llama 3.2 (Ollama), and the RAG model are enabled; Gemini
    // 2.5 Flash is disabled, and GPT-5.4 mini / DeepSeek-R1 are commented out.
    expect(screen.getAllByRole("option")).toHaveLength(3);
    expect(
      screen.getByRole("option", { name: /Claude Haiku 4\.5/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: /Llama 3\.2 \(Ollama\)/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: /EPBC Act 1999 \(RAG\)/ }),
    ).toBeInTheDocument();
  });

  it("fires onChange and closes when an option is selected", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ModelSelector onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /Claude Haiku 4\.5/ }));
    await user.click(
      screen.getByRole("option", { name: /EPBC Act 1999 \(RAG\)/ }),
    );

    expect(onChange).toHaveBeenCalledWith("rag-v1");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    render(<ModelSelector value="claude-haiku-4-5" />);

    await user.click(screen.getByRole("button", { name: /Claude Haiku 4\.5/ }));
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("closes on an outside click", async () => {
    const user = userEvent.setup();
    render(<ModelSelector value="claude-haiku-4-5" />);

    await user.click(screen.getByRole("button", { name: /Claude Haiku 4\.5/ }));
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("keeps the label and closes when used uncontrolled", async () => {
    const user = userEvent.setup();
    render(<ModelSelector />); // no value -> uncontrolled, defaults to Claude Haiku 4.5

    expect(
      screen.getByRole("button", { name: /Claude Haiku 4\.5/ }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Claude Haiku 4\.5/ }));
    // Re-selecting the current model keeps the label and closes.
    await user.click(screen.getByRole("option", { name: /Claude Haiku 4\.5/ }));

    expect(
      screen.getByRole("button", { name: /Claude Haiku 4\.5/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
