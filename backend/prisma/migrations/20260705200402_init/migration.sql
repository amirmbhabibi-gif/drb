-- CreateEnum
CREATE TYPE "ListingType" AS ENUM ('OFFER', 'NEED', 'SWAP');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('ACTIVE', 'PENDING', 'CLOSED');

-- CreateTable
CREATE TABLE "listings" (
    "id" UUID NOT NULL,
    "pharmacy_id" UUID NOT NULL,
    "type" "ListingType" NOT NULL,
    "raw_text" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "status" "ListingStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "listings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "listings_type_status_idx" ON "listings"("type", "status");

-- CreateIndex
CREATE INDEX "listings_pharmacy_id_idx" ON "listings"("pharmacy_id");

-- CreateIndex
CREATE INDEX "listings_status_created_at_idx" ON "listings"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "listings_deleted_at_idx" ON "listings"("deleted_at");
