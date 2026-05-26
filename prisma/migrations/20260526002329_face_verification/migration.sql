-- AlterTable
ALTER TABLE "AttendanceLog" ADD COLUMN     "faceDistance" DOUBLE PRECISION,
ADD COLUMN     "faceMatch" BOOLEAN;

-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "faceConsentAt" TIMESTAMP(3),
ADD COLUMN     "faceDescriptor" TEXT,
ADD COLUMN     "faceEnrolledAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "faceVerification" TEXT NOT NULL DEFAULT 'off';

