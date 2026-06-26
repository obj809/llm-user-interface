"use client";

import { useState } from "react";
import SendButton from "./SendButton";
import ModelSelector from "./ModelSelector";
import type { ModelId } from "../models";

type ChatBoxProps = {
  onSubmit?: (text: string) => void;
  placeholder?: string;
  modelMenuDropUp?: boolean;
  disabled?: boolean;
  // While a reply streams, the send button becomes a stop button that calls
  // `onStop` instead of submitting.
  streaming?: boolean;
  onStop?: () => void;
  model?: ModelId;
  onModelChange?: (model: ModelId) => void;
};

export default function ChatBox({
  onSubmit,
  placeholder = "How can I help you today?",
  modelMenuDropUp = false,
  disabled = false,
  streaming = false,
  onStop,
  model,
  onModelChange,
}: ChatBoxProps) {
  const [value, setValue] = useState("");

  const submit = () => {
    if (disabled) return;
    const text = value.trim();
    if (!text) return;
    onSubmit?.(text);
    setValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="relative w-full max-w-[52rem] rounded-[28px] border border-zinc-300 bg-white px-4 pb-3 pt-4 shadow-2xl sm:px-5 sm:pt-5 dark:border-zinc-700/60 dark:bg-[#1c1c1c]">
      {/* Input */}
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={2}
        placeholder={placeholder}
        className="block w-full resize-none bg-transparent text-base text-zinc-900 placeholder:text-zinc-400 focus:outline-none sm:text-lg dark:text-zinc-100 dark:placeholder:text-zinc-500"
      />

      {/* Bottom toolbar */}
      <div className="mt-4 flex items-center justify-end sm:mt-6">
        <div className="flex items-center gap-4">
          <ModelSelector
            dropUp={modelMenuDropUp}
            value={model}
            onChange={onModelChange}
          />
          <SendButton
            streaming={streaming}
            onClick={streaming ? onStop : submit}
          />
        </div>
      </div>
    </div>
  );
}
