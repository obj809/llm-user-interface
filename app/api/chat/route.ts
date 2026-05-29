import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "gemini-2.5-flash";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "GEMINI_API_KEY is not set on the server." },
      { status: 500 },
    );
  }

  let messages: ChatMessage[];
  try {
    ({ messages } = await request.json());
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json(
      { error: "`messages` must be a non-empty array." },
      { status: 400 },
    );
  }

  // Map the UI's messages to Gemini's `contents` format.
  const contents = messages.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  }));

  const ai = new GoogleGenAI({ apiKey });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const result = await ai.models.generateContentStream({
          model: MODEL,
          contents,
        });
        for await (const chunk of result) {
          if (chunk.text) {
            controller.enqueue(encoder.encode(chunk.text));
          }
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
