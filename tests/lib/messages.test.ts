import { describe, it, expect } from "vitest";
import { toTurns } from "@/app/lib/messages";
import type { Message } from "@/app/components/ChatMessage";

const user = (id: number, content = `u${id}`): Message => ({
  id,
  role: "user",
  content,
});
const assistant = (id: number, content = `a${id}`): Message => ({
  id,
  role: "assistant",
  content,
});

describe("toTurns", () => {
  it("returns an empty list for no messages", () => {
    expect(toTurns([])).toEqual([]);
  });

  it("pairs each user message with the following assistant reply", () => {
    const turns = toTurns([user(1), assistant(2), user(3), assistant(4)]);
    expect(turns).toHaveLength(2);
    expect(turns[0]).toEqual({ user: user(1), assistant: assistant(2) });
    expect(turns[1]).toEqual({ user: user(3), assistant: assistant(4) });
  });

  it("leaves a trailing user message with a null assistant", () => {
    const turns = toTurns([user(1), assistant(2), user(3)]);
    expect(turns).toHaveLength(2);
    expect(turns[1].user).toEqual(user(3));
    expect(turns[1].assistant).toBeNull();
  });

  it("ignores a leading assistant message with no preceding user", () => {
    expect(toTurns([assistant(1)])).toEqual([]);
    expect(toTurns([assistant(1), user(2)])).toEqual([
      { user: user(2), assistant: null },
    ]);
  });

  it("attaches only the first assistant reply to a turn", () => {
    // Two assistant messages in a row: the second overwrites onto the same turn.
    const turns = toTurns([user(1), assistant(2), assistant(3, "later")]);
    expect(turns).toHaveLength(1);
    expect(turns[0].assistant).toEqual(assistant(3, "later"));
  });
});
