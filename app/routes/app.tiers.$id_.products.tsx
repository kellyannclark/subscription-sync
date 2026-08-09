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
  Card,
  Text,
  BlockStack,
  InlineStack,
  Button,
  Box,
  Divider,
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

  return (
    <div className="ss-dashboard">
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

        <BlockStack gap="500">

          {/* PROFILE HEADER */}

          <div className="ss-hero">
            <InlineStack
              align="space-between"
              blockAlign="start"
              gap="400"
              wrap
            >
              <BlockStack gap="150">
                <Text
                  as="h2"
                  variant="headingLg"
                >
                  {profile.name}
                </Text>

                <Text
                  as="p"
                  variant="bodyMd"
                  tone="subdued"
                >
                  Select the exact
                  product sizes and SKUs
                  customers in this
                  fulfillment profile may
                  choose.
                </Text>
              </BlockStack>

              <BlockStack
                gap="050"
                inlineAlign="end"
              >
                <Text
                  as="p"
                  variant="bodySm"
                  tone="subdued"
                >
                  {
                    selectedProductCount
                  }{" "}
                  products
                </Text>

                <Text
                  as="p"
                  variant="bodySm"
                  fontWeight="semibold"
                >
                  {
                    selectedVariantCount
                  }{" "}
                  eligible SKUs
                </Text>
              </BlockStack>
            </InlineStack>
          </div>

          {/* EXPLANATION */}

          <Card>
            <BlockStack gap="200">
              <Text
                as="h2"
                variant="headingMd"
              >
                How Eligibility Works
              </Text>

              <Text
                as="p"
                variant="bodyMd"
                tone="subdued"
              >
                Each size is treated as
                its own Shopify variant
                and SKU. Selecting a
                product does not
                automatically make every
                size eligible. Choose
                only the exact sizes
                Little Adventures wants
                customers in this tier
                to see.
              </Text>
            </BlockStack>
          </Card>

          {/* FILTERS */}

          <Card>
            <BlockStack gap="300">
              <BlockStack gap="100">
                <div className="ss-section-accent" />

                <Text
                  as="h2"
                  variant="headingLg"
                >
                  Product Catalog
                </Text>
              </BlockStack>

              <Select
                label="Product Group"
                options={
                  categoryOptions
                }
                value={
                  categoryFilter
                }
                onChange={
                  setCategoryFilter
                }
              />

              <TextField
                label="Search products, sizes, or SKUs"
                value={
                  searchValue
                }
                onChange={
                  setSearchValue
                }
                autoComplete="off"
                placeholder="Search by product name, size, or SKU..."
                clearButton
                onClearButtonClick={() =>
                  setSearchValue("")
                }
              />

              <InlineStack
                align="space-between"
                blockAlign="center"
              >
                <Text
                  as="p"
                  variant="bodySm"
                  tone="subdued"
                >
                  {
                    filteredProducts.length
                  }{" "}
                  products shown
                </Text>

                <Text
                  as="p"
                  variant="bodySm"
                  fontWeight="semibold"
                >
                  {
                    selectedVariantCount
                  }{" "}
                  SKUs selected
                </Text>
              </InlineStack>
            </BlockStack>
          </Card>

          {/* PRODUCT / SKU LIST */}

          {filteredProducts.length ===
          0 ? (
            <Card>
              <Box
                padding="500"
              >
                <Text
                  as="p"
                  variant="bodyMd"
                  tone="subdued"
                  alignment="center"
                >
                  No products match the
                  current filters.
                </Text>
              </Box>
            </Card>
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
                    variantIds.length >
                      0 &&
                    selectedCount ===
                      variantIds.length;

                  return (
                    <Card
                      key={
                        product.id
                      }
                    >
                      <BlockStack gap="300">

                        {/* PRODUCT HEADER */}

                        <InlineStack
                          align="space-between"
                          blockAlign="center"
                          gap="300"
                          wrap
                        >
                          <BlockStack gap="100">
                            <InlineStack
                              gap="200"
                              blockAlign="center"
                              wrap
                            >
                              <Text
                                as="h3"
                                variant="headingMd"
                              >
                                {
                                  product.productName
                                }
                              </Text>

                              {product.category && (
                                <Badge tone="info">
                                  {
                                    product.category
                                  }
                                </Badge>
                              )}
                            </InlineStack>

                            <Text
                              as="p"
                              variant="bodySm"
                              tone="subdued"
                            >
                              {
                                selectedCount
                              }{" "}
                              of{" "}
                              {
                                product
                                  .variants
                                  .length
                              }{" "}
                              sizes selected
                            </Text>
                          </BlockStack>

                          <Button
                            size="slim"
                            variant={
                              allSelected
                                ? "primary"
                                : "secondary"
                            }
                            onClick={() =>
                              handleSelectAllProductVariants(
                                variantIds,
                              )
                            }
                          >
                            {allSelected
                              ? "Clear All Sizes"
                              : "Select All Sizes"}
                          </Button>
                        </InlineStack>

                        <Divider />

                        {/* VARIANT HEADER */}

                        <InlineStack
                          gap="400"
                          blockAlign="center"
                        >
                          <Box minWidth="170px">
                            <Text
                              as="span"
                              variant="bodySm"
                              fontWeight="semibold"
                            >
                              Size
                            </Text>
                          </Box>

                          <Box minWidth="170px">
                            <Text
                              as="span"
                              variant="bodySm"
                              fontWeight="semibold"
                            >
                              SKU
                            </Text>
                          </Box>

                          <Box minWidth="120px">
                            <Text
                              as="span"
                              variant="bodySm"
                              fontWeight="semibold"
                            >
                              Inventory
                            </Text>
                          </Box>
                        </InlineStack>

                        <Divider />

                        {/* INDIVIDUAL SKUS */}

                        <BlockStack gap="200">
                          {product.variants.map(
                            (variant) => {
                              const selected =
                                selectedVariantIds.includes(
                                  variant.id,
                                );

                              const inventory =
                                variant.inventoryQty;

                              const outOfStock =
                                inventory !==
                                  null &&
                                inventory <= 0;

                              return (
                                <Box
                                  key={
                                    variant.id
                                  }
                                  padding="200"
                                  background={
                                    selected
                                      ? "bg-surface-secondary"
                                      : undefined
                                  }
                                  borderRadius="200"
                                >
                                  <InlineStack
                                    gap="400"
                                    blockAlign="center"
                                    wrap
                                  >
                                    <Box minWidth="170px">
                                      <Checkbox
                                        label={
                                          variant.size ||
                                          variant.variantName ||
                                          "Default"
                                        }
                                        checked={
                                          selected
                                        }
                                        onChange={() =>
                                          handleToggleVariant(
                                            variant.id,
                                          )
                                        }
                                      />
                                    </Box>

                                    <Box minWidth="170px">
                                      <Text
                                        as="span"
                                        variant="bodyMd"
                                      >
                                        {variant.sku ||
                                          "No SKU"}
                                      </Text>
                                    </Box>

                                    <Box minWidth="120px">
                                      <InlineStack
                                        gap="150"
                                        blockAlign="center"
                                      >
                                        <Text
                                          as="span"
                                          variant="bodyMd"
                                        >
                                          {inventory ??
                                            "—"}
                                        </Text>

                                        {outOfStock && (
                                          <Badge tone="critical">
                                            Out of stock
                                          </Badge>
                                        )}
                                      </InlineStack>
                                    </Box>
                                  </InlineStack>
                                </Box>
                              );
                            },
                          )}
                        </BlockStack>
                      </BlockStack>
                    </Card>
                  );
                },
              )}
            </BlockStack>
          )}

          {/* SUMMARY / SAVE */}

          <Card>
            <BlockStack gap="300">
              <BlockStack gap="100">
                <div className="ss-section-accent" />

                <Text
                  as="h2"
                  variant="headingLg"
                >
                  Eligibility Summary
                </Text>
              </BlockStack>

              <InlineStack
                gap="300"
                wrap
              >
                <SummaryBox
                  label="Products"
                  value={String(
                    selectedProductCount,
                  )}
                />

                <SummaryBox
                  label="Eligible SKUs"
                  value={String(
                    selectedVariantCount,
                  )}
                />

                <SummaryBox
                  label="Catalog Products"
                  value={String(
                    catalogProducts.length,
                  )}
                />
              </InlineStack>

              <Divider />

              <InlineStack
                align="space-between"
                blockAlign="center"
                gap="300"
                wrap
              >
                <Button
                  url={`/app/tiers/${profile.id}`}
                  variant="plain"
                >
                  Back to Profile
                </Button>

                <Button
                  variant="primary"
                  onClick={
                    handleSave
                  }
                >
                  Save Eligible SKUs
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </BlockStack>
      </Page>
    </div>
  );
}

/* ============================================================
   SUMMARY BOX
   ============================================================ */

function SummaryBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <Box
      padding="300"
      background="bg-surface-secondary"
      borderRadius="200"
    >
      <BlockStack gap="050">
        <Text
          as="span"
          variant="bodySm"
          tone="subdued"
        >
          {label}
        </Text>

        <Text
          as="span"
          variant="headingMd"
        >
          {value}
        </Text>
      </BlockStack>
    </Box>
  );
}