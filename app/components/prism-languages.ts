// On-demand loader for Prism language grammars.
//
// `prism-react-renderer` vendors only a small subset of languages (Python,
// JS/TS, Go, Rust, …). To highlight *any* language we expose its bundled
// `Prism` instance as the global that `prismjs`'s grammar files register onto,
// then dynamically import the grammar for a given language the first time it's
// used. Unknown languages fall back to plain text (the import throws and is
// swallowed), so this never breaks rendering.
import { Prism } from "prism-react-renderer";

// prismjs grammar files reference a global `Prism`; point it at the vendored
// instance so loaded grammars augment the one `Highlight` actually tokenizes
// with.
const globalScope = (typeof window !== "undefined" ? window : global) as unknown as {
  Prism?: typeof Prism;
};
globalScope.Prism = Prism;

// Common fence tags → the canonical prismjs grammar name.
const ALIASES: Record<string, string> = {
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  console: "bash",
  "shell-session": "bash",
  rb: "ruby",
  py: "python",
  js: "javascript",
  node: "javascript",
  ts: "typescript",
  "c++": "cpp",
  cc: "cpp",
  cxx: "cpp",
  "c#": "csharp",
  cs: "csharp",
  rs: "rust",
  golang: "go",
  kt: "kotlin",
  "objective-c": "objectivec",
  objc: "objectivec",
  yml: "yaml",
  md: "markdown",
  tex: "latex",
  ps: "powershell",
  ps1: "powershell",
  dockerfile: "docker",
  proto: "protobuf",
  jsonc: "json5",
  html: "markup",
  xml: "markup",
  svg: "markup",
  vue: "markup",
};

// Grammars that require other grammars to be loaded first.
const PREREQUISITES: Record<string, string[]> = {
  cpp: ["c"],
  arduino: ["cpp"],
  glsl: ["c"],
  php: ["markup-templating"],
  phpdoc: ["php", "javadoclike"],
  "markup-templating": ["markup"],
  ejs: ["javascript", "markup-templating"],
  erb: ["ruby", "markup-templating"],
  handlebars: ["markup-templating"],
  twig: ["markup", "markup-templating"],
  smarty: ["markup-templating"],
  django: ["markup-templating"],
  scala: ["java"],
  groovy: ["clike"],
  java: ["clike"],
  csharp: ["clike"],
  dart: ["clike"],
  haxe: ["clike"],
  kotlin: ["clike"],
  scss: ["css"],
  sass: ["css"],
  less: ["css"],
  coffeescript: ["javascript"],
  flow: ["javascript"],
  qml: ["javascript"],
  crystal: ["ruby"],
  aspnet: ["markup", "csharp"],
  cshtml: ["markup", "csharp"],
  solidity: ["clike"],
  jsx: ["markup", "javascript"],
  tsx: ["jsx", "typescript"],
  typescript: ["javascript"],
};

export function resolveLanguage(raw: string): string {
  const lang = raw.toLowerCase();
  return ALIASES[lang] ?? lang;
}

export function isLoaded(language: string): boolean {
  return Boolean(Prism.languages[language]);
}

const inFlight = new Map<string, Promise<void>>();

export function ensureLanguage(language: string): Promise<void> {
  if (isLoaded(language)) return Promise.resolve();
  const cached = inFlight.get(language);
  if (cached) return cached;

  const load = (async () => {
    for (const dep of PREREQUISITES[language] ?? []) {
      await ensureLanguage(dep);
    }
    try {
      await import(`prismjs/components/prism-${language}`);
    } catch {
      // Unknown/unsupported language — leave it to render as plain text.
    }
  })();

  inFlight.set(language, load);
  return load;
}
