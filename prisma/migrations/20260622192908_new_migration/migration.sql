/*
  Warnings:

  - You are about to drop the column `reminderDaysBefore` on the `Settings` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "Subscriber" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "subscriptionStartDate" DATETIME NOT NULL,
    "nextShipDate" DATETIME NOT NULL,
    "nextSelectionDeadline" DATETIME NOT NULL,
    "autoSelectionDate" DATETIME,
    "tierId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Subscriber_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "Tier" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subscriberId" TEXT NOT NULL,
    "shipDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "productName" TEXT,
    "trackingUrl" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Shipment_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "Subscriber" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Selection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subscriberId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "productName" TEXT,
    "source" TEXT NOT NULL DEFAULT 'Customer Form',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Selection_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "Subscriber" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PreferenceSubmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subscriberId" TEXT,
    "customerEmail" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "size" TEXT,
    "style" TEXT,
    "notes" TEXT,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PreferenceSubmission_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "Subscriber" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PreferenceSubmission" ("customerEmail", "id", "month", "notes", "size", "style", "submittedAt") SELECT "customerEmail", "id", "month", "notes", "size", "style", "submittedAt" FROM "PreferenceSubmission";
DROP TABLE "PreferenceSubmission";
ALTER TABLE "new_PreferenceSubmission" RENAME TO "PreferenceSubmission";
CREATE TABLE "new_Settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Settings" ("id", "senderEmail", "updatedAt") SELECT "id", "senderEmail", "updatedAt" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
