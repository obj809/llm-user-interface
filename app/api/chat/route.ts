import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
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

  const apiKey =
    model.provider === "openai"
      ? process.env.OPENAI_API_KEY
      : process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const envName =
      model.provider === "openai" ? "OPENAI_API_KEY" : "GEMINI_API_KEY";
    return Response.json(
      { error: `${envName} is not set on the server.` },
      { status: 500 },
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        if (model.provider === "openai") {
          await streamOpenAI(apiKey, model.id, messages, controller, encoder);
        } else {
          await streamGemini(apiKey, model.id, messages, controller, encoder);
        }
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

async function streamGemini(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
) {
  const ai = new GoogleGenAI({ apiKey });
  // Map the UI's messages to Gemini's `contents` format.
  const contents = messages.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  }));

  const result = await ai.models.generateContentStream({ model, contents });
  for await (const chunk of result) {
    if (chunk.text) controller.enqueue(encoder.encode(chunk.text));
  }
}

async function streamOpenAI(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
) {
  const openai = new OpenAI({ apiKey });
  // OpenAI's chat roles (`user`/`assistant`) match the UI's directly.
  const result = await openai.chat.completions.create({
    model,
    messages,
    stream: true,
  });
  for await (const chunk of result) {
    const text = chunk.choices[0]?.delta?.content;
    if (text) controller.enqueue(encoder.encode(text));
  }
}
