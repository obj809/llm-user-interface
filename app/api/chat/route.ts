import OpenAI from "openai";
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

  // Every other model is served through the LiteLLM gateway on the VPS, which
  // is OpenAI-compatible — so a single client covers GPT, Gemini, and Ollama.
  const baseURL = process.env.LITELLM_BASE_URL;
  const apiKey = process.env.LITELLM_API_KEY;
  if (!baseURL || !apiKey) {
    return Response.json(
      { error: "LITELLM_BASE_URL and LITELLM_API_KEY must be set on the server." },
      { status: 500 },
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        await streamLiteLLM(
          baseURL,
          apiKey,
          model.upstreamModel ?? model.id,
          messages,
          controller,
          encoder,
        );
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
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

// LiteLLM speaks the OpenAI API, so the same SDK drives the gateway by pointing
// `baseURL` at it. Roles (`user`/`assistant`) pass through unchanged.
async function streamLiteLLM(
  baseURL: string,
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
) {
  const client = new OpenAI({ baseURL, apiKey });
  const result = await client.chat.completions.create({
    model,
    messages,
    stream: true,
  });
  for await (const chunk of result) {
    const text = chunk.choices[0]?.delta?.content;
    if (text) controller.enqueue(encoder.encode(text));
  }
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
