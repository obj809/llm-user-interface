import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ModelSelector from "@/app/components/ModelSelector";

describe("ModelSelector", () => {
  it("shows the selected model's label", () => {
    render(<ModelSelector value="gemini-2.5-flash-lite" />);
    expect(
      screen.getByRole("button", { name: /Gemini 2\.5 Flash-Lite/ }),
    ).toBeInTheDocument();
  });

  it("opens the menu and lists every available model", async () => {
    const user = userEvent.setup();
    render(<ModelSelector value="gemini-2.5-flash-lite" />);

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Gemini/ }));

    expect(screen.getByRole("listbox")).toBeInTheDocument();
    // Only Gemini is enabled; GPT-4.1 nano is temporarily disabled.
    expect(screen.getAllByRole("option")).toHaveLength(1);
  });

  it("fires onChange and closes when an option is selected", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ModelSelector onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /Gemini/ }));
    await user.click(screen.getByRole("option", { name: /Gemini 2\.5 Flash-Lite/ }));

    expect(onChange).toHaveBeenCalledWith("gemini-2.5-flash-lite");
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

  it("keeps the label and closes when used uncontrolled", async () => {
    const user = userEvent.setup();
    render(<ModelSelector />); // no value -> uncontrolled, defaults to Gemini

    expect(screen.getByRole("button", { name: /Gemini/ })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Gemini/ }));
    // Only Gemini is available; selecting it keeps the label and closes.
    await user.click(screen.getByRole("option", { name: /Gemini 2\.5 Flash-Lite/ }));

    expect(
      screen.getByRole("button", { name: /Gemini 2\.5 Flash-Lite/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
