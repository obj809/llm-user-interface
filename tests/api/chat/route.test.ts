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

// Mock the OpenAI SDK (used for the LiteLLM gateway). Created via vi.hoisted so
// the module-mock factory can close over it.
const { openaiCreate } = vi.hoisted(() => ({
  openaiCreate: vi.fn(),
}));

// Regular function (not an arrow) so it's usable as a constructor (`new`).
vi.mock("openai", () => ({
  default: vi.fn(function () {
    return { chat: { completions: { create: openaiCreate } } };
  }),
}));

import { POST } from "@/app/api/chat/route";
import { DEFAULT_MODEL_ID, getModel } from "@/app/models";

// The upstream model name the gateway should receive for the default model,
// derived from the registry so swapping the default doesn't break this test.
const DEFAULT_UPSTREAM_MODEL =
  getModel(DEFAULT_MODEL_ID)!.upstreamModel ?? DEFAULT_MODEL_ID;

async function* asyncChunks<T>(chunks: T[]) {
  for (const chunk of chunks) yield chunk;
}

// Build an OpenAI-style streaming chunk for a content delta.
function delta(content: string) {
  return { choices: [{ delta: { content } }] };
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
  openaiCreate.mockReset();
  process.env.LITELLM_BASE_URL = "http://litellm.test/v1";
  process.env.LITELLM_API_KEY = "test-litellm-key";
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

  it("returns 500 when the LiteLLM gateway config is missing", async () => {
    delete process.env.LITELLM_API_KEY;
    const res = await postJson({ messages: [{ role: "user", content: "hi" }] });
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/LITELLM/);
  });
});

describe("LiteLLM gateway (default model)", () => {
  it("streams concatenated chunks as text/plain", async () => {
    openaiCreate.mockResolvedValue(
      asyncChunks([delta("Hello"), delta(", world")]),
    );
    const res = await postJson({ messages: [{ role: "user", content: "hi" }] });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toMatch(/text\/plain/);
    expect(await res.text()).toBe("Hello, world");
  });

  it("passes the model id and messages through to the gateway", async () => {
    openaiCreate.mockResolvedValue(asyncChunks([delta("ok")]));
    const messages = [
      { role: "user", content: "hi" },
      { role: "assistant", content: "yo" },
    ];
    await (await postJson({ messages })).text();

    expect(openaiCreate).toHaveBeenCalledWith({
      model: DEFAULT_UPSTREAM_MODEL,
      messages,
      stream: true,
    });
  });

  it("propagates a gateway error onto the stream", async () => {
    openaiCreate.mockRejectedValue(new Error("boom"));
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
    delete process.env.CF_ACCESS_CLIENT_ID;
    delete process.env.CF_ACCESS_CLIENT_SECRET;
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

  it("sends the Cloudflare Access service-token headers when both are set", async () => {
    process.env.CF_ACCESS_CLIENT_ID = "cf-id";
    process.env.CF_ACCESS_CLIENT_SECRET = "cf-secret";
    ragFetch.mockResolvedValue(new Response("ok"));

    await postJson({ messages: MESSAGES, model: "rag-v1" });

    expect(ragFetch.mock.calls[0][1].headers).toEqual({
      "Content-Type": "application/json",
      "CF-Access-Client-Id": "cf-id",
      "CF-Access-Client-Secret": "cf-secret",
    });
  });

  it("omits the CF headers when only one of the pair is set", async () => {
    process.env.CF_ACCESS_CLIENT_ID = "cf-id";
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

describe("disabled model", () => {
  it("rejects the disabled gpt model with 400 and never calls the gateway", async () => {
    const res = await postJson({
      messages: [{ role: "user", content: "hi" }],
      model: "gpt-5.4-mini",
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/unavailable/i);
    expect(openaiCreate).not.toHaveBeenCalled();
  });
});
