"use client";

import { useEffect, useRef, useState } from "react";
import ChatBox from "./ChatBox";
import ChatMessage, { type Message } from "./ChatMessage";
import HomeButton from "./HomeButton";
import Spark from "./Spark";
import ThemeToggle from "./ThemeToggle";
import { DEFAULT_MODEL_ID, type ModelId } from "../models";

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
  const [model, setModel] = useState<ModelId>(DEFAULT_MODEL_ID);
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

    // Decouple received text from displayed text: chunks arrive in bursts,
    // so we buffer them in `target` and reveal characters smoothly via rAF.
    let target = "";
    let streamDone = false;
    let rafId = 0;

    const typing = new Promise<void>((resolve) => {
      let shown = 0;
      let shownFirst = false;
      const tick = () => {
        if (shown < target.length) {
          // Reveal a fraction of the remaining buffer so it keeps pace with
          // fast streams while still feeling like steady typing.
          const step = Math.max(1, Math.ceil((target.length - shown) / 40));
          shown = Math.min(target.length, shown + step);
          if (!shownFirst) {
            setThinking(false);
            shownFirst = true;
          }
          const slice = target.slice(0, shown);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: slice } : m,
            ),
          );
          rafId = requestAnimationFrame(tick);
        } else if (streamDone) {
          resolve();
        } else {
          rafId = requestAnimationFrame(tick);
        }
      };
      rafId = requestAnimationFrame(tick);
    });

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map(({ role, content }) => ({ role, content })),
          model,
        }),
      });
      if (!res.ok || !res.body) throw new Error(`Request failed: ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        target += decoder.decode(value, { stream: true });
      }
      streamDone = true;
      await typing; // let the typewriter finish revealing the buffer
    } catch {
      streamDone = true;
      cancelAnimationFrame(rafId);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: ERROR_MESSAGE } : m,
        ),
      );
    } finally {
      cancelAnimationFrame(rafId);
      setThinking(false);
      setIsStreaming(false);
    }
  };

  // Reset to the welcome screen, clearing the conversation. Any in-flight
  // stream keeps targeting its (now-absent) message id, so it harmlessly
  // no-ops against the empty list.
  const handleHome = () => {
    setMessages([]);
    setThinking(false);
    setIsStreaming(false);
  };

  // Fixed top-right toolbar: theme toggle, with the home button to its right.
  const toolbar = (
    <div className="fixed right-6 top-4 z-10 flex items-center gap-1">
      <ThemeToggle />
      <HomeButton onClick={handleHome} />
    </div>
  );

  // Welcome view — shown before the first message is sent.
  if (messages.length === 0) {
    return (
      <>
        {toolbar}
        <div className="flex flex-1 flex-col items-center justify-center px-4">
          <h1 className="mb-8 text-center font-serif text-5xl tracking-tight text-[#5b6650] dark:text-[#c8ccbf]">
            LLM User Interface
          </h1>
          <ChatBox
            onSubmit={handleSubmit}
            model={model}
            onModelChange={setModel}
          />
        </div>
      </>
    );
  }

  // Chat view — conversation above, docked input below.
  const turns = toTurns(messages);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {toolbar}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[52rem] px-4 py-8">
          {turns.map((turn, i) => {
            const isLast = i === turns.length - 1;
            // The newest turn reserves a viewport so it can scroll to the top
            // while earlier turns slide off-screen. The very first turn has
            // nothing above it, so reserving space there would only create an
            // empty overflow (and a needless scrollbar) for short replies.
            const reserveViewport = isLast && i > 0;
            return (
              <div
                key={turn.user.id}
                ref={isLast ? lastTurnRef : undefined}
                style={reserveViewport ? { minHeight: viewportHeight || undefined } : undefined}
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
          model={model}
          onModelChange={setModel}
        />
        <p className="mt-2 text-center text-xs text-zinc-500">
          LLM User Interface is connected to AI which can make mistakes. Please
          double-check responses.
        </p>
      </div>
    </div>
  );
}
