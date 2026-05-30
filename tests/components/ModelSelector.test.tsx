import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ModelSelector from "@/app/components/ModelSelector";

describe("ModelSelector", () => {
  it("shows the selected model's label", () => {
    render(<ModelSelector value="gpt-4.1-nano" />);
    expect(
      screen.getByRole("button", { name: /GPT-4\.1 nano/ }),
    ).toBeInTheDocument();
  });

  it("opens the menu and lists every model", async () => {
    const user = userEvent.setup();
    render(<ModelSelector value="gemini-2.5-flash-lite" />);

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Gemini/ }));

    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(2);
  });

  it("fires onChange and closes when an option is selected", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ModelSelector value="gemini-2.5-flash-lite" onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /Gemini/ }));
    await user.click(screen.getByRole("option", { name: /GPT-4\.1 nano/ }));

    expect(onChange).toHaveBeenCalledWith("gpt-4.1-nano");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    render(<ModelSelector value="gemini-2.5-flash-lite" />);

    await user.click(screen.getByRole("button", { name: /Gemini/ }));
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("closes on an outside click", async () => {
    const user = userEvent.setup();
    render(<ModelSelector value="gemini-2.5-flash-lite" />);

    await user.click(screen.getByRole("button", { name: /Gemini/ }));
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("updates the label when used uncontrolled", async () => {
    const user = userEvent.setup();
    render(<ModelSelector />); // no value -> uncontrolled, defaults to Gemini

    expect(screen.getByRole("button", { name: /Gemini/ })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Gemini/ }));
    await user.click(screen.getByRole("option", { name: /GPT-4\.1 nano/ }));

    expect(
      screen.getByRole("button", { name: /GPT-4\.1 nano/ }),
    ).toBeInTheDocument();
  });
});
