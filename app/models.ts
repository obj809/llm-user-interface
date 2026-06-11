// Shared model registry. Used by the client (ModelSelector) to render choices
// and by the API route to dispatch a request to the right provider.

export type ModelId = "gemini-2.5-flash-lite" | "gpt-4.1-nano" | "rag-v1";

export type ModelInfo = {
  id: ModelId;
  label: string;
  provider: "google" | "openai" | "rag";
  // Temporarily hide a model from the picker and reject it at the API.
  // Flip back to `false`/remove to re-enable.
  disabled?: boolean;
};

export const MODELS: readonly ModelInfo[] = [
  {
    id: "gemini-2.5-flash-lite",
    label: "Gemini 2.5 Flash-Lite",
    provider: "google",
  },
  {
    id: "gpt-4.1-nano",
    label: "GPT-4.1 nano",
    provider: "openai",
    disabled: true,
  },
  // Local RAG backend over a single net-zero report (see RAG_INTEGRATION.md).
  // The label names the document on purpose: it answers questions about that
  // report only, not general chat.
  {
    id: "rag-v1",
    label: "Net-Zero Report (RAG)",
    provider: "rag",
  },
];

// Models the client should offer for selection (excludes disabled ones).
export const AVAILABLE_MODELS: readonly ModelInfo[] = MODELS.filter(
  (m) => !m.disabled,
);

export const DEFAULT_MODEL_ID: ModelId = "gemini-2.5-flash-lite";

export function getModel(id: string): ModelInfo | undefined {
  return MODELS.find((m) => m.id === id);
}
