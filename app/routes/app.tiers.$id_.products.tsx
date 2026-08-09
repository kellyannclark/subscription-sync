import type {
  LoaderFunctionArgs,
  ActionFunctionArgs,
} from "@remix-run/node";

import {
  json,
  redirect,
} from "@remix-run/node";

import {
  useLoaderData,
  useSubmit,
} from "@remix-run/react";

import { useState } from "react";

import {
  Page,
  Text,
  BlockStack,
  InlineStack,
  Button,
  Select,
  TextField,
  Checkbox,
  Badge,
} from "@shopify/polaris";

import { TitleBar } from "@shopify/app-bridge-react";

import { authenticate } from "../shopify.server";
import db from "../db.server";

/* ============================================================
   LOADER
   ============================================================ */

export const loader = async ({
  request,
  params,
}: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  if (!params.id) {
    throw new Response(
      "Missing fulfillment profile ID",
      {
        status: 400,
      },
    );
  }

  const profile =
    await db.fulfillmentProfile.findUnique({
      where: {
        id: params.id,
      },

      include: {
        products: {
          include: {
            variants: true,
          },
        },
      },
    });

  if (!profile) {
    throw new Response(
      "Fulfillment profile not found",
      {
        status: 404,
      },
    );
  }

  const catalogProducts =
    await db.catalogProduct.findMany({
      where: {
        isActive: true,
      },

      include: {
        variants: {
          where: {
            isActive: true,
          },

          orderBy: [
            {
              size: "asc",
            },
            {
              sku: "asc",
            },
          ],
        },
      },

      orderBy: [
        {
          category: "asc",
        },
        {
          productName: "asc",
        },
      ],
    });

  const selectedVariantIds: string[] = [];

  for (const catalogProduct of catalogProducts) {
    const assignedProduct =
      profile.products.find(
        (product) =>
          product.productName ===
          catalogProduct.productName,
      );

    if (!assignedProduct) {
      continue;
    }

    for (const catalogVariant of
      catalogProduct.variants) {
      const isAssigned =
        assignedProduct.variants.some(
          (assignedVariant) => {
            if (
              catalogVariant.sku &&
              assignedVariant.sku
            ) {
              return (
                catalogVariant.sku ===
                assignedVariant.sku
              );
            }

            return (
              catalogVariant.size ===
              assignedVariant.size
            );
          },
        );

      if (isAssigned) {
        selectedVariantIds.push(
          catalogVariant.id,
        );
      }
    }
  }

  return json({
    profile,
    catalogProducts,
    selectedVariantIds,
  });
};

/* ============================================================
   ACTION
   ============================================================ */

export const action = async ({
  request,
  params,
}: ActionFunctionArgs) => {
  await authenticate.admin(request);

  if (!params.id) {
    throw new Response(
      "Missing fulfillment profile ID",
      {
        status: 400,
      },
    );
  }

  const formData =
    await request.formData();

  const selectedVariantIdsRaw =
    String(
      formData.get(
        "selectedVariantIds",
      ) ?? "[]",
    );

  const selectedVariantIds =
    JSON.parse(
      selectedVariantIdsRaw,
    ) as string[];

  const selectedVariants =
    selectedVariantIds.length > 0
      ? await db.catalogVariant.findMany({
          where: {
            id: {
              in: selectedVariantIds,
            },

            isActive: true,
          },

          include: {
            catalogProduct: true,
          },
        })
      : [];

  const groupedProducts =
    new Map<
      string,
      {
        product: (typeof selectedVariants)[number]["catalogProduct"];
        variants: typeof selectedVariants;
      }
    >();

  for (const variant of selectedVariants) {
    const productId =
      variant.catalogProductId;

    const existing =
      groupedProducts.get(
        productId,
      );

    if (existing) {
      existing.variants.push(
        variant,
      );
    } else {
      groupedProducts.set(
        productId,
        {
          product:
            variant.catalogProduct,
          variants: [variant],
        },
      );
    }
  }

  await db.$transaction(async (tx) => {
    await tx.fulfillmentProduct.deleteMany({
      where: {
        fulfillmentProfileId:
          params.id,
      },
    });

    for (const group of groupedProducts.values()) {
      await tx.fulfillmentProduct.create({
        data: {
          fulfillmentProfileId:
            params.id!,

          shopifyProductId:
            group.product
              .shopifyProductId,

          productName:
            group.product
              .productName,

          sku: null,

          forceInclude: false,

          isActive: true,

          variants: {
            create:
              group.variants.map(
                (variant) => ({
                  shopifyVariantId:
                    variant.shopifyVariantId,

                  variantName:
                    variant.variantName,

                  sku:
                    variant.sku,

                  size:
                    variant.size,

                  isActive: true,
                }),
              ),
          },
        },
      });
    }
  });

  return redirect(
    `/app/tiers/${params.id}/products`,
  );
};

/* ============================================================
   PAGE
   ============================================================ */

export default function EligibleProductsPage() {
  const {
    profile,
    catalogProducts,
    selectedVariantIds:
      initialSelectedVariantIds,
  } =
    useLoaderData<typeof loader>();

  const submit = useSubmit();

  const [
    selectedVariantIds,
    setSelectedVariantIds,
  ] = useState<string[]>(
    initialSelectedVariantIds,
  );

  const [
    categoryFilter,
    setCategoryFilter,
  ] = useState("all");

  const [
    searchValue,
    setSearchValue,
  ] = useState("");

  /* ==========================================================
     CATEGORY FILTER
     ========================================================== */

  const categories =
    Array.from(
      new Set(
        catalogProducts
          .map(
            (product) =>
              product.category,
          )
          .filter(
            (
              category,
            ): category is string =>
              Boolean(category),
          ),
      ),
    );

  const categoryOptions = [
    {
      label:
        "All product groups",
      value: "all",
    },

    ...categories.map(
      (category) => ({
        label: category,
        value: category,
      }),
    ),
  ];

  /* ==========================================================
     SEARCH + FILTER
     ========================================================== */

  const normalizedSearch =
    searchValue
      .trim()
      .toLowerCase();

  const filteredProducts =
    catalogProducts.filter(
      (product) => {
        const matchesCategory =
          categoryFilter ===
            "all" ||
          product.category ===
            categoryFilter;

        const matchesSearch =
          normalizedSearch === "" ||
          product.productName
            .toLowerCase()
            .includes(
              normalizedSearch,
            ) ||
          product.variants.some(
            (variant) =>
              variant.sku
                ?.toLowerCase()
                .includes(
                  normalizedSearch,
                ) ||
              variant.size
                ?.toLowerCase()
                .includes(
                  normalizedSearch,
                ),
          );

        return (
          matchesCategory &&
          matchesSearch
        );
      },
    );

  /* ==========================================================
     VARIANT SELECTION
     ========================================================== */

  const handleToggleVariant = (
    variantId: string,
  ) => {
    setSelectedVariantIds(
      (current) => {
        if (
          current.includes(
            variantId,
          )
        ) {
          return current.filter(
            (id) =>
              id !== variantId,
          );
        }

        return [
          ...current,
          variantId,
        ];
      },
    );
  };

  const handleSelectAllProductVariants =
    (
      variantIds: string[],
    ) => {
      setSelectedVariantIds(
        (current) => {
          const allSelected =
            variantIds.every(
              (variantId) =>
                current.includes(
                  variantId,
                ),
            );

          if (allSelected) {
            return current.filter(
              (id) =>
                !variantIds.includes(
                  id,
                ),
            );
          }

          return Array.from(
            new Set([
              ...current,
              ...variantIds,
            ]),
          );
        },
      );
    };

  /* ==========================================================
     COUNTS
     ========================================================== */

  const selectedProductCount =
    catalogProducts.filter(
      (product) =>
        product.variants.some(
          (variant) =>
            selectedVariantIds.includes(
              variant.id,
            ),
        ),
    ).length;

  const selectedVariantCount =
    selectedVariantIds.length;

  /* ==========================================================
     SAVE
     ========================================================== */

  const handleSave = () => {
    const formData =
      new FormData();

    formData.append(
      "selectedVariantIds",
      JSON.stringify(
        selectedVariantIds,
      ),
    );

    submit(
      formData,
      {
        method: "post",
      },
    );
  };

  /* ==========================================================
     RENDER
     ========================================================== */

  /* ==========================================================
     RENDER
     ========================================================== */

  return (
    <div
      style={{
        background: "#F7F7F4",
        minHeight: "100vh",
      }}
    >
      <Page
        title="Eligible Products & Sizes"
        subtitle={`Choose which individual Little Adventures SKUs are available for ${profile.name}.`}
        backAction={{
          content:
            "Edit Fulfillment Profile",
          url: `/app/tiers/${profile.id}`,
        }}
        primaryAction={{
          content:
            "Save Eligible SKUs",
          onAction:
            handleSave,
        }}
      >
        <TitleBar title="Eligible Products & Sizes" />

        <BlockStack gap="600">

          {/* ==================================================
              HERO
              ================================================== */}

          <div
            style={{
              position: "relative",
              overflow: "hidden",
              border: "1px solid #E4E5DF",
              borderRadius: "20px",
              minHeight: "225px",
              background: `
                linear-gradient(
                  108deg,
                  #FCFBF7 0%,
                  #F5F4EF 48%,
                  #D8E0D6 74%,
                  #A8B9A9 100%
                )
              `,
              boxShadow:
                "0 10px 28px rgba(32,34,31,0.06)",
            }}
          >
            <div
              style={{
                position: "absolute",
                width: "390px",
                height: "390px",
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(57,72,61,0.22) 0%, rgba(57,72,61,0.07) 45%, transparent 70%)",
                right: "-85px",
                top: "-180px",
                pointerEvents: "none",
              }}
            />

            <div
              style={{
                position: "absolute",
                width: "560px",
                height: "170px",
                borderRadius: "50%",
                background:
                  "linear-gradient(135deg, rgba(57,72,61,0.94), rgba(104,122,108,0.74))",
                right: "-160px",
                bottom: "-125px",
                transform: "rotate(-5deg)",
                pointerEvents: "none",
              }}
            />

            <div
              style={{
                position: "absolute",
                width: "245px",
                height: "245px",
                borderRadius: "50%",
                border:
                  "1px solid rgba(255,255,255,0.28)",
                right: "38px",
                top: "-28px",
                pointerEvents: "none",
              }}
            />

            <div
              style={{
                position: "relative",
                zIndex: 2,
                padding: "36px 38px",
              }}
            >
              <InlineStack
                align="space-between"
                blockAlign="center"
                gap="600"
                wrap
              >
                <div
                  style={{
                    maxWidth: "650px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: "#4D5E51",
                      marginBottom: "14px",
                    }}
                  >
                    Product eligibility
                  </div>

                  <div
                    style={{
                      fontSize: "30px",
                      lineHeight: 1.12,
                      fontWeight: 650,
                      letterSpacing: "-0.035em",
                      color: "#20221F",
                      marginBottom: "11px",
                    }}
                  >
                    Choose exactly what
                    <br />
                    <span
                      style={{
                        color: "#4D5E51",
                      }}
                    >
                      this profile can offer.
                    </span>
                  </div>

                  <div
                    style={{
                      maxWidth: "580px",
                      fontSize: "14px",
                      lineHeight: 1.6,
                      color: "#52574F",
                    }}
                  >
                    Select the exact product sizes
                    and SKUs customers in{" "}
                    <strong>{profile.name}</strong>{" "}
                    should be able to choose.
                  </div>
                </div>

                <div
                  style={{
                    minWidth: "225px",
                    padding: "18px 20px",
                    borderRadius: "16px",
                    background:
                      "rgba(255,255,255,0.76)",
                    border:
                      "1px solid rgba(255,255,255,0.72)",
                    backdropFilter: "blur(8px)",
                    boxShadow:
                      "0 8px 24px rgba(32,34,31,0.07)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      letterSpacing: "0.10em",
                      textTransform: "uppercase",
                      color: "#4D5E51",
                      marginBottom: "9px",
                    }}
                  >
                    Current eligibility
                  </div>

                  <div
                    style={{
                      fontSize: "30px",
                      lineHeight: 1,
                      fontWeight: 650,
                      letterSpacing: "-0.04em",
                      color: "#20221F",
                      marginBottom: "8px",
                    }}
                  >
                    {selectedVariantCount}
                  </div>

                  <div
                    style={{
                      fontSize: "12px",
                      lineHeight: 1.45,
                      color: "#787D75",
                    }}
                  >
                    eligible SKU
                    {selectedVariantCount === 1
                      ? ""
                      : "s"}
                  </div>

                  <div
                    style={{
                      height: "1px",
                      background:
                        "rgba(77,94,81,0.12)",
                      margin: "13px 0",
                    }}
                  />

                  <div
                    style={{
                      fontSize: "11px",
                      color: "#52574F",
                    }}
                  >
                    {selectedProductCount} product
                    {selectedProductCount === 1
                      ? ""
                      : "s"}{" "}
                    represented
                  </div>
                </div>
              </InlineStack>
            </div>

            <div
              style={{
                position: "absolute",
                top: "15px",
                right: "15px",
                background:
                  "rgba(255,255,255,0.76)",
                border:
                  "1px solid rgba(77,94,81,0.16)",
                borderRadius: "999px",
                padding: "7px 11px",
                backdropFilter: "blur(7px)",
              }}
            >
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 650,
                  color: "#4D5E51",
                }}
              >
                ● Development sandbox
              </span>
            </div>
          </div>

          {/* ==================================================
              HOW IT WORKS
              ================================================== */}

          <div
            style={{
              background: "#EEF1ED",
              border: "1px solid #E4EAE3",
              borderRadius: "16px",
              padding: "18px 20px",
            }}
          >
            <InlineStack
              align="space-between"
              blockAlign="center"
              gap="400"
              wrap
            >
              <div
                style={{
                  maxWidth: "720px",
                }}
              >
                <div
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    letterSpacing: "0.10em",
                    textTransform: "uppercase",
                    color: "#687A6C",
                    marginBottom: "5px",
                  }}
                >
                  How eligibility works
                </div>

                <div
                  style={{
                    fontSize: "13px",
                    lineHeight: 1.55,
                    color: "#52574F",
                  }}
                >
                  Each size is its own Shopify
                  variant and SKU. Selecting one
                  product does not automatically
                  select every size, so choose only
                  the exact variants customers in
                  this profile should see.
                </div>
              </div>

              <div
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E4E5DF",
                  borderRadius: "999px",
                  padding: "7px 12px",
                  color: "#4D5E51",
                  fontSize: "12px",
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                }}
              >
                Variant-level control
              </div>
            </InlineStack>
          </div>

          {/* ==================================================
              FILTERS
              ================================================== */}

          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #E4E5DF",
              borderRadius: "18px",
              padding: "22px 24px",
              boxShadow:
                "0 2px 8px rgba(32,34,31,0.025)",
            }}
          >
            <BlockStack gap="400">
              <InlineStack
                align="space-between"
                blockAlign="end"
                gap="400"
                wrap
              >
                <SectionHeader
                  eyebrow="Catalog"
                  title="Product catalog"
                  description="Filter the Little Adventures catalog and choose the exact sizes and SKUs this profile may use."
                />

                <div
                  style={{
                    background: "#EEF1ED",
                    border: "1px solid #E4EAE3",
                    borderRadius: "999px",
                    padding: "7px 12px",
                    color: "#4D5E51",
                    fontWeight: 700,
                    fontSize: "12px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {filteredProducts.length} shown
                </div>
              </InlineStack>

              <InlineStack
                gap="300"
                wrap
              >
                <div
                  style={{
                    minWidth: "220px",
                    flex: "0 1 260px",
                  }}
                >
                  <Select
                    label="Product Group"
                    options={categoryOptions}
                    value={categoryFilter}
                    onChange={setCategoryFilter}
                  />
                </div>

                <div
                  style={{
                    minWidth: "280px",
                    flex: "1 1 360px",
                  }}
                >
                  <TextField
                    label="Search products, sizes, or SKUs"
                    value={searchValue}
                    onChange={setSearchValue}
                    autoComplete="off"
                    placeholder="Search by product name, size, or SKU..."
                    clearButton
                    onClearButtonClick={() =>
                      setSearchValue("")
                    }
                  />
                </div>
              </InlineStack>

              <InlineStack
                align="space-between"
                blockAlign="center"
                gap="300"
                wrap
              >
                <Text
                  as="p"
                  variant="bodySm"
                  tone="subdued"
                >
                  {selectedProductCount} product
                  {selectedProductCount === 1
                    ? ""
                    : "s"}{" "}
                  currently represented
                </Text>

                <Text
                  as="p"
                  variant="bodySm"
                  fontWeight="semibold"
                >
                  {selectedVariantCount} SKU
                  {selectedVariantCount === 1
                    ? ""
                    : "s"}{" "}
                  selected
                </Text>
              </InlineStack>
            </BlockStack>
          </div>

          {/* ==================================================
              PRODUCT / SKU LIST
              ================================================== */}

          {filteredProducts.length === 0 ? (
            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid #E4E5DF",
                borderRadius: "18px",
                padding: "40px 24px",
                textAlign: "center",
                color: "#787D75",
                fontSize: "13px",
              }}
            >
              No products match the current
              filters.
            </div>
          ) : (
            <BlockStack gap="400">
              {filteredProducts.map(
                (product) => {
                  const variantIds =
                    product.variants.map(
                      (variant) =>
                        variant.id,
                    );

                  const selectedCount =
                    variantIds.filter(
                      (variantId) =>
                        selectedVariantIds.includes(
                          variantId,
                        ),
                    ).length;

                  const allSelected =
                    variantIds.length > 0 &&
                    selectedCount ===
                      variantIds.length;

                  return (
                    <ProductEligibilityCard
                      key={product.id}
                      product={product}
                      selectedCount={selectedCount}
                      allSelected={allSelected}
                      selectedVariantIds={
                        selectedVariantIds
                      }
                      onToggleAll={() =>
                        handleSelectAllProductVariants(
                          variantIds,
                        )
                      }
                      onToggleVariant={
                        handleToggleVariant
                      }
                    />
                  );
                },
              )}
            </BlockStack>
          )}

          {/* ==================================================
              SUMMARY / SAVE
              ================================================== */}

          <div
            style={{
              background: "#39483D",
              borderRadius: "18px",
              padding: "22px 24px",
              boxShadow:
                "0 10px 24px rgba(39,51,42,0.10)",
            }}
          >
            <InlineStack
              align="space-between"
              blockAlign="center"
              gap="500"
              wrap
            >
              <div>
                <div
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    letterSpacing: "0.11em",
                    textTransform: "uppercase",
                    color:
                      "rgba(255,255,255,0.62)",
                    marginBottom: "6px",
                  }}
                >
                  Eligibility summary
                </div>

                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: 650,
                    color: "#FFFFFF",
                    marginBottom: "4px",
                  }}
                >
                  {selectedVariantCount} eligible SKU
                  {selectedVariantCount === 1
                    ? ""
                    : "s"}{" "}
                  across {selectedProductCount} product
                  {selectedProductCount === 1
                    ? ""
                    : "s"}
                </div>

                <div
                  style={{
                    fontSize: "12px",
                    lineHeight: 1.5,
                    color:
                      "rgba(255,255,255,0.65)",
                  }}
                >
                  Catalog contains{" "}
                  {catalogProducts.length} product
                  {catalogProducts.length === 1
                    ? ""
                    : "s"}{" "}
                  total.
                </div>
              </div>

              <InlineStack
                gap="300"
                wrap
              >
                <Button
                  url={`/app/tiers/${profile.id}`}
                >
                  Back to Profile
                </Button>

                <Button
                  variant="primary"
                  onClick={handleSave}
                >
                  Save Eligible SKUs
                </Button>
              </InlineStack>
            </InlineStack>
          </div>

          <div style={{ height: "20px" }} />
        </BlockStack>
      </Page>
    </div>
  );
}

/* ============================================================
   SECTION HEADER
   ============================================================ */

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: "10px",
          fontWeight: 700,
          letterSpacing: "0.11em",
          textTransform: "uppercase",
          color: "#687A6C",
          marginBottom: "6px",
        }}
      >
        {eyebrow}
      </div>

      <div
        style={{
          fontSize: "20px",
          fontWeight: 650,
          letterSpacing: "-0.015em",
          color: "#20221F",
          marginBottom: "5px",
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: "13px",
          lineHeight: 1.5,
          color: "#787D75",
          maxWidth: "700px",
        }}
      >
        {description}
      </div>
    </div>
  );
}

/* ============================================================
   PRODUCT ELIGIBILITY CARD
   ============================================================ */

function ProductEligibilityCard({
  product,
  selectedCount,
  allSelected,
  selectedVariantIds,
  onToggleAll,
  onToggleVariant,
}: {
  product: {
    id: string;
    productName: string;
    category: string | null;
    variants: {
      id: string;
      size: string | null;
      variantName: string | null;
      sku: string | null;
      inventoryQty: number | null;
    }[];
  };

  selectedCount: number;
  allSelected: boolean;
  selectedVariantIds: string[];
  onToggleAll: () => void;
  onToggleVariant: (
    variantId: string,
  ) => void;
}) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid #E4E5DF",
        borderRadius: "18px",
        overflow: "hidden",
        boxShadow:
          "0 2px 8px rgba(32,34,31,0.025)",
      }}
    >
      <div
        style={{
          background:
            selectedCount > 0
              ? "#EEF1ED"
              : "#F7F7F4",

          borderBottom:
            `1px solid ${
              selectedCount > 0
                ? "#E4EAE3"
                : "#E4E5DF"
            }`,

          padding:
            "18px 20px",
        }}
      >
        <InlineStack
          align="space-between"
          blockAlign="center"
          gap="300"
          wrap
        >
          <div>
            <InlineStack
              gap="200"
              blockAlign="center"
              wrap
            >
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: 650,
                  color: "#20221F",
                }}
              >
                {product.productName}
              </div>

              {product.category && (
                <Badge tone="info">
                  {product.category}
                </Badge>
              )}
            </InlineStack>

            <div
              style={{
                fontSize: "12px",
                color: "#787D75",
                marginTop: "5px",
              }}
            >
              {selectedCount} of{" "}
              {product.variants.length} size
              {product.variants.length === 1
                ? ""
                : "s"}{" "}
              selected
            </div>
          </div>

          <Button
            size="slim"
            variant={
              allSelected
                ? "primary"
                : "secondary"
            }
            onClick={onToggleAll}
          >
            {allSelected
              ? "Clear All Sizes"
              : "Select All Sizes"}
          </Button>
        </InlineStack>
      </div>

      <div
        style={{
          padding:
            "0 20px 18px",
        }}
      >
        <div
          style={{
            display:
              "grid",

            gridTemplateColumns:
              "minmax(170px, 1.1fr) minmax(170px, 1fr) minmax(130px, 0.8fr)",

            gap:
              "18px",

            padding:
              "13px 12px",

            color:
              "#787D75",

            fontSize:
              "10px",

            fontWeight:
              700,

            letterSpacing:
              "0.06em",

            textTransform:
              "uppercase",

            borderBottom:
              "1px solid #E4E5DF",
          }}
        >
          <div>Size</div>
          <div>SKU</div>
          <div>Inventory</div>
        </div>

        {product.variants.map(
          (variant) => {
            const selected =
              selectedVariantIds.includes(
                variant.id,
              );

            const inventory =
              variant.inventoryQty;

            const outOfStock =
              inventory !== null &&
              inventory <= 0;

            return (
              <div
                key={variant.id}
                style={{
                  display:
                    "grid",

                  gridTemplateColumns:
                    "minmax(170px, 1.1fr) minmax(170px, 1fr) minmax(130px, 0.8fr)",

                  gap:
                    "18px",

                  alignItems:
                    "center",

                  padding:
                    "12px",

                  marginTop:
                    "8px",

                  borderRadius:
                    "12px",

                  background:
                    selected
                      ? "#EEF1ED"
                      : "#FFFFFF",

                  border:
                    `1px solid ${
                      selected
                        ? "#E4EAE3"
                        : "#ECEDE8"
                    }`,
                }}
              >
                <Checkbox
                  label={
                    variant.size ||
                    variant.variantName ||
                    "Default"
                  }
                  checked={selected}
                  onChange={() =>
                    onToggleVariant(
                      variant.id,
                    )
                  }
                />

                <div
                  style={{
                    fontSize:
                      "13px",

                    color:
                      "#20221F",
                  }}
                >
                  {variant.sku ||
                    "No SKU"}
                </div>

                <InlineStack
                  gap="150"
                  blockAlign="center"
                >
                  <span
                    style={{
                      fontSize:
                        "13px",

                      color:
                        "#20221F",
                    }}
                  >
                    {inventory ?? "—"}
                  </span>

                  {outOfStock && (
                    <Badge tone="critical">
                      Out of stock
                    </Badge>
                  )}
                </InlineStack>
              </div>
            );
          },
        )}
      </div>
    </div>
  );
}