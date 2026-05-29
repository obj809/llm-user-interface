"use client";

import { useState } from "react";
import SendButton from "./SendButton";
import ModelSelector from "./ModelSelector";

type ChatBoxProps = {
  onSubmit?: (text: string) => void;
  placeholder?: string;
  modelMenuDropUp?: boolean;
};

export default function ChatBox({
  onSubmit,
  placeholder = "How can I help you today?",
  modelMenuDropUp = false,
}: ChatBoxProps) {
  const [value, setValue] = useState("");

  const submit = () => {
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
    <div className="relative w-full max-w-[52rem] rounded-[28px] border border-zinc-300 bg-white px-5 pb-3 pt-5 shadow-2xl dark:border-zinc-700/60 dark:bg-[#1c1c1c]">
      {/* Input */}
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={2}
        placeholder={placeholder}
        className="block w-full resize-none bg-transparent text-lg text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100 dark:placeholder:text-zinc-500"
      />

      {/* Bottom toolbar */}
      <div className="mt-6 flex items-center justify-end">
        <div className="flex items-center gap-4">
          <ModelSelector dropUp={modelMenuDropUp} />
          <SendButton onClick={submit} />
        </div>
      </div>
    </div>
  );
}
