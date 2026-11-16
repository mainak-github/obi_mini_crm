ALTER TABLE "Lead" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Deal" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Task" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Deal" ADD COLUMN "wonAt" TIMESTAMP(3);
UPDATE "Deal" SET "wonAt" = "updatedAt" WHERE "stage" = 'WON';
CREATE INDEX "Deal_stage_wonAt_idx" ON "Deal"("stage", "wonAt");

ALTER TABLE "Task" ADD CONSTRAINT "Task_exactly_one_link_check"
  CHECK (("leadId" IS NOT NULL)::integer + ("dealId" IS NOT NULL)::integer = 1);
