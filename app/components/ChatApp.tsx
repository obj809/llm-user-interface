"use client";

import { useEffect, useRef, useState } from "react";
import ChatBox from "./ChatBox";
import ChatMessage, { type Message } from "./ChatMessage";
import HomeButton from "./HomeButton";
import ThemeToggle from "./ThemeToggle";
import ThinkingDot from "./ThinkingDot";
import { DEFAULT_MODEL_ID, type ModelId } from "../models";
import { toTurns } from "../lib/messages";

const ERROR_MESSAGE =
  "Sorry — something went wrong reaching the model. Please try again.";

export default function ChatApp() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [thinking, setThinking] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [model, setModel] = useState<ModelId>(DEFAULT_MODEL_ID);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastTurnRef = useRef<HTMLDivElement>(null);
  const idCounter = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const stoppedRef = useRef(false);
  const followRef = useRef(true);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [lastTurnHeight, setLastTurnHeight] = useState(0);
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

  // Track the newest turn's height (it grows as the reply streams) so we can
  // reserve *exactly* enough trailing space for it to reach the top — no more,
  // which would otherwise be empty space the user could scroll into.
  useEffect(() => {
    const el = lastTurnRef.current;
    if (!el) return;
    const update = () => setLastTurnHeight(el.offsetHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [userCount]);

  // Auto-follow toggles: any upward gesture (wheel/touch) hands control back to
  // the user; returning to the bottom resumes following the streamed text.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const pauseIfUp = (delta: number) => {
      if (delta < 0) followRef.current = false;
    };
    const onWheel = (e: WheelEvent) => pauseIfUp(e.deltaY);
    let lastY = 0;
    const onTouchStart = (e: TouchEvent) => {
      lastY = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0].clientY;
      pauseIfUp(lastY - y);
      lastY = y;
    };
    const onScroll = () => {
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (distance < 24) followRef.current = true;
    };
    el.addEventListener("wheel", onWheel, { passive: true });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("scroll", onScroll);
    };
  }, [hasMessages]);

  // While a reply streams, keep the newest text in view once it overflows the
  // viewport. We follow the last turn's *own* bottom edge rather than the
  // scroll height: the trailing spacer is recomputed a frame late, so reading
  // scrollHeight here would overshoot and then snap back, jittering the text.
  // Nudging only downward (`overflow > 0`) leaves short replies pinned at top.
  const streamingText = isStreaming
    ? (messages[messages.length - 1]?.content ?? "")
    : "";
  useEffect(() => {
    if (!isStreaming || !followRef.current) return;
    const el = scrollRef.current;
    const turn = lastTurnRef.current;
    if (!el || !turn) return;
    const overflow =
      turn.getBoundingClientRect().bottom - el.getBoundingClientRect().bottom;
    if (overflow > 0) el.scrollTop += overflow;
  }, [streamingText, isStreaming]);

  const handleSubmit = async (text: string) => {
    if (isStreaming) return;

    const userMessage: Message = { id: nextId(), role: "user", content: text };
    const assistantId = nextId();
    const history = [...messages, userMessage];

    setMessages([
      ...history,
      { id: assistantId, role: "assistant", content: "", model },
    ]);
    followRef.current = true;
    setThinking(true);
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;
    stoppedRef.current = false;

    // Decouple received text from displayed text: chunks arrive in bursts,
    // so we buffer them in `target` and reveal characters smoothly via rAF.
    let target = "";
    let streamDone = false;
    let rafId = 0;

    const typing = new Promise<void>((resolve) => {
      let shown = 0;
      let shownFirst = false;
      const tick = () => {
        // A user stop freezes the reveal at the current slice and lets
        // `await typing` resolve so the finally block can reset state.
        if (stoppedRef.current) {
          resolve();
          return;
        }
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
        signal: controller.signal,
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
      await typing;
    } catch {
      streamDone = true;
      cancelAnimationFrame(rafId);
      if (!stoppedRef.current) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: ERROR_MESSAGE } : m,
          ),
        );
      }
    } finally {
      cancelAnimationFrame(rafId);
      abortRef.current = null;
      setThinking(false);
      setIsStreaming(false);
    }
  };

  // Stop an in-flight reply: freeze the typewriter at the revealed text and
  // abort the network read. The tick/catch/finally machinery then winds the
  // stream down and unlocks the input, so we mutate no state directly here.
  const handleStop = () => {
    stoppedRef.current = true;
    abortRef.current?.abort();
  };

  // Reset to the welcome screen, clearing the conversation. Tear down any
  // in-flight stream so it stops fetching instead of running to completion
  // against the now-empty message list.
  const handleHome = () => {
    stoppedRef.current = true;
    abortRef.current?.abort();
    setMessages([]);
    setThinking(false);
    setIsStreaming(false);
  };

  // Top-right toolbar: theme toggle, with the home button to its right.
  const toolbar = (
    <div className="fixed right-3 top-3 z-10 flex items-center gap-1 sm:right-6 sm:top-4">
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
          <h1 className="mb-6 text-center font-serif text-3xl tracking-tight text-[#5b6650] sm:mb-8 sm:text-4xl md:text-5xl dark:text-[#c8ccbf]">
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

  // Trailing space that lets the newest turn scroll to the top while earlier
  // turns slide off-screen. We reserve only the viewport left over below the
  // turn (minus the top gap + bottom padding the scroll area already has), so
  // scrolling stops right at the content instead of into empty space. The
  // first turn needs none — there's nothing above it to scroll away.
  const SCROLL_GUTTERS = 64;
  const tailSpace =
    turns.length > 1
      ? Math.max(0, viewportHeight - lastTurnHeight - SCROLL_GUTTERS)
      : 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {toolbar}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[52rem] px-4 pb-8 pt-12 sm:pt-8">
          {turns.map((turn, i) => {
            const isLast = i === turns.length - 1;
            return (
              <div
                key={turn.user.id}
                ref={isLast ? lastTurnRef : undefined}
                className="scroll-mt-8 space-y-6 pb-10"
              >
                <ChatMessage message={turn.user} />
                {turn.assistant && turn.assistant.content.length > 0 && (
                  <ChatMessage message={turn.assistant} />
                )}
                {isLast && thinking && <ThinkingDot />}
              </div>
            );
          })}
          {tailSpace > 0 && <div style={{ height: tailSpace }} aria-hidden />}
        </div>
      </div>

      <div className="mx-auto w-full max-w-[52rem] px-4 pb-4">
        <ChatBox
          onSubmit={handleSubmit}
          placeholder="Write a message…"
          modelMenuDropUp
          disabled={isStreaming}
          streaming={isStreaming}
          onStop={handleStop}
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
