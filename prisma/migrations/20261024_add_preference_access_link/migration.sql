-- CreateTable
CREATE TABLE "PreferenceAccessLink" (
    "id" TEXT NOT NULL,
    "subscriberId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PreferenceAccessLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PreferenceAccessLink_tokenHash_key" ON "PreferenceAccessLink"("tokenHash");

-- CreateIndex
CREATE INDEX "PreferenceAccessLink_subscriberId_idx" ON "PreferenceAccessLink"("subscriberId");

-- AddForeignKey
ALTER TABLE "PreferenceAccessLink" ADD CONSTRAINT "PreferenceAccessLink_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "Subscriber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

