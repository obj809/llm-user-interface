// @vitest-environment node
//
// Runs in Node (not jsdom) so prismjs grammar files — which register onto a
// global `Prism` — resolve that global consistently. (See prism-languages.ts:
// in Node it points the loader at `global`.)
import { describe, it, expect } from "vitest";
import {
  resolveLanguage,
  isLoaded,
  ensureLanguage,
} from "@/app/components/prism-languages";

describe("resolveLanguage", () => {
  it("maps common fence-tag aliases to canonical grammar names", () => {
    expect(resolveLanguage("py")).toBe("python");
    expect(resolveLanguage("c++")).toBe("cpp");
    expect(resolveLanguage("cs")).toBe("csharp");
    expect(resolveLanguage("yml")).toBe("yaml");
    expect(resolveLanguage("html")).toBe("markup");
  });

  it("lowercases the tag before resolving", () => {
    expect(resolveLanguage("TS")).toBe("typescript");
    expect(resolveLanguage("PY")).toBe("python");
  });

  it("passes through canonical or unknown names unchanged", () => {
    expect(resolveLanguage("python")).toBe("python");
    expect(resolveLanguage("rust")).toBe("rust");
    expect(resolveLanguage("totally-made-up")).toBe("totally-made-up");
  });
});

describe("ensureLanguage", () => {
  it("loads a grammar that isn't vendored by default", async () => {
    await ensureLanguage("toml");
    expect(isLoaded("toml")).toBe(true);
  });

  it("loads declared prerequisites alongside the language", async () => {
    await ensureLanguage("scala"); // PREREQUISITES: scala -> java -> clike
    expect(isLoaded("scala")).toBe(true);
    expect(isLoaded("java")).toBe(true);
  });

  it("dedupes concurrent loads of the same language", () => {
    const a = ensureLanguage("ini");
    const b = ensureLanguage("ini");
    expect(a).toBe(b);
  });

  it("resolves without throwing for an unknown language and leaves it unloaded", async () => {
    await expect(
      ensureLanguage("totally-made-up-lang"),
    ).resolves.toBeUndefined();
    expect(isLoaded("totally-made-up-lang")).toBe(false);
  });
});
