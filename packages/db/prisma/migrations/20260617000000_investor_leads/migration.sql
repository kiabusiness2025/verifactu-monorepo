-- CreateTable
CREATE TABLE "investor_leads" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "role" TEXT,
    "message" TEXT,
    "type" TEXT NOT NULL DEFAULT 'investor',
    "consent" BOOLEAN NOT NULL DEFAULT false,
    "downloaded_at" TIMESTAMP(3),
    "ip_address" TEXT,

    CONSTRAINT "investor_leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "investor_leads_email_idx" ON "investor_leads"("email");

-- CreateIndex
CREATE INDEX "investor_leads_created_at_idx" ON "investor_leads"("created_at");
