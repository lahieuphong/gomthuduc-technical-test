-- CreateTable
CREATE TABLE "Batch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "rawDescription" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "heightCm" REAL,
    "widthCm" REAL,
    "pattern" TEXT,
    "glazeType" TEXT,
    "firingTemperatureC" INTEGER,
    "estimatedClayKg" REAL,
    "estimatedGlazeKg" REAL,
    "estimatedFiringHours" REAL,
    "deadlineDays" INTEGER NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "priorityReason" TEXT,
    "currentStage" TEXT NOT NULL DEFAULT 'FORMING',
    "aiAnalysis" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "StageLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "fromStage" TEXT,
    "toStage" TEXT,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StageLog_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QCReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT NOT NULL,
    "inspectedQuantity" INTEGER NOT NULL,
    "passedQuantity" INTEGER NOT NULL,
    "defectQuantity" INTEGER NOT NULL,
    "defectType" TEXT,
    "notes" TEXT,
    "defectRate" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QCReport_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Batch_code_key" ON "Batch"("code");

-- CreateIndex
CREATE INDEX "Batch_currentStage_idx" ON "Batch"("currentStage");

-- CreateIndex
CREATE INDEX "Batch_priority_idx" ON "Batch"("priority");

-- CreateIndex
CREATE INDEX "Batch_createdAt_idx" ON "Batch"("createdAt");

-- CreateIndex
CREATE INDEX "StageLog_batchId_createdAt_idx" ON "StageLog"("batchId", "createdAt");

-- CreateIndex
CREATE INDEX "QCReport_batchId_createdAt_idx" ON "QCReport"("batchId", "createdAt");
