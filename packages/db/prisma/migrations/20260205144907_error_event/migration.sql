-- CreateTable
CREATE TABLE "ErrorEvent" (
    "id" TEXT NOT NULL,
    "source" TEXT,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "details" JSONB,
    "userAgent" TEXT,
    "viewport" JSONB,
    "performance" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErrorEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ErrorEvent_createdAt_idx" ON "ErrorEvent"("createdAt");

-- CreateIndex
CREATE INDEX "ErrorEvent_type_createdAt_idx" ON "ErrorEvent"("type", "createdAt");

-- CreateIndex
CREATE INDEX "ErrorEvent_source_createdAt_idx" ON "ErrorEvent"("source", "createdAt");
