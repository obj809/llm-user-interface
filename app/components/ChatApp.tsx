"use client";

import { useEffect, useRef, useState } from "react";
import ChatBox from "./ChatBox";
import ChatMessage, { type Message } from "./ChatMessage";
import Spark from "./Spark";

type Turn = { user: Message; assistant: Message | null };

const ERROR_MESSAGE =
  "Sorry — something went wrong reaching the model. Please try again.";

// Group the flat message list into user/assistant turns.
function toTurns(messages: Message[]): Turn[] {
  const turns: Turn[] = [];
  for (const message of messages) {
    if (message.role === "user") {
      turns.push({ user: message, assistant: null });
    } else if (turns.length > 0) {
      turns[turns.length - 1].assistant = message;
    }
  }
  return turns;
}

export default function ChatApp() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [thinking, setThinking] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastTurnRef = useRef<HTMLDivElement>(null);
  const idCounter = useRef(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const hasMessages = messages.length > 0;

  const nextId = () => ++idCounter.current;

  // Track the scroll viewport height so the newest turn can fill it,
  // letting it sit at the top while earlier turns scroll off-screen.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => setViewportHeight(el.clientHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMessages]);

  // On each new user message, bring the newest turn to the top.
  const userCount = messages.filter((m) => m.role === "user").length;
  useEffect(() => {
    if (userCount === 0) return;
    lastTurnRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [userCount]);

  const handleSubmit = async (text: string) => {
    if (isStreaming) return;

    const userMessage: Message = { id: nextId(), role: "user", content: text };
    const assistantId = nextId();
    const history = [...messages, userMessage];

    setMessages([
      ...history,
      { id: assistantId, role: "assistant", content: "" },
    ]);
    setThinking(true);
    setIsStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map(({ role, content }) => ({ role, content })),
        }),
      });
      if (!res.ok || !res.body) throw new Error(`Request failed: ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let firstChunk = true;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (!chunk) continue;
        if (firstChunk) {
          setThinking(false);
          firstChunk = false;
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: m.content + chunk } : m,
          ),
        );
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: ERROR_MESSAGE } : m,
        ),
      );
    } finally {
      setThinking(false);
      setIsStreaming(false);
    }
  };

  // Welcome view — shown before the first message is sent.
  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4">
        <h1 className="mb-8 text-center font-serif text-5xl tracking-tight text-[#5b6650] dark:text-[#c8ccbf]">
          LLM User Interface
        </h1>
        <ChatBox onSubmit={handleSubmit} />
      </div>
    );
  }

  // Chat view — conversation above, docked input below.
  const turns = toTurns(messages);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[52rem] px-4 py-8">
          {turns.map((turn, i) => {
            const isLast = i === turns.length - 1;
            return (
              <div
                key={turn.user.id}
                ref={isLast ? lastTurnRef : undefined}
                style={isLast ? { minHeight: viewportHeight || undefined } : undefined}
                className="scroll-mt-8 space-y-6 pb-10"
              >
                <ChatMessage message={turn.user} />
                {turn.assistant && turn.assistant.content.length > 0 && (
                  <ChatMessage message={turn.assistant} />
                )}
                {isLast && thinking && <Spark className="animate-pulse" />}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mx-auto w-full max-w-[52rem] px-4 pb-4">
        <ChatBox
          onSubmit={handleSubmit}
          placeholder="Write a message…"
          modelMenuDropUp
          disabled={isStreaming}
        />
        <p className="mt-2 text-center text-xs text-zinc-500">
          LLM User Interface is connected to AI which can make mistakes. Please
          double-check responses.
        </p>
      </div>
    </div>
  );
}
