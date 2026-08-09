import fs from "node:fs";
import path from "node:path";

import { parse } from "csv-parse/sync";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type CsvRow = {
  Handle: string;
  Title: string;
  Vendor: string;
  Type: string;
  Status: string;

  "Option1 Name": string;
  "Option1 Value": string;

  "Variant SKU": string;
  "Variant Inventory Qty": string;
};

type ProductGroup = {
  handle: string;
  title: string;
  vendor: string;
  type: string;
  status: string;
  variants: {
    size: string;
    sku: string | null;
    inventoryQty: number | null;
  }[];
};

const CATEGORY_LIMIT = 10;

const categoryMap = {
  "Twirl Dress": "Twirl",
  "The Traditional Princess": "Traditional Princess",
  "The Deluxe Princess": "Deluxe Princess",
};

function cleanSku(value: string | undefined) {
  if (!value) return null;

  const cleaned = value.trim().replace(/^'/, "");

  return cleaned || null;
}

function parseInventory(value: string | undefined) {
  if (!value?.trim()) return null;

  const parsed = Number.parseInt(value, 10);

  return Number.isNaN(parsed) ? null : parsed;
}

async function main() {
  const csvPath = path.join(
    process.cwd(),
    "prisma",
    "data",
    "products_export_1.csv",
  );

  if (!fs.existsSync(csvPath)) {
    throw new Error(
      `CSV file not found at ${csvPath}`,
    );
  }

  console.log("Reading Shopify product export...");

  const csvContent = fs.readFileSync(
    csvPath,
    "utf8",
  );

  const rows = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  }) as CsvRow[];

  /*
   * Shopify CSV exports contain multiple rows for the same
   * product because each size/variant gets its own row.
   *
   * The Title, Type, Vendor and Status usually appear on
   * the first row for a product, while later rows keep the
   * same Handle.
   *
   * We group all rows by Handle first.
   */
  const groupedByHandle = new Map<
    string,
    CsvRow[]
  >();

  for (const row of rows) {
    const handle = row.Handle?.trim();

    if (!handle) continue;

    const existing =
      groupedByHandle.get(handle) ?? [];

    existing.push(row);

    groupedByHandle.set(
      handle,
      existing,
    );
  }

  const products: ProductGroup[] = [];

  for (const [handle, productRows] of groupedByHandle) {
    const firstRow =
      productRows.find(
        (row) => row.Title?.trim(),
      ) ?? productRows[0];

    const title =
      firstRow.Title?.trim();

    const type =
      firstRow.Type?.trim();

    const status =
      firstRow.Status?.trim();

    const vendor =
      firstRow.Vendor?.trim();

    if (!title || !type) {
      continue;
    }

    if (
      !Object.prototype.hasOwnProperty.call(
        categoryMap,
        type,
      )
    ) {
      continue;
    }

    /*
     * Only use active Shopify products for the demo catalog.
     */
    if (
      status.toLowerCase() !==
      "active"
    ) {
      continue;
    }

    const variants = productRows
      .filter((row) => {
        const size =
          row["Option1 Value"]?.trim();

        const sku =
          cleanSku(
            row["Variant SKU"],
          );

        /*
         * Ignore image-only / metadata-only rows that
         * don't actually represent a product variant.
         */
        return Boolean(size || sku);
      })
      .map((row) => ({
        size:
          row[
            "Option1 Value"
          ]?.trim() ||
          "Default",
        sku: cleanSku(
          row["Variant SKU"],
        ),
        inventoryQty:
          parseInventory(
            row[
              "Variant Inventory Qty"
            ],
          ),
      }));

    if (variants.length === 0) {
      continue;
    }

    products.push({
      handle,
      title,
      vendor,
      type,
      status,
      variants,
    });
  }

  /*
   * Choose 10 products from each category.
   */
  const selectedProducts: ProductGroup[] =
    [];

  for (const type of Object.keys(
    categoryMap,
  )) {
    const matchingProducts =
      products
        .filter(
          (product) =>
            product.type === type,
        )
        .slice(0, CATEGORY_LIMIT);

    console.log(
      `${categoryMap[type as keyof typeof categoryMap]}: ${matchingProducts.length} products selected`,
    );

    selectedProducts.push(
      ...matchingProducts,
    );
  }

  console.log(
    `Total products selected: ${selectedProducts.length}`,
  );

  /*
   * Clear ONLY the reusable demo catalog.
   *
   * This does NOT delete:
   * - Fulfillment Profiles
   * - Subscribers
   * - Shipments
   * - Existing assigned FulfillmentProducts
   */
  console.log(
    "Clearing existing catalog demo data...",
  );

  await prisma.catalogProduct.deleteMany();

  console.log(
    "Importing catalog products...",
  );

  for (const product of selectedProducts) {
    const category =
      categoryMap[
        product.type as keyof typeof categoryMap
      ];

    await prisma.catalogProduct.create({
      data: {
        handle: product.handle,

        productName:
          product.title,

        category,

        productType:
          product.type,

        vendor:
          product.vendor ||
          "Little Adventures",

        isActive: true,

        variants: {
          create:
            product.variants.map(
              (variant) => ({
                variantName:
                  variant.size,

                size:
                  variant.size,

                sku:
                  variant.sku,

                inventoryQty:
                  variant.inventoryQty,

                isActive: true,
              }),
            ),
        },
      },
    });

    console.log(
      `✓ ${category}: ${product.title} (${product.variants.length} variants)`,
    );
  }

  const productCount =
    await prisma.catalogProduct.count();

  const variantCount =
    await prisma.catalogVariant.count();

  console.log("");
  console.log(
    "Catalog import complete!",
  );
  console.log(
    `Products: ${productCount}`,
  );
  console.log(
    `Variants: ${variantCount}`,
  );
}

main()
  .catch((error) => {
    console.error(
      "Catalog import failed:",
      error,
    );

    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });