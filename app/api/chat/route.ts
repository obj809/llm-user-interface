// Direct-Gemini path (commented out): handy for local development without the
// VPS LiteLLM gateway. To re-enable, uncomment this import and `streamGemini`
// below, set a model's `provider` to "google" in app/models.ts, dispatch it to
// `streamGemini`, and provide GEMINI_API_KEY.
// import { GoogleGenAI } from "@google/genai";
import { DEFAULT_MODEL_ID, getModel } from "@/app/models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatRequest = {
  messages: ChatMessage[];
  model?: string;
};

export async function POST(request: Request) {
  let body: ChatRequest;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { messages } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json(
      { error: "`messages` must be a non-empty array." },
      { status: 400 },
    );
  }

  const model = getModel(body.model ?? DEFAULT_MODEL_ID);
  if (!model) {
    return Response.json(
      { error: `Unknown model: ${body.model}` },
      { status: 400 },
    );
  }
  if (model.disabled) {
    return Response.json(
      { error: `Model is currently unavailable: ${model.id}` },
      { status: 400 },
    );
  }

  // The RAG provider proxies an external server and returns its own
  // Response, so it branches off before the LiteLLM gateway path.
  if (model.provider === "rag") {
    const base = process.env.RAG_SERVER_URL;
    if (!base) {
      return Response.json(
        { error: "RAG_SERVER_URL is not set on the server." },
        { status: 500 },
      );
    }
    return streamRag(base, messages);
  }

  // Every other model is served through the LiteLLM service on the VPS, reached
  // via the standalone gateway (llm-api-gateway). The gateway holds the LiteLLM
  // key and talks to the litellm container directly over the VPS network, so
  // this route just forwards the conversation and streams the reply back.
  const gatewayUrl = process.env.GATEWAY_URL;
  if (!gatewayUrl) {
    return Response.json(
      { error: "GATEWAY_URL must be set on the server." },
      { status: 500 },
    );
  }
  return streamGateway(gatewayUrl, model.upstreamModel ?? model.id, messages);
}

// Proxy to the external RAG backend. Unlike the gateway path below, this is a
// pass-through: the upstream body streams to the client verbatim, and an
// upstream failure before any bytes flow becomes a real non-200 (the
// controller-callback style can only error an already started 200 stream).
async function streamRag(
  base: string,
  messages: ChatMessage[],
): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  // Origin shared-secret auth: only sent when configured, so a keyless local
  // backend keeps working without the env var.
  if (process.env.RAG_API_KEY) {
    headers["X-API-Key"] = process.env.RAG_API_KEY;
  }
  // Cloudflare Access service token: when the RAG host sits behind a Cloudflare
  // Access policy, these let this server through while the public is blocked at
  // the edge. Both are required, so only send the pair when both are set.
  if (process.env.CF_ACCESS_CLIENT_ID && process.env.CF_ACCESS_CLIENT_SECRET) {
    headers["CF-Access-Client-Id"] = process.env.CF_ACCESS_CLIENT_ID;
    headers["CF-Access-Client-Secret"] = process.env.CF_ACCESS_CLIENT_SECRET;
  }

  const upstream = await fetch(`${base}/chat`, {
    method: "POST",
    headers,
    // Full history, verbatim — the backend uses the last user message as the
    // query today but accepts the whole conversation.
    body: JSON.stringify({ messages }),
  });
  if (!upstream.ok || !upstream.body) {
    return Response.json(
      { error: `RAG server responded ${upstream.status}` },
      { status: 502 },
    );
  }
  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

// Forward to the llm-api-gateway. Like the RAG path, this is a pass-through: the
// gateway streams `text/plain` content deltas, piped to the client verbatim. The
// gateway opens the LiteLLM completion before committing its 200, so a pre-stream
// failure (bad key → 401, litellm unreachable → 502) arrives here as a real
// non-200 and is surfaced with that status instead of corrupting a 200 stream.
async function streamGateway(
  base: string,
  model: string,
  messages: ChatMessage[],
): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  // Shared-secret auth: only sent when configured, so a keyless local gateway
  // keeps working without the env var.
  if (process.env.GATEWAY_API_KEY) {
    headers["X-Gateway-Key"] = process.env.GATEWAY_API_KEY;
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${base}/chat`, {
      method: "POST",
      headers,
      // The gateway expects the already-resolved upstream model name.
      body: JSON.stringify({ messages, model }),
    });
  } catch {
    return Response.json(
      { error: "The LiteLLM gateway could not be reached." },
      { status: 502 },
    );
  }

  if (!upstream.ok || !upstream.body) {
    return Response.json(
      { error: `The LiteLLM gateway responded ${upstream.status}.` },
      { status: upstream.status },
    );
  }
  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

// Direct-Gemini path — preserved for local development without the LiteLLM
// gateway. To use: uncomment the `@google/genai` import above and this
// function, set the model's `provider` to "google" in app/models.ts, dispatch
// it here (e.g. `if (model.provider === "google") await streamGemini(...)`),
// and set GEMINI_API_KEY.
//
// async function streamGemini(
//   apiKey: string,
//   model: string,
//   messages: ChatMessage[],
//   controller: ReadableStreamDefaultController<Uint8Array>,
//   encoder: TextEncoder,
// ) {
//   const ai = new GoogleGenAI({ apiKey });
//   // Map the UI's messages to Gemini's `contents` format.
//   const contents = messages.map((message) => ({
//     role: message.role === "assistant" ? "model" : "user",
//     parts: [{ text: message.content }],
//   }));
//
//   const result = await ai.models.generateContentStream({ model, contents });
//   for await (const chunk of result) {
//     if (chunk.text) controller.enqueue(encoder.encode(chunk.text));
//   }
// }
