-- CreateTable
CREATE TABLE "public"."CatalogProduct" (
    "id" TEXT NOT NULL,
    "shopifyProductId" TEXT,
    "handle" TEXT,
    "productName" TEXT NOT NULL,
    "category" TEXT,
    "productType" TEXT,
    "vendor" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CatalogVariant" (
    "id" TEXT NOT NULL,
    "catalogProductId" TEXT NOT NULL,
    "shopifyVariantId" TEXT,
    "variantName" TEXT NOT NULL,
    "sku" TEXT,
    "size" TEXT,
    "inventoryQty" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogVariant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CatalogProduct_category_idx" ON "public"."CatalogProduct"("category");

-- CreateIndex
CREATE INDEX "CatalogProduct_productType_idx" ON "public"."CatalogProduct"("productType");

-- CreateIndex
CREATE INDEX "CatalogProduct_productName_idx" ON "public"."CatalogProduct"("productName");

-- CreateIndex
CREATE INDEX "CatalogVariant_sku_idx" ON "public"."CatalogVariant"("sku");

-- CreateIndex
CREATE INDEX "CatalogVariant_size_idx" ON "public"."CatalogVariant"("size");

-- AddForeignKey
ALTER TABLE "public"."CatalogVariant" ADD CONSTRAINT "CatalogVariant_catalogProductId_fkey" FOREIGN KEY ("catalogProductId") REFERENCES "public"."CatalogProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
