import { describe, it, expect } from "vitest";
import { MODELS, DEFAULT_MODEL_ID, getModel } from "@/app/models";

describe("getModel", () => {
  it("returns the matching model for a known id", () => {
    expect(getModel("gemini-2.5-flash-lite")?.provider).toBe("google");
    expect(getModel("gpt-4.1-nano")?.provider).toBe("openai");
  });

  it("returns undefined for an unknown id", () => {
    expect(getModel("does-not-exist")).toBeUndefined();
    expect(getModel("")).toBeUndefined();
  });

  it("resolves the default model id to a real model", () => {
    expect(getModel(DEFAULT_MODEL_ID)).toBeDefined();
  });
});

describe("MODELS registry", () => {
  it("has unique ids", () => {
    const ids = MODELS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every entry has an id, label, and a known provider", () => {
    for (const model of MODELS) {
      expect(model.id).toBeTruthy();
      expect(model.label).toBeTruthy();
      expect(["google", "openai"]).toContain(model.provider);
    }
  });
});
