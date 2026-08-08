/*
  Warnings:

  - You are about to drop the column `status` on the `Subscriber` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[appstleSubscriptionId]` on the table `Subscriber` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."Subscriber" DROP COLUMN "status",
ADD COLUMN     "appstlePlanId" TEXT,
ADD COLUMN     "appstlePlanName" TEXT,
ADD COLUMN     "appstleSubscriptionId" TEXT,
ADD COLUMN     "fulfillmentProfileId" TEXT,
ADD COLUMN     "nextOrderDate" TIMESTAMP(3),
ADD COLUMN     "selectionEmailSentAt" TIMESTAMP(3),
ADD COLUMN     "selectionSubmittedAt" TIMESTAMP(3),
ADD COLUMN     "shopifyCustomerId" TEXT,
ADD COLUMN     "subscriptionStatus" TEXT NOT NULL DEFAULT 'Active',
ADD COLUMN     "workflowStatus" TEXT NOT NULL DEFAULT 'Waiting for Selection';

-- CreateTable
CREATE TABLE "public"."FulfillmentProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "appstlePlanId" TEXT,
    "appstlePlanName" TEXT,
    "appstlePlanType" TEXT,
    "selectionOpenOffset" INTEGER NOT NULL DEFAULT 14,
    "selectionDeadlineOffset" INTEGER NOT NULL DEFAULT 7,
    "reminder14Days" BOOLEAN NOT NULL DEFAULT true,
    "reminder7Days" BOOLEAN NOT NULL DEFAULT true,
    "reminder3Days" BOOLEAN NOT NULL DEFAULT true,
    "reminder1Day" BOOLEAN NOT NULL DEFAULT true,
    "autoSelectEnabled" BOOLEAN NOT NULL DEFAULT true,
    "autoSelectOffset" INTEGER NOT NULL DEFAULT 2,
    "autoSelectRules" JSONB,
    "hideOutOfStock" BOOLEAN NOT NULL DEFAULT true,
    "allowBackorders" BOOLEAN NOT NULL DEFAULT false,
    "requireInventoryCheck" BOOLEAN NOT NULL DEFAULT true,
    "emailSubject" TEXT,
    "emailTemplate" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FulfillmentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FulfillmentProduct" (
    "id" TEXT NOT NULL,
    "fulfillmentProfileId" TEXT NOT NULL,
    "shopifyProductId" TEXT,
    "productName" TEXT NOT NULL,
    "sku" TEXT,
    "forceInclude" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FulfillmentProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FulfillmentVariant" (
    "id" TEXT NOT NULL,
    "fulfillmentProductId" TEXT NOT NULL,
    "shopifyVariantId" TEXT,
    "variantName" TEXT NOT NULL,
    "sku" TEXT,
    "size" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FulfillmentVariant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subscriber_appstleSubscriptionId_key" ON "public"."Subscriber"("appstleSubscriptionId");

-- AddForeignKey
ALTER TABLE "public"."Subscriber" ADD CONSTRAINT "Subscriber_fulfillmentProfileId_fkey" FOREIGN KEY ("fulfillmentProfileId") REFERENCES "public"."FulfillmentProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FulfillmentProduct" ADD CONSTRAINT "FulfillmentProduct_fulfillmentProfileId_fkey" FOREIGN KEY ("fulfillmentProfileId") REFERENCES "public"."FulfillmentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FulfillmentVariant" ADD CONSTRAINT "FulfillmentVariant_fulfillmentProductId_fkey" FOREIGN KEY ("fulfillmentProductId") REFERENCES "public"."FulfillmentProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
