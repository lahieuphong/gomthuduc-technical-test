-- CreateTable
CREATE TABLE "AiUsageRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "model" TEXT NOT NULL,
    "requestCount" INTEGER NOT NULL,
    "promptTokenCount" INTEGER NOT NULL,
    "candidatesTokenCount" INTEGER NOT NULL,
    "thoughtsTokenCount" INTEGER NOT NULL,
    "cachedContentTokenCount" INTEGER NOT NULL,
    "toolUsePromptTokenCount" INTEGER NOT NULL,
    "totalTokenCount" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "AiUsageRecord_createdAt_idx" ON "AiUsageRecord"("createdAt");

-- CreateIndex
CREATE INDEX "AiUsageRecord_model_idx" ON "AiUsageRecord"("model");
