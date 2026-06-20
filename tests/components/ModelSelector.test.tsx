import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ModelSelector from "@/app/components/ModelSelector";

describe("ModelSelector", () => {
  it("shows the selected model's label", () => {
    render(<ModelSelector value="gemini-2.5-flash" />);
    expect(
      screen.getByRole("button", { name: /Gemini 2\.5 Flash/ }),
    ).toBeInTheDocument();
  });

  it("opens the menu and lists every available model", async () => {
    const user = userEvent.setup();
    render(<ModelSelector value="gemini-2.5-flash" />);

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Gemini/ }));

    expect(screen.getByRole("listbox")).toBeInTheDocument();
    // Gemini and the RAG model are enabled; GPT-5.4 mini and Claude Haiku 4.5
    // are disabled, and the local Ollama models (Llama 3.2, DeepSeek-R1) are
    // commented out.
    expect(screen.getAllByRole("option")).toHaveLength(2);
    expect(
      screen.getByRole("option", { name: /Net-Zero Report \(RAG\)/ }),
    ).toBeInTheDocument();
  });

  it("fires onChange and closes when an option is selected", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ModelSelector onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /Gemini/ }));
    await user.click(
      screen.getByRole("option", { name: /Net-Zero Report \(RAG\)/ }),
    );

    expect(onChange).toHaveBeenCalledWith("rag-v1");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    render(<ModelSelector value="gemini-2.5-flash" />);

    await user.click(screen.getByRole("button", { name: /Gemini/ }));
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("closes on an outside click", async () => {
    const user = userEvent.setup();
    render(<ModelSelector value="gemini-2.5-flash" />);

    await user.click(screen.getByRole("button", { name: /Gemini/ }));
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("keeps the label and closes when used uncontrolled", async () => {
    const user = userEvent.setup();
    render(<ModelSelector />); // no value -> uncontrolled, defaults to Gemini

    expect(screen.getByRole("button", { name: /Gemini/ })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Gemini/ }));
    // Re-selecting the current model keeps the label and closes.
    await user.click(screen.getByRole("option", { name: /Gemini 2\.5 Flash/ }));

    expect(
      screen.getByRole("button", { name: /Gemini 2\.5 Flash/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
