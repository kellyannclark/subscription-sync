-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Success',
    "user" TEXT NOT NULL DEFAULT 'System',
    "source" TEXT NOT NULL DEFAULT 'SubscriptionSync',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
