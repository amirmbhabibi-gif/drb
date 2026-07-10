-- CreateEnum
CREATE TYPE "DeliveryMethod" AS ENUM ('PICKUP', 'COURIER', 'POST', 'INTERCITY_FREIGHT');

-- CreateTable
CREATE TABLE "medications" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "generic_name" VARCHAR(255),
    "form" VARCHAR(100),
    "strength" VARCHAR(100),
    "atc_code" VARCHAR(20),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "medications_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "listings" ADD COLUMN "delivery_methods" "DeliveryMethod"[] DEFAULT ARRAY[]::"DeliveryMethod"[];

-- CreateTable
CREATE TABLE "listing_offered_medications" (
    "id" UUID NOT NULL,
    "listing_id" UUID NOT NULL,
    "medication_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listing_offered_medications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_wanted_medications" (
    "id" UUID NOT NULL,
    "listing_id" UUID NOT NULL,
    "medication_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listing_wanted_medications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "medications_name_idx" ON "medications"("name");

-- CreateIndex
CREATE INDEX "medications_deleted_at_idx" ON "medications"("deleted_at");

-- CreateIndex
CREATE INDEX "listing_offered_medications_listing_id_idx" ON "listing_offered_medications"("listing_id");

-- CreateIndex
CREATE INDEX "listing_offered_medications_medication_id_idx" ON "listing_offered_medications"("medication_id");

-- CreateIndex
CREATE UNIQUE INDEX "listing_offered_medications_listing_id_medication_id_key" ON "listing_offered_medications"("listing_id", "medication_id");

-- CreateIndex
CREATE INDEX "listing_wanted_medications_listing_id_idx" ON "listing_wanted_medications"("listing_id");

-- CreateIndex
CREATE INDEX "listing_wanted_medications_medication_id_idx" ON "listing_wanted_medications"("medication_id");

-- CreateIndex
CREATE UNIQUE INDEX "listing_wanted_medications_listing_id_medication_id_key" ON "listing_wanted_medications"("listing_id", "medication_id");

-- AddForeignKey
ALTER TABLE "listing_offered_medications" ADD CONSTRAINT "listing_offered_medications_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_offered_medications" ADD CONSTRAINT "listing_offered_medications_medication_id_fkey" FOREIGN KEY ("medication_id") REFERENCES "medications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_wanted_medications" ADD CONSTRAINT "listing_wanted_medications_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_wanted_medications" ADD CONSTRAINT "listing_wanted_medications_medication_id_fkey" FOREIGN KEY ("medication_id") REFERENCES "medications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
