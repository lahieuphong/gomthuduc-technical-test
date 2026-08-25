import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  addAIUsage,
  createAIUsage,
  summarizeAIUsage,
} from "@/lib/ai-usage";

describe("AI usage aggregation", () => {
  it("records token metadata from one Gemini response", () => {
    const usage = addAIUsage(createAIUsage("gemini-test"), {
      promptTokenCount: 120,
      candidatesTokenCount: 80,
      thoughtsTokenCount: 40,
      cachedContentTokenCount: 20,
      totalTokenCount: 240,
    });

    assert.deepEqual(usage, {
      model: "gemini-test",
      requestCount: 1,
      promptTokenCount: 120,
      candidatesTokenCount: 80,
      thoughtsTokenCount: 40,
      cachedContentTokenCount: 20,
      toolUsePromptTokenCount: 0,
      totalTokenCount: 240,
    });
  });

  it("adds retries and calculates a fallback total when Gemini omits it", () => {
    const firstAttempt = addAIUsage(createAIUsage("gemini-test"), {
      promptTokenCount: 100,
      candidatesTokenCount: 50,
      totalTokenCount: 150,
    });
    const retriedUsage = addAIUsage(firstAttempt, {
      promptTokenCount: 110,
      candidatesTokenCount: 45,
      thoughtsTokenCount: 30,
      toolUsePromptTokenCount: 5,
    });

    assert.equal(retriedUsage.requestCount, 2);
    assert.equal(retriedUsage.promptTokenCount, 210);
    assert.equal(retriedUsage.candidatesTokenCount, 95);
    assert.equal(retriedUsage.thoughtsTokenCount, 30);
    assert.equal(retriedUsage.toolUsePromptTokenCount, 5);
    assert.equal(retriedUsage.totalTokenCount, 340);
  });

  it("normalizes missing and invalid token counts to zero", () => {
    const usage = addAIUsage(createAIUsage("gemini-test"), {
      promptTokenCount: -1,
      candidatesTokenCount: Number.NaN,
    });

    assert.equal(usage.requestCount, 1);
    assert.equal(usage.promptTokenCount, 0);
    assert.equal(usage.candidatesTokenCount, 0);
    assert.equal(usage.totalTokenCount, 0);
  });

  it("preserves per-model totals in the aggregate usage summary", () => {
    const models = [
      {
        ...addAIUsage(createAIUsage("gemini-a"), {
          promptTokenCount: 100,
          candidatesTokenCount: 50,
          totalTokenCount: 150,
        }),
        analysisCount: 1,
      },
      {
        ...addAIUsage(createAIUsage("gemini-b"), {
          promptTokenCount: 200,
          candidatesTokenCount: 75,
          thoughtsTokenCount: 25,
          totalTokenCount: 300,
        }),
        analysisCount: 1,
      },
    ];

    const summary = summarizeAIUsage(models, "2026-08-25T00:00:00.000Z");

    assert.equal(summary.models.length, 2);
    assert.equal(summary.analysisCount, 2);
    assert.equal(summary.requestCount, 2);
    assert.equal(summary.promptTokenCount, 300);
    assert.equal(summary.candidatesTokenCount, 125);
    assert.equal(summary.thoughtsTokenCount, 25);
    assert.equal(summary.totalTokenCount, 450);
    assert.equal(summary.lastRecordedAt, "2026-08-25T00:00:00.000Z");
  });
});
