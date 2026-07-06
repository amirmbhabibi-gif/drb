-- CreateEnum
CREATE TYPE "PharmacyVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'ADMIN';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserStatus" ADD VALUE 'PENDING_VERIFICATION';
ALTER TYPE "UserStatus" ADD VALUE 'REJECTED';

-- AlterTable
ALTER TABLE "pharmacies" ADD COLUMN     "license_document_name" VARCHAR(255),
ADD COLUMN     "license_document_path" VARCHAR(500),
ADD COLUMN     "license_mime_type" VARCHAR(100),
ADD COLUMN     "license_submitted_at" TIMESTAMPTZ,
ADD COLUMN     "rejection_reason" TEXT,
ADD COLUMN     "reviewed_at" TIMESTAMPTZ,
ADD COLUMN     "reviewed_by_id" UUID,
ADD COLUMN     "verification_status" "PharmacyVerificationStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "pharmacies_verification_status_idx" ON "pharmacies"("verification_status");
