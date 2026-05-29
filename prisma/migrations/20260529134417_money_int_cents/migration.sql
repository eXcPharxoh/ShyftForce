-- AlterTable
ALTER TABLE "ExpenseRequest" ADD COLUMN     "amountCents" INTEGER;

-- AlterTable
ALTER TABLE "Location" ADD COLUMN     "projectedRevenueCents" INTEGER,
ADD COLUMN     "weeklyBudgetCents" INTEGER;

-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "hourlyRateCents" INTEGER;

-- AlterTable
ALTER TABLE "PredictabilityPayEvent" ADD COLUMN     "hourlyRateCents" INTEGER;


-- Backfill from the deprecated Float dollar columns. Safe to re-run.
UPDATE "ExpenseRequest"        SET "amountCents"            = ROUND("amount" * 100)::INT             WHERE "amountCents"             IS NULL;
UPDATE "Location"               SET "weeklyBudgetCents"     = ROUND("weeklyBudget" * 100)::INT      WHERE "weeklyBudgetCents"      IS NULL AND "weeklyBudget"     IS NOT NULL;
UPDATE "Location"               SET "projectedRevenueCents" = ROUND("projectedRevenue" * 100)::INT  WHERE "projectedRevenueCents"  IS NULL AND "projectedRevenue" IS NOT NULL;
UPDATE "Member"                 SET "hourlyRateCents"       = ROUND("hourlyRate" * 100)::INT        WHERE "hourlyRateCents"        IS NULL AND "hourlyRate"       IS NOT NULL;
UPDATE "PredictabilityPayEvent" SET "hourlyRateCents"       = ROUND("hourlyRate" * 100)::INT        WHERE "hourlyRateCents"        IS NULL;
