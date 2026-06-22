-- CreateTable
CREATE TABLE "public"."Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Tier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AssignedProduct" (
    "id" TEXT NOT NULL,
    "tierId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "forceInclude" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssignedProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PreferenceSubmission" (
    "id" TEXT NOT NULL,
    "subscriberId" TEXT,
    "customerEmail" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "size" TEXT,
    "style" TEXT,
    "notes" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PreferenceSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Settings" (
    "id" TEXT NOT NULL,
    "automationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "selectionDeadlineOffset" INTEGER NOT NULL DEFAULT 7,
    "autoSelectionOffset" INTEGER NOT NULL DEFAULT 2,
    "orderCreationOffset" INTEGER NOT NULL DEFAULT 1,
    "reminder14Days" BOOLEAN NOT NULL DEFAULT true,
    "reminder7Days" BOOLEAN NOT NULL DEFAULT true,
    "reminder3Days" BOOLEAN NOT NULL DEFAULT true,
    "reminder1Day" BOOLEAN NOT NULL DEFAULT true,
    "senderEmail" TEXT,
    "hideOutOfStock" BOOLEAN NOT NULL DEFAULT true,
    "hideDiscontinued" BOOLEAN NOT NULL DEFAULT true,
    "allowBackorders" BOOLEAN NOT NULL DEFAULT false,
    "autoCreateOrders" BOOLEAN NOT NULL DEFAULT true,
    "requireManualReview" BOOLEAN NOT NULL DEFAULT false,
    "autoOrderTag" TEXT DEFAULT 'SubscriptionSync-Auto',
    "customerSelectedTag" TEXT DEFAULT 'MonthlySelection',
    "modifiedOrderTag" TEXT DEFAULT 'AppstleSync',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Subscriber" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "subscriptionStartDate" TIMESTAMP(3) NOT NULL,
    "nextShipDate" TIMESTAMP(3) NOT NULL,
    "nextSelectionDeadline" TIMESTAMP(3) NOT NULL,
    "autoSelectionDate" TIMESTAMP(3),
    "tierId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Shipment" (
    "id" TEXT NOT NULL,
    "subscriberId" TEXT NOT NULL,
    "shipDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "productName" TEXT,
    "trackingUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Selection" (
    "id" TEXT NOT NULL,
    "subscriberId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "productName" TEXT,
    "source" TEXT NOT NULL DEFAULT 'Customer Form',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Selection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ActivityLog" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Success',
    "user" TEXT NOT NULL DEFAULT 'System',
    "source" TEXT NOT NULL DEFAULT 'SubscriptionSync',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."AssignedProduct" ADD CONSTRAINT "AssignedProduct_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "public"."Tier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PreferenceSubmission" ADD CONSTRAINT "PreferenceSubmission_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "public"."Subscriber"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Subscriber" ADD CONSTRAINT "Subscriber_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "public"."Tier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Shipment" ADD CONSTRAINT "Shipment_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "public"."Subscriber"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Selection" ADD CONSTRAINT "Selection_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "public"."Subscriber"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
