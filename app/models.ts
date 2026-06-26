// Shared model registry. Used by the client (ModelSelector) to render choices
// and by the API route to dispatch a request to the right provider.

export type ModelId =
  | "gemini-2.5-flash"
  | "llama3.2"
  // | "deepseek-r1"   // hidden from UI; see the commented entry in MODELS below
  | "gpt-5.4-mini"
  | "claude-haiku-4-5"
  | "rag-v1";

// "google" is retained for the optional direct-Gemini path in the API route
// (commented out there; handy for local dev without the VPS gateway).
export type ModelProvider = "litellm" | "rag" | "google";

export type ModelInfo = {
  id: ModelId;
  label: string;
  // `litellm` models are served through the OpenAI-compatible LiteLLM gateway
  // on the VPS (GPT, Gemini, Ollama all behind one endpoint); `rag` proxies
  // the standalone RAG backend.
  provider: ModelProvider;
  // The model name sent upstream. For LiteLLM it must match a `model_name`
  // registered in the gateway config; defaults to `id` when omitted.
  upstreamModel?: string;
  // Temporarily hide a model from the picker and reject it at the API.
  // Flip back to `false`/remove to re-enable.
  disabled?: boolean;
};

export const MODELS: readonly ModelInfo[] = [
  // Registered in the gateway but parked behind `disabled`; flip to re-enable.
  // The UI id stays friendly while `upstreamModel` matches the `model_name`
  // registered in the gateway config. For local dev you can switch this to
  // `provider: "google"` and re-enable the direct path in the API route.
  {
    id: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    provider: "litellm",
    upstreamModel: "gemini-flash",
    disabled: true,
  },
  // Local model served through the Ollama container behind the LiteLLM
  // gateway. The id already equals the gateway `model_name`, so `upstreamModel`
  // is omitted (the route falls back to `id`). Note: on CPU it's slow.
  {
    id: "llama3.2",
    label: "Llama 3.2 (local)",
    provider: "litellm",
  },
  // DeepSeek-R1 is registered in the gateway but hidden from the UI: it's a
  // reasoning model and takes minutes per reply on CPU. Uncomment this entry
  // (and its `ModelId` union member above) to surface it again.
  // {
  //   id: "deepseek-r1",
  //   label: "DeepSeek-R1 (local)",
  //   provider: "litellm",
  // },
  // Registered in the gateway but parked behind `disabled` until we surface it;
  // flip `disabled` to re-enable.
  {
    id: "gpt-5.4-mini",
    label: "GPT-5.4 mini",
    provider: "litellm",
    upstreamModel: "gpt-5.4-mini",
    disabled: true,
  },
  // Served via the LiteLLM gateway; the picker's default surfaced model.
  {
    id: "claude-haiku-4-5",
    label: "Claude Haiku 4.5",
    provider: "litellm",
    upstreamModel: "claude-haiku-4-5",
  },
  // Standalone RAG backend over the EPBC Act 1999. The label names the
  // document on purpose: it answers questions about that report only, not
  // general chat.
  {
    id: "rag-v1",
    label: "EPBC Act 1999 (RAG)",
    provider: "rag",
  },
];

// Models the client should offer for selection (excludes disabled ones).
export const AVAILABLE_MODELS: readonly ModelInfo[] = MODELS.filter(
  (m) => !m.disabled,
);

export const DEFAULT_MODEL_ID: ModelId = "claude-haiku-4-5";

export function getModel(id: string): ModelInfo | undefined {
  return MODELS.find((m) => m.id === id);
}
