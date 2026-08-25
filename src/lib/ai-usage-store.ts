import "server-only";

import { db } from "@/lib/db";
import {
  summarizeAIUsage,
  type AIUsage,
  type AIUsageModelSummary,
  type AIUsageSummary,
} from "@/lib/ai-usage";

export async function recordAIUsage(usage: AIUsage) {
  if (usage.requestCount < 1) {
    return;
  }

  await db.aiUsageRecord.create({
    data: usage,
  });
}

export async function getAIUsageSummary(): Promise<AIUsageSummary> {
  const [totalsByModel, latestRecord] = await Promise.all([
    db.aiUsageRecord.groupBy({
      by: ["model"],
      _count: { _all: true },
      _sum: {
        requestCount: true,
        promptTokenCount: true,
        candidatesTokenCount: true,
        thoughtsTokenCount: true,
        cachedContentTokenCount: true,
        toolUsePromptTokenCount: true,
        totalTokenCount: true,
      },
      orderBy: { model: "asc" },
    }),
    db.aiUsageRecord.findFirst({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { createdAt: true },
    }),
  ]);

  const models: AIUsageModelSummary[] = totalsByModel.map((totals) => ({
    model: totals.model,
    analysisCount: totals._count._all,
    requestCount: totals._sum.requestCount ?? 0,
    promptTokenCount: totals._sum.promptTokenCount ?? 0,
    candidatesTokenCount: totals._sum.candidatesTokenCount ?? 0,
    thoughtsTokenCount: totals._sum.thoughtsTokenCount ?? 0,
    cachedContentTokenCount: totals._sum.cachedContentTokenCount ?? 0,
    toolUsePromptTokenCount: totals._sum.toolUsePromptTokenCount ?? 0,
    totalTokenCount: totals._sum.totalTokenCount ?? 0,
  }));

  return summarizeAIUsage(
    models,
    latestRecord?.createdAt.toISOString() ?? null,
  );
}
