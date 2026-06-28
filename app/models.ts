// Shared model registry. Used by the client (ModelSelector) to render choices
// and by the API route to dispatch a request to the right provider.

export type ModelId =
  | "gemini-2.5-flash"
  | "llama3.2"
  // | "deepseek-r1"   // hidden from UI; see the commented entry in MODELS below
  | "gpt-5.4-mini"
  | "claude-haiku-4-5"
  | "rag-v1";

// `litellm` routes through the VPS gateway. `google` / `openai` / `anthropic` are
// optional direct-to-provider paths in the API route (using GEMINI_API_KEY /
// OPENAI_API_KEY / ANTHROPIC_API_KEY) so the app can run without the gateway.
export type ModelProvider = "litellm" | "rag" | "google" | "openai" | "anthropic";

export type ModelInfo = {
  id: ModelId;
  label: string;
  // `litellm` models are served through the OpenAI-compatible LiteLLM gateway
  // on the VPS (GPT, Gemini, Ollama all behind one endpoint); `rag` proxies
  // the standalone RAG backend; `google` / `openai` / `anthropic` call the
  // provider's API directly.
  provider: ModelProvider;
  // The model name sent upstream. For LiteLLM it must match a `model_name`
  // registered in the gateway config; for a direct provider it must be that
  // provider's API model name. Defaults to `id` when omitted.
  upstreamModel?: string;
  // Temporarily hide a model from the picker and reject it at the API.
  // Flip back to `false`/remove to re-enable.
  disabled?: boolean;
};

export const MODELS: readonly ModelInfo[] = [
  // Direct-to-Google via @google/genai (needs GEMINI_API_KEY). The `id` is the
  // real Gemini API model name, so `upstreamModel` is omitted. Disabled by
  // default — flip `disabled` to surface it. To route through the VPS gateway
  // instead, set `provider: "litellm"` and `upstreamModel` to the gateway
  // `model_name` (e.g. "gemini-flash").
  {
    id: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    provider: "google",
    disabled: true,
  },
  // Local model served through the Ollama container behind the LiteLLM
  // gateway. The id already equals the gateway `model_name`, so `upstreamModel`
  // is omitted (the route falls back to `id`). Note: on CPU it's slow.
  {
    id: "llama3.2",
    label: "Llama 3.2 (ollama))",
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
  // Direct-to-OpenAI via the `openai` SDK (needs OPENAI_API_KEY). The `id` is the
  // real OpenAI API model name, so `upstreamModel` is omitted. Disabled by
  // default — flip `disabled` to surface it. Set `provider: "litellm"` to route
  // through the VPS gateway instead.
  {
    id: "gpt-5.4-mini",
    label: "GPT-5.4 mini",
    provider: "openai",
    disabled: true,
  },
  // Served via the LiteLLM gateway; the picker's default surfaced model.
  {
    id: "claude-haiku-4-5",
    label: "Claude Haiku 4.5",
    provider: "litellm",
    upstreamModel: "claude-haiku-4-5",
  },
  // Direct-to-Anthropic alternative to the gateway-backed entry above (needs
  // ANTHROPIC_API_KEY). Uncomment this entry AND add "claude-haiku-4-5-direct"
  // to the `ModelId` union above to use it; `upstreamModel` carries the exact
  // API model id. The `id` differs so it can coexist with the litellm
  // `claude-haiku-4-5` entry without a duplicate key.
  // {
  //   id: "claude-haiku-4-5-direct",
  //   label: "Claude Haiku 4.5 (direct)",
  //   provider: "anthropic",
  //   upstreamModel: "claude-haiku-4-5",
  //   disabled: true,
  // },
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
