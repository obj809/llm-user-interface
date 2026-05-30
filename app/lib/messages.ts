import type { Message } from "../components/ChatMessage";

export type Turn = { user: Message; assistant: Message | null };

// Group the flat message list into user/assistant turns. A turn starts at each
// user message; a following assistant message attaches to the latest turn.
// Leading assistant messages (no preceding user) are ignored.
export function toTurns(messages: Message[]): Turn[] {
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
