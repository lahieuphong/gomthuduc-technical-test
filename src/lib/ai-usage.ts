export type AIUsage = {
  model: string;
  requestCount: number;
  promptTokenCount: number;
  candidatesTokenCount: number;
  thoughtsTokenCount: number;
  cachedContentTokenCount: number;
  toolUsePromptTokenCount: number;
  totalTokenCount: number;
};

type GeminiUsageMetadata = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  thoughtsTokenCount?: number;
  cachedContentTokenCount?: number;
  toolUsePromptTokenCount?: number;
  totalTokenCount?: number;
};

function normalizeTokenCount(value: number | undefined): number {
  return Number.isFinite(value) && (value ?? 0) > 0
    ? Math.trunc(value ?? 0)
    : 0;
}

export function createAIUsage(model: string): AIUsage {
  return {
    model,
    requestCount: 0,
    promptTokenCount: 0,
    candidatesTokenCount: 0,
    thoughtsTokenCount: 0,
    cachedContentTokenCount: 0,
    toolUsePromptTokenCount: 0,
    totalTokenCount: 0,
  };
}

export function addAIUsage(
  current: AIUsage,
  metadata: GeminiUsageMetadata | undefined,
): AIUsage {
  const promptTokenCount = normalizeTokenCount(metadata?.promptTokenCount);
  const candidatesTokenCount = normalizeTokenCount(
    metadata?.candidatesTokenCount,
  );
  const thoughtsTokenCount = normalizeTokenCount(metadata?.thoughtsTokenCount);
  const cachedContentTokenCount = normalizeTokenCount(
    metadata?.cachedContentTokenCount,
  );
  const toolUsePromptTokenCount = normalizeTokenCount(
    metadata?.toolUsePromptTokenCount,
  );
  const reportedTotalTokenCount = normalizeTokenCount(
    metadata?.totalTokenCount,
  );
  const totalTokenCount =
    reportedTotalTokenCount ||
    promptTokenCount +
      candidatesTokenCount +
      thoughtsTokenCount +
      toolUsePromptTokenCount;

  return {
    ...current,
    requestCount: current.requestCount + 1,
    promptTokenCount: current.promptTokenCount + promptTokenCount,
    candidatesTokenCount:
      current.candidatesTokenCount + candidatesTokenCount,
    thoughtsTokenCount: current.thoughtsTokenCount + thoughtsTokenCount,
    cachedContentTokenCount:
      current.cachedContentTokenCount + cachedContentTokenCount,
    toolUsePromptTokenCount:
      current.toolUsePromptTokenCount + toolUsePromptTokenCount,
    totalTokenCount: current.totalTokenCount + totalTokenCount,
  };
}
