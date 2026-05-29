-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "require2fa" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requireEmailVerified" BOOLEAN NOT NULL DEFAULT false;

