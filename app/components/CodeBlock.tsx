"use client";

import { useEffect, useReducer, useState } from "react";
import { Highlight, type PrismTheme } from "prism-react-renderer";
import { copyToClipboard } from "../clipboard";
import { ensureLanguage, isLoaded, resolveLanguage } from "./prism-languages";

// Theme-aware syntax colors. Token colors reference CSS variables defined in
// globals.css under `:root` (GitHub Light) and `.dark` (Dracula), so the
// existing class-based dark-mode switch recolors highlighting with no JS.
// `entity`/`tag` and `variable` get their own variables because the two themes
// group them differently (e.g. tags are keyword-pink in Dracula, green in
// GitHub Light; variables are foreground in Dracula, orange in GitHub Light).
//
// `fontStyle` is typed as "normal" | "italic", but a CSS variable is valid at
// runtime (it resolves to one of those), so we cast where we drive it by var.
const italicVar = "var(--cb-comment-style)" as "italic";
const classItalicVar = "var(--cb-class-style)" as "italic";
const paramItalicVar = "var(--cb-parameter-style)" as "italic";

const theme: PrismTheme = {
  plain: { color: "var(--cb-fg)", backgroundColor: "transparent" },
  styles: [
    {
      types: ["comment", "prolog", "doctype", "cdata"],
      style: { color: "var(--cb-comment)", fontStyle: italicVar },
    },
    {
      types: ["keyword", "operator", "control", "atrule"],
      style: { color: "var(--cb-keyword)" },
    },
    {
      types: ["string", "char", "attr-value", "inserted", "url"],
      style: { color: "var(--cb-string)" },
    },
    {
      types: ["number", "boolean", "constant", "symbol"],
      style: { color: "var(--cb-number)" },
    },
    {
      types: ["function", "function-variable", "method"],
      style: { color: "var(--cb-function)" },
    },
    {
      types: ["class-name", "builtin"],
      style: { color: "var(--cb-class)", fontStyle: classItalicVar },
    },
    {
      types: ["parameter"],
      style: { color: "var(--cb-parameter)", fontStyle: paramItalicVar },
    },
    { types: ["regex", "important"], style: { color: "var(--cb-regex)" } },
    { types: ["attr-name", "selector"], style: { color: "var(--cb-attr)" } },
    { types: ["tag", "entity"], style: { color: "var(--cb-tag)" } },
    { types: ["variable", "property"], style: { color: "var(--cb-variable)" } },
    { types: ["punctuation"], style: { color: "var(--cb-fg)" } },
    { types: ["deleted"], style: { color: "var(--cb-deleted)" } },
  ],
};

// Map common fence languages to friendly header labels.
const LANGUAGE_LABELS: Record<string, string> = {
  js: "JavaScript",
  jsx: "JavaScript",
  ts: "TypeScript",
  tsx: "TypeScript",
  py: "Python",
  python: "Python",
  php: "PHP",
  csharp: "C#",
  cs: "C#",
  objc: "Objective-C",
  objectivec: "Objective-C",
  rb: "Ruby",
  sh: "Shell",
  bash: "Shell",
  zsh: "Shell",
  shell: "Shell",
  json: "JSON",
  yaml: "YAML",
  yml: "YAML",
  html: "HTML",
  css: "CSS",
  sql: "SQL",
  go: "Go",
  rust: "Rust",
  java: "Java",
  c: "C",
  cpp: "C++",
  md: "Markdown",
  markdown: "Markdown",
};

function labelFor(language?: string) {
  if (!language) return "Code";
  return (
    LANGUAGE_LABELS[language] ??
    language.charAt(0).toUpperCase() + language.slice(1)
  );
}

export default function CodeBlock({
  code,
  language,
}: {
  code: string;
  language?: string;
}) {
  const [copied, setCopied] = useState(false);
  // Fenced code blocks carry a trailing newline; drop it so the last line
  // doesn't render an empty row.
  const source = code.replace(/\n$/, "");

  // Resolve the fence tag to a canonical grammar name and load it on demand.
  // Readiness is derived at render time from Prism; the async load just forces
  // a re-render once the grammar (or an unknown one's failure) settles.
  const grammar = language ? resolveLanguage(language) : undefined;
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const ready = !grammar || isLoaded(grammar);
  useEffect(() => {
    if (ready || !grammar) return;
    let cancelled = false;
    ensureLanguage(grammar).then(() => {
      if (!cancelled) rerender();
    });
    return () => {
      cancelled = true;
    };
  }, [grammar, ready]);

  const handleCopy = async () => {
    await copyToClipboard(source);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="mb-3 overflow-hidden rounded-xl border last:mb-0"
      style={{ backgroundColor: "var(--cb-bg)", borderColor: "var(--cb-border)" }}
    >
      {/* Header: language label + actions */}
      <div
        className="flex items-center justify-between gap-2 border-b px-4 py-2.5"
        style={{ borderColor: "var(--cb-border)" }}
      >
        <div
          className="flex items-center gap-2 text-sm font-medium"
          style={{ color: "var(--cb-fg)" }}
        >
          <CodeIcon />
          <span>{labelFor(language)}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={copied ? "Copied" : "Copy code"}
            onClick={handleCopy}
            className="cb-action flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-colors"
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
          </button>
        </div>
      </div>

      {/* Body: highlighted source. Use the loaded grammar once available;
          until then (or for unknown languages) Prism renders plain text. */}
      <Highlight
        theme={theme}
        code={source}
        language={ready && grammar ? grammar : "text"}
      >
        {({ style, tokens, getLineProps, getTokenProps }) => (
          <pre
            className="overflow-x-auto px-4 pb-4 pt-1 font-mono text-sm leading-relaxed"
            style={style}
          >
            {tokens.map((line, i) => (
              <div key={i} {...getLineProps({ line })}>
                {line.map((token, key) => (
                  <span key={key} {...getTokenProps({ token })} />
                ))}
              </div>
            ))}
          </pre>
        )}
      </Highlight>
    </div>
  );
}

function CodeIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ color: "var(--cb-icon)" }}
    >
      <path d="m16 18 6-6-6-6" />
      <path d="m8 6-6 6 6 6" />
    </svg>
  );
}

const iconProps = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function CopyIcon() {
  return (
    <svg {...iconProps}>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg {...iconProps} style={{ color: "var(--cb-check)" }}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
