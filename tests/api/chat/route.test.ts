// @vitest-environment node
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  afterAll,
} from "vitest";

// Shared mock fns for the two provider SDKs, created before the module mocks
// run (vi.hoisted) so the factories can close over them.
const { generateContentStream, openaiCreate } = vi.hoisted(() => ({
  generateContentStream: vi.fn(),
  openaiCreate: vi.fn(),
}));

// Regular functions (not arrows) so they're usable as constructors (`new`).
vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn(function () {
    return { models: { generateContentStream } };
  }),
}));
vi.mock("openai", () => ({
  default: vi.fn(function () {
    return { chat: { completions: { create: openaiCreate } } };
  }),
}));

import { POST } from "@/app/api/chat/route";

async function* asyncChunks<T>(chunks: T[]) {
  for (const chunk of chunks) yield chunk;
}

function postJson(body: unknown) {
  return POST(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  generateContentStream.mockReset();
  openaiCreate.mockReset();
  process.env.GEMINI_API_KEY = "test-gemini-key";
  process.env.OPENAI_API_KEY = "test-openai-key";
});

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

describe("validation", () => {
  it("returns 400 for invalid JSON", async () => {
    const res = await postJson("{ not valid json");
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Invalid JSON/i);
  });

  it("returns 400 when messages is missing or empty", async () => {
    expect((await postJson({})).status).toBe(400);
    expect((await postJson({ messages: [] })).status).toBe(400);
    expect((await postJson({ messages: "nope" })).status).toBe(400);
  });

  it("returns 400 for an unknown model", async () => {
    const res = await postJson({
      messages: [{ role: "user", content: "hi" }],
      model: "made-up-model",
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Unknown model/i);
  });

  it("returns 500 when the selected provider's key is missing", async () => {
    delete process.env.GEMINI_API_KEY;
    const res = await postJson({ messages: [{ role: "user", content: "hi" }] });
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/GEMINI_API_KEY/);
  });
});

describe("Gemini provider (default model)", () => {
  it("streams concatenated chunks as text/plain", async () => {
    generateContentStream.mockReturnValue(
      asyncChunks([{ text: "Hello" }, { text: ", world" }]),
    );
    const res = await postJson({ messages: [{ role: "user", content: "hi" }] });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toMatch(/text\/plain/);
    expect(await res.text()).toBe("Hello, world");
  });

  it("maps roles to Gemini's contents format (assistant -> model)", async () => {
    generateContentStream.mockReturnValue(asyncChunks([{ text: "ok" }]));
    await (
      await postJson({
        messages: [
          { role: "user", content: "hi" },
          { role: "assistant", content: "yo" },
        ],
      })
    ).text();

    expect(generateContentStream).toHaveBeenCalledWith({
      model: "gemini-2.5-flash-lite",
      contents: [
        { role: "user", parts: [{ text: "hi" }] },
        { role: "model", parts: [{ text: "yo" }] },
      ],
    });
  });

  it("propagates a provider error onto the stream", async () => {
    generateContentStream.mockImplementation(() => {
      throw new Error("boom");
    });
    const res = await postJson({ messages: [{ role: "user", content: "hi" }] });
    await expect(res.text()).rejects.toThrow();
  });
});

describe("RAG provider", () => {
  const ragFetch = vi.fn();

  beforeEach(() => {
    ragFetch.mockReset();
    process.env.RAG_SERVER_URL = "http://rag.test";
    delete process.env.RAG_API_KEY;
    vi.stubGlobal("fetch", ragFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const MESSAGES = [
    { role: "user", content: "hi" },
    { role: "assistant", content: "yo" },
    { role: "user", content: "What is the net-zero target year?" },
  ];

  it("forwards the full history verbatim and pipes the stream through", async () => {
    ragFetch.mockResolvedValue(new Response("Net zero by 2050 [page 3]"));

    const res = await postJson({ messages: MESSAGES, model: "rag-v1" });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toMatch(/text\/plain/);
    expect(await res.text()).toBe("Net zero by 2050 [page 3]");

    expect(ragFetch).toHaveBeenCalledWith(
      "http://rag.test/chat",
      expect.objectContaining({ method: "POST" }),
    );
    const sentBody = JSON.parse(ragFetch.mock.calls[0][1].body);
    expect(sentBody).toEqual({ messages: MESSAGES });
  });

  it("sends X-API-Key when RAG_API_KEY is set", async () => {
    process.env.RAG_API_KEY = "test-secret";
    ragFetch.mockResolvedValue(new Response("ok"));

    await postJson({ messages: MESSAGES, model: "rag-v1" });

    expect(ragFetch.mock.calls[0][1].headers).toEqual({
      "Content-Type": "application/json",
      "X-API-Key": "test-secret",
    });
  });

  it("omits X-API-Key when RAG_API_KEY is unset", async () => {
    ragFetch.mockResolvedValue(new Response("ok"));

    await postJson({ messages: MESSAGES, model: "rag-v1" });

    expect(ragFetch.mock.calls[0][1].headers).toEqual({
      "Content-Type": "application/json",
    });
  });

  it("returns 502 when the RAG server responds non-200", async () => {
    ragFetch.mockResolvedValue(new Response("boom", { status: 503 }));

    const res = await postJson({ messages: MESSAGES, model: "rag-v1" });
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/503/);
  });

  it("returns 500 when RAG_SERVER_URL is unset, without calling fetch", async () => {
    delete process.env.RAG_SERVER_URL;

    const res = await postJson({ messages: MESSAGES, model: "rag-v1" });
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/RAG_SERVER_URL/);
    expect(ragFetch).not.toHaveBeenCalled();
  });
});

describe("OpenAI provider (temporarily disabled)", () => {
  it("rejects the disabled openai model with 400 and never calls the SDK", async () => {
    const res = await postJson({
      messages: [{ role: "user", content: "hi" }],
      model: "gpt-4.1-nano",
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/unavailable/i);
    expect(openaiCreate).not.toHaveBeenCalled();
  });
});
