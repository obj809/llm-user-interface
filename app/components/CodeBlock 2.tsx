"use client";

import { useState } from "react";
import { Highlight, type PrismTheme } from "prism-react-renderer";
import { copyToClipboard } from "../clipboard";

// Official Dracula palette (https://spec.draculatheme.com). Token mapping per
// the spec: keywords/operators → pink, strings → yellow, comments → comment,
// numbers/constants/booleans → purple, functions → green, class names → cyan,
// parameters → orange, built-ins → cyan, variables/punctuation → foreground.
const DRACULA = {
  background: "#282a36",
  currentLine: "#44475a",
  foreground: "#f8f8f2",
  comment: "#6272a4",
  cyan: "#8be9fd",
  green: "#50fa7b",
  orange: "#ffb86c",
  pink: "#ff79c6",
  purple: "#bd93f9",
  red: "#ff5555",
  yellow: "#f1fa8c",
} as const;

const theme: PrismTheme = {
  plain: { color: DRACULA.foreground, backgroundColor: "transparent" },
  styles: [
    {
      types: ["comment", "prolog", "doctype", "cdata"],
      style: { color: DRACULA.comment, fontStyle: "italic" },
    },
    {
      types: ["keyword", "operator", "control", "atrule", "tag", "entity"],
      style: { color: DRACULA.pink },
    },
    {
      types: ["string", "char", "attr-value", "inserted", "url"],
      style: { color: DRACULA.yellow },
    },
    {
      types: ["number", "boolean", "constant", "symbol"],
      style: { color: DRACULA.purple },
    },
    {
      types: ["function", "function-variable", "method"],
      style: { color: DRACULA.green },
    },
    {
      types: ["class-name", "builtin"],
      style: { color: DRACULA.cyan, fontStyle: "italic" },
    },
    {
      types: ["parameter"],
      style: { color: DRACULA.orange, fontStyle: "italic" },
    },
    { types: ["regex", "important"], style: { color: DRACULA.orange } },
    { types: ["attr-name", "selector"], style: { color: DRACULA.green } },
    {
      types: ["punctuation", "variable", "property"],
      style: { color: DRACULA.foreground },
    },
    { types: ["deleted"], style: { color: DRACULA.red } },
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

  const handleCopy = async () => {
    await copyToClipboard(source);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="mb-3 overflow-hidden rounded-xl border border-[#44475a] last:mb-0"
      style={{ backgroundColor: DRACULA.background }}
    >
      {/* Header: language label + actions */}
      <div className="flex items-center justify-between gap-2 border-b border-[#44475a] px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm font-medium text-[#f8f8f2]">
          <CodeIcon />
          <span>{labelFor(language)}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={copied ? "Copied" : "Copy code"}
            onClick={handleCopy}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-[#6272a4] transition-colors hover:bg-[#44475a] hover:text-[#f8f8f2]"
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
          </button>
        </div>
      </div>

      {/* Body: highlighted source */}
      <Highlight theme={theme} code={source} language={language ?? "text"}>
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
      className="text-[#6272a4]"
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
    <svg {...iconProps} className="text-[#50fa7b]">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
