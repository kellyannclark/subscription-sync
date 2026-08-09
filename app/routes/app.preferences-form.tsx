import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
} from "@remix-run/node";

import { json } from "@remix-run/node";

import {
  useActionData,
  useLoaderData,
} from "@remix-run/react";

import { useState } from "react";

import {
  Banner,
  BlockStack,
  Button,
  InlineStack,
  Page,
  Select,
  Text,
} from "@shopify/polaris";

import {
  AppProxyForm,
  AppProxyProvider,
} from "@shopify/shopify-app-remix/react";

import { authenticate } from "../shopify.server";
import db from "../db.server";

/* ============================================================
   LITTLE ADVENTURES CUSTOMER COLORS
   ============================================================ */

const COLORS = {
  cream: "#FFFDFC",
  white: "#FFFFFF",

  blush: "#F8EDEE",
  blushStrong: "#E8CBCD",

  lavender: "#F1EEF8",
  lavenderStrong: "#D9D0EC",

  sky: "#EEF5F8",
  skyStrong: "#C9DDE5",

  berry: "#76515D",
  berryDark: "#5B3D47",

  plum: "#66546F",

  text: "#352F32",
  muted: "#746B70",

  border: "#E9E1E2",
};

/* ============================================================
   TYPES
   ============================================================ */

type MonthlyPreference = {
  month: string;
  productId: string;
  variantId: string;
};

type ActionResponse = {
  ok: boolean;
  error: string | null;
  count: number;
};

/* ============================================================
   MONTHS
   ============================================================ */

const generateMonths = (): MonthlyPreference[] => {
  const months: MonthlyPreference[] = [];
  const currentDate = new Date();

  for (let i = 0; i < 12; i++) {
    const date = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + i,
      1,
    );

    const monthLabel = date.toLocaleString(
      "default",
      {
        month: "long",
        year: "numeric",
      },
    );

    months.push({
      month: monthLabel,
      productId: "",
      variantId: "",
    });
  }

  return months;
};

/* ============================================================
   LOADER
   ============================================================ */

export const loader = async ({
  request,
}: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  const safeToken = token ?? "demo-token";

  /*
   * SANDBOX:
   *
   * For now, this preview connects directly to the
   * active Princess Twirl fulfillment profile.
   *
   * Later, the token will identify the subscriber,
   * and that subscriber's fulfillmentProfileId will
   * determine the correct products automatically.
   */
  const twirlProfile =
    await db.fulfillmentProfile.findFirst({
      where: {
        isActive: true,

        OR: [
          {
            name: {
              equals: "Princess Twirl",
              mode: "insensitive",
            },
          },
          {
            name: {
              contains: "Twirl",
              mode: "insensitive",
            },
          },
        ],
      },

      include: {
        products: {
          where: {
            isActive: true,
          },

          orderBy: {
            productName: "asc",
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
        },
      },
    });

  return json({
    appUrl:
      process.env.SHOPIFY_APP_URL ?? "",

    token: safeToken,

    subscriberName:
      "Sample Subscriber",

    profile:
      twirlProfile,

    preferences:
      generateMonths(),
  });
};

/* ============================================================
   ACTION
   ============================================================ */

export const action = async ({
  request,
}: ActionFunctionArgs) => {
  await authenticate.admin(request);

  const formData =
    await request.formData();

  const token =
    formData.get("token");

  const profileId = String(
    formData.get("profileId") ?? "",
  );

  /* ==========================================================
     VALIDATE TOKEN
     ========================================================== */

  if (
    !token ||
    typeof token !== "string"
  ) {
    return json<ActionResponse>(
      {
        ok: false,
        error: "Missing token.",
        count: 0,
      },
      {
        status: 400,
      },
    );
  }

  /* ==========================================================
     VALIDATE PROFILE
     ========================================================== */

  if (!profileId) {
    return json<ActionResponse>(
      {
        ok: false,
        error:
          "Missing fulfillment profile.",
        count: 0,
      },
      {
        status: 400,
      },
    );
  }

  const profile =
    await db.fulfillmentProfile.findUnique({
      where: {
        id: profileId,
      },

      include: {
        products: {
          where: {
            isActive: true,
          },

          include: {
            variants: {
              where: {
                isActive: true,
              },
            },
          },
        },
      },
    });

  if (!profile) {
    return json<ActionResponse>(
      {
        ok: false,
        error:
          "Fulfillment profile could not be found.",
        count: 0,
      },
      {
        status: 404,
      },
    );
  }

  /* ==========================================================
     READ SUBMITTED PICKS
     ========================================================== */

  const submittedPreferences =
    Array.from(
      {
        length: 12,
      },

      (_, index) => ({
        month: String(
          formData.get(
            `preferences[${index}][month]`,
          ) ?? "",
        ),

        productId: String(
          formData.get(
            `preferences[${index}][productId]`,
          ) ?? "",
        ),

        variantId: String(
          formData.get(
            `preferences[${index}][variantId]`,
          ) ?? "",
        ),
      }),
    ).filter(
      (preference) =>
        preference.productId &&
        preference.variantId,
    );

  if (
    submittedPreferences.length === 0
  ) {
    return json<ActionResponse>(
      {
        ok: false,
        error:
          "Choose at least one style and size before submitting.",
        count: 0,
      },
      {
        status: 400,
      },
    );
  }

  /* ==========================================================
     VALIDATE PRODUCTS + SKUS
     ========================================================== */

  for (
    const preference of
    submittedPreferences
  ) {
    const product =
      profile.products.find(
        (item) =>
          item.id ===
          preference.productId,
      );

    if (!product) {
      return json<ActionResponse>(
        {
          ok: false,
          error:
            "One of the selected products is not eligible for this subscription.",
          count: 0,
        },
        {
          status: 400,
        },
      );
    }

    const variant =
      product.variants.find(
        (item) =>
          item.id ===
          preference.variantId,
      );

    if (!variant) {
      return json<ActionResponse>(
        {
          ok: false,
          error:
            "One of the selected sizes is not eligible for this product.",
          count: 0,
        },
        {
          status: 400,
        },
      );
    }
  }

  /*
   * SANDBOX:
   *
   * We are now validating real products and real
   * eligible SKU/size variants from Princess Twirl.
   *
   * We are not yet writing these choices to a real
   * subscriber record. That comes when the token is
   * connected to an actual subscriber.
   */
  console.log(
    "Submitted Twirl preferences",
    {
      token,
      profileId,
      submittedPreferences,
    },
  );

  return json<ActionResponse>({
    ok: true,
    error: null,
    count:
      submittedPreferences.length,
  });
};

/* ============================================================
   PAGE
   ============================================================ */

export default function SubscriberFormPage() {
  const {
    appUrl,
    token,
    subscriberName,
    profile,
    preferences,
  } =
    useLoaderData<typeof loader>();

  const actionData =
    useActionData<typeof action>();

  const [
    localPreferences,
    setLocalPreferences,
  ] =
    useState<MonthlyPreference[]>(
      preferences,
    );

  /* ==========================================================
     PRODUCT CHANGE
     ========================================================== */

  const handleProductChange = (
    index: number,
    productId: string,
  ) => {
    setLocalPreferences(
      (previous) =>
        previous.map(
          (
            item,
            currentIndex,
          ) =>
            currentIndex === index
              ? {
                  ...item,

                  productId,

                  /*
                   * Clear the size whenever the
                   * customer changes styles.
                   */
                  variantId: "",
                }
              : item,
        ),
    );
  };

  /* ==========================================================
     VARIANT CHANGE
     ========================================================== */

  const handleVariantChange = (
    index: number,
    variantId: string,
  ) => {
    setLocalPreferences(
      (previous) =>
        previous.map(
          (
            item,
            currentIndex,
          ) =>
            currentIndex === index
              ? {
                  ...item,
                  variantId,
                }
              : item,
        ),
    );
  };

  /* ==========================================================
     COUNTS
     ========================================================== */

  const selectedCount =
    localPreferences.filter(
      (item) =>
        item.productId &&
        item.variantId,
    ).length;

  const productOptions = [
    {
      label:
        "Choose a Twirl style",

      value: "",
    },

    ...(profile?.products ?? []).map(
      (product) => ({
        label:
          product.productName,

        value:
          product.id,
      }),
    ),
  ];

  return (
    <AppProxyProvider
      appUrl={appUrl}
    >
      <div
        style={{
          background:
            COLORS.cream,

          minHeight:
            "100vh",

          paddingBottom:
            "40px",
        }}
      >
        <Page>
          <BlockStack gap="500">

            {/* ==================================================
                RESULT BANNERS
                ================================================== */}

            {actionData?.ok && (
              <Banner
                title="Your picks are saved"
                tone="success"
              >
                <p>
                  We received{" "}
                  {actionData.count}{" "}
                  upcoming monthly{" "}
                  {actionData.count === 1
                    ? "selection"
                    : "selections"}
                  .
                </p>
              </Banner>
            )}

            {actionData &&
              !actionData.ok && (
                <Banner
                  title="We couldn't save your picks"
                  tone="critical"
                >
                  <p>
                    {actionData.error ??
                      "Something went wrong. Please try again."}
                  </p>
                </Banner>
              )}

            {/* ==================================================
                HERO
                ================================================== */}

            <div
              style={{
                background: `linear-gradient(
                  135deg,
                  ${COLORS.blush} 0%,
                  ${COLORS.lavender} 52%,
                  ${COLORS.sky} 100%
                )`,

                border:
                  `1px solid ${COLORS.border}`,

                borderRadius:
                  "24px",

                padding:
                  "34px 32px",

                boxShadow:
                  "0 10px 30px rgba(91,61,71,0.06)",
              }}
            >
              <InlineStack
                align="space-between"
                blockAlign="center"
                gap="500"
                wrap
              >
                <div
                  style={{
                    maxWidth:
                      "650px",
                  }}
                >
                  <div
                    style={{
                      fontSize:
                        "12px",

                      fontWeight:
                        800,

                      letterSpacing:
                        "0.14em",

                      textTransform:
                        "uppercase",

                      color:
                        COLORS.berry,

                      marginBottom:
                        "10px",
                    }}
                  >
                    LITTLE ADVENTURES
                  </div>

                  <div
                    style={{
                      fontSize:
                        "32px",

                      lineHeight:
                        1.15,

                      fontWeight:
                        700,

                      color:
                        COLORS.berryDark,

                      marginBottom:
                        "10px",
                    }}
                  >
                    Choose Your Next
                    Adventure ✨
                  </div>

                  <div
                    style={{
                      fontSize:
                        "15px",

                      lineHeight:
                        1.6,

                      color:
                        COLORS.text,

                      maxWidth:
                        "600px",
                    }}
                  >
                    Hi{" "}
                    <strong>
                      {subscriberName}
                    </strong>
                    ! Choose your
                    favorite Twirl
                    styles and sizes
                    for the months
                    you'd like to
                    plan ahead.
                  </div>
                </div>

                <div
                  style={{
                    background:
                      "rgba(255,255,255,0.75)",

                    border:
                      `1px solid ${COLORS.blushStrong}`,

                    borderRadius:
                      "16px",

                    padding:
                      "15px 18px",

                    minWidth:
                      "165px",
                  }}
                >
                  <div
                    style={{
                      fontSize:
                        "10px",

                      fontWeight:
                        700,

                      letterSpacing:
                        "0.08em",

                      textTransform:
                        "uppercase",

                      color:
                        COLORS.muted,

                      marginBottom:
                        "4px",
                    }}
                  >
                    Your Plan
                  </div>

                  <div
                    style={{
                      fontSize:
                        "19px",

                      fontWeight:
                        700,

                      color:
                        COLORS.berryDark,
                    }}
                  >
                    {profile?.name ??
                      "Princess Twirl"}
                  </div>

                  <div
                    style={{
                      fontSize:
                        "12px",

                      color:
                        COLORS.muted,

                      marginTop:
                        "3px",
                    }}
                  >
                    {selectedCount}{" "}
                    {selectedCount === 1
                      ? "month"
                      : "months"}{" "}
                    selected
                  </div>
                </div>
              </InlineStack>
            </div>

            {/* ==================================================
                QUICK EXPLANATION
                ================================================== */}

            <div
              style={{
                background:
                  COLORS.white,

                border:
                  `1px solid ${COLORS.border}`,

                borderRadius:
                  "16px",

                padding:
                  "18px 20px",
              }}
            >
              <InlineStack
                gap="400"
                wrap
              >
                <MiniStep
                  number="1"
                  text="Choose a Twirl style"
                />

                <MiniStep
                  number="2"
                  text="Choose the size"
                />

                <MiniStep
                  number="3"
                  text="Submit your picks"
                />
              </InlineStack>
            </div>

            {/* ==================================================
                PROFILE WARNING
                ================================================== */}

            {!profile && (
              <Banner
                title="Princess Twirl profile not found"
                tone="warning"
              >
                <p>
                  Create or activate
                  the Princess Twirl
                  Fulfillment Profile
                  before testing this
                  customer form.
                </p>
              </Banner>
            )}

            {/* ==================================================
                FORM
                ================================================== */}

            <AppProxyForm
              method="post"
              action="/apps/preferences/"
            >
              <input
                type="hidden"
                name="token"
                value={token}
              />

              <input
                type="hidden"
                name="profileId"
                value={
                  profile?.id ?? ""
                }
              />

              <BlockStack gap="400">

                {/* =============================================
                    MONTHLY PICKS
                    ============================================= */}

                <div
                  style={{
                    background:
                      COLORS.white,

                    border:
                      `1px solid ${COLORS.border}`,

                    borderRadius:
                      "18px",

                    padding:
                      "22px",
                  }}
                >
                  <BlockStack gap="300">

                    <InlineStack
                      align="space-between"
                      blockAlign="center"
                      gap="300"
                      wrap
                    >
                      <div>
                        <SectionHeading>
                          Your Monthly Picks
                        </SectionHeading>

                        <div
                          style={{
                            color:
                              COLORS.muted,

                            fontSize:
                              "13px",

                            marginTop:
                              "5px",
                          }}
                        >
                          Choose as many
                          or as few months
                          as you'd like.
                        </div>
                      </div>

                      <div
                        style={{
                          background:
                            COLORS.blush,

                          border:
                            `1px solid ${COLORS.blushStrong}`,

                          borderRadius:
                            "999px",

                          padding:
                            "6px 11px",

                          color:
                            COLORS.berryDark,

                          fontSize:
                            "12px",

                          fontWeight:
                            700,
                        }}
                      >
                        {selectedCount} selected
                      </div>
                    </InlineStack>

                    {/* SMALL MONTH CARDS */}

                    <div
                      style={{
                        display:
                          "grid",

                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(240px, 1fr))",

                        gap:
                          "10px",
                      }}
                    >
                      {localPreferences.map(
                        (
                          item,
                          index,
                        ) => {
                          const selectedProduct =
                            profile?.products.find(
                              (product) =>
                                product.id ===
                                item.productId,
                            );

                          const variantOptions = [
                            {
                              label:
                                "Choose size",

                              value: "",
                            },

                            ...(
                              selectedProduct
                                ?.variants ??
                              []
                            ).map(
                              (variant) => ({
                                label:
                                  buildVariantLabel(
                                    variant.size,
                                    variant.variantName,
                                    variant.sku,
                                  ),

                                value:
                                  variant.id,
                              }),
                            ),
                          ];

                          const complete =
                            Boolean(
                              item.productId &&
                                item.variantId,
                            );

                          return (
                            <div
                              key={
                                item.month
                              }
                              style={{
                                background:
                                  complete
                                    ? COLORS.lavender
                                    : COLORS.cream,

                                border:
                                  complete
                                    ? `1px solid ${COLORS.lavenderStrong}`
                                    : `1px solid ${COLORS.border}`,

                                borderRadius:
                                  "12px",

                                padding:
                                  "12px",
                              }}
                            >
                              <BlockStack gap="200">

                                <InlineStack
                                  align="space-between"
                                  blockAlign="center"
                                  gap="150"
                                >
                                  <Text
                                    as="h3"
                                    variant="headingSm"
                                  >
                                    {
                                      item.month
                                    }
                                  </Text>

                                  {complete && (
                                    <span
                                      style={{
                                        color:
                                          COLORS.plum,

                                        fontSize:
                                          "11px",

                                        fontWeight:
                                          700,
                                      }}
                                    >
                                      ✓
                                    </span>
                                  )}
                                </InlineStack>

                                <input
                                  type="hidden"
                                  name={`preferences[${index}][month]`}
                                  value={
                                    item.month
                                  }
                                />

                                <Select
                                  label="Style"
                                  labelHidden
                                  options={
                                    productOptions
                                  }
                                  value={
                                    item.productId
                                  }
                                  onChange={(
                                    value,
                                  ) =>
                                    handleProductChange(
                                      index,
                                      value,
                                    )
                                  }
                                  disabled={
                                    !profile
                                  }
                                />

                                <input
                                  type="hidden"
                                  name={`preferences[${index}][productId]`}
                                  value={
                                    item.productId
                                  }
                                />

                                <Select
                                  label="Size"
                                  labelHidden
                                  options={
                                    variantOptions
                                  }
                                  value={
                                    item.variantId
                                  }
                                  onChange={(
                                    value,
                                  ) =>
                                    handleVariantChange(
                                      index,
                                      value,
                                    )
                                  }
                                  disabled={
                                    !item.productId
                                  }
                                />

                                <input
                                  type="hidden"
                                  name={`preferences[${index}][variantId]`}
                                  value={
                                    item.variantId
                                  }
                                />

                              </BlockStack>
                            </div>
                          );
                        },
                      )}
                    </div>
                  </BlockStack>
                </div>

                {/* =============================================
                    AVAILABLE TWIRL STYLES
                    ============================================= */}

                <div
                  style={{
                    background:
                      COLORS.white,

                    border:
                      `1px solid ${COLORS.border}`,

                    borderRadius:
                      "18px",

                    padding:
                      "22px",
                  }}
                >
                  <BlockStack gap="300">

                    <div>
                      <SectionHeading>
                        Available Twirl Styles
                      </SectionHeading>

                      <div
                        style={{
                          color:
                            COLORS.muted,

                          fontSize:
                            "13px",

                          lineHeight:
                            1.5,

                          marginTop:
                            "5px",
                        }}
                      >
                        These are the
                        products and sizes
                        currently enabled
                        for{" "}
                        {profile?.name ??
                          "Princess Twirl"}
                        .
                      </div>
                    </div>

                    <div
                      style={{
                        display:
                          "grid",

                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(170px, 1fr))",

                        gap:
                          "10px",
                      }}
                    >
                      {(profile?.products ??
                        []
                      ).map(
                        (product) => (
                          <div
                            key={
                              product.id
                            }
                            style={{
                              background:
                                COLORS.cream,

                              border:
                                `1px solid ${COLORS.border}`,

                              borderRadius:
                                "12px",

                              padding:
                                "13px",
                            }}
                          >
                            <BlockStack gap="100">
                              <Text
                                as="p"
                                variant="headingSm"
                              >
                                {
                                  product.productName
                                }
                              </Text>

                              <Text
                                as="p"
                                variant="bodySm"
                                tone="subdued"
                              >
                                {
                                  product
                                    .variants
                                    .length
                                }{" "}
                                eligible{" "}
                                {product
                                  .variants
                                  .length === 1
                                  ? "size"
                                  : "sizes"}
                              </Text>
                            </BlockStack>
                          </div>
                        ),
                      )}
                    </div>
                  </BlockStack>
                </div>

                {/* =============================================
                    AVAILABILITY NOTE
                    ============================================= */}

                <div
                  style={{
                    background:
                      COLORS.sky,

                    border:
                      `1px solid ${COLORS.skyStrong}`,

                    borderRadius:
                      "14px",

                    padding:
                      "16px 18px",

                    color:
                      COLORS.text,

                    fontSize:
                      "13px",

                    lineHeight:
                      1.55,
                  }}
                >
                  We'll always do our
                  best to fulfill your
                  selected style and
                  size. Availability can
                  change before
                  fulfillment. If a
                  selection isn't made
                  before the deadline,
                  an eligible style may
                  be selected according
                  to your subscription
                  rules.
                </div>

                {/* =============================================
                    SUBMIT
                    ============================================= */}

                <div
                  style={{
                    background: `linear-gradient(
                      135deg,
                      ${COLORS.blush} 0%,
                      ${COLORS.lavender} 100%
                    )`,

                    border:
                      `1px solid ${COLORS.border}`,

                    borderRadius:
                      "16px",

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
                      <div
                        style={{
                          color:
                            COLORS.berryDark,

                          fontSize:
                            "15px",

                          fontWeight:
                            700,
                        }}
                      >
                        Ready for your next adventure?
                      </div>

                      <div
                        style={{
                          color:
                            COLORS.muted,

                          fontSize:
                            "12px",

                          marginTop:
                            "3px",
                        }}
                      >
                        {selectedCount}{" "}
                        monthly{" "}
                        {selectedCount === 1
                          ? "pick"
                          : "picks"}{" "}
                        ready to submit.
                      </div>
                    </div>

                    <Button
                      submit
                      variant="primary"
                      disabled={
                        !profile ||
                        selectedCount === 0
                      }
                    >
                      Submit My Picks
                    </Button>
                  </InlineStack>
                </div>
              </BlockStack>
            </AppProxyForm>
          </BlockStack>
        </Page>
      </div>
    </AppProxyProvider>
  );
}

/* ============================================================
   SECTION HEADING
   ============================================================ */

function SectionHeading({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <InlineStack
      gap="200"
      blockAlign="center"
    >
      <div
        style={{
          width: "4px",
          height: "20px",

          background:
            COLORS.blushStrong,

          borderRadius:
            "999px",

          flexShrink: 0,
        }}
      />

      <Text
        as="h2"
        variant="headingMd"
      >
        {children}
      </Text>
    </InlineStack>
  );
}

/* ============================================================
   MINI STEP
   ============================================================ */

function MiniStep({
  number,
  text,
}: {
  number: string;
  text: string;
}) {
  return (
    <InlineStack
      gap="200"
      blockAlign="center"
      wrap={false}
    >
      <div
        style={{
          width: "26px",
          height: "26px",

          borderRadius:
            "50%",

          background:
            COLORS.lavender,

          border:
            `1px solid ${COLORS.lavenderStrong}`,

          color:
            COLORS.plum,

          display: "flex",

          alignItems:
            "center",

          justifyContent:
            "center",

          fontWeight: 800,

          fontSize:
            "11px",

          flexShrink: 0,
        }}
      >
        {number}
      </div>

      <Text
        as="span"
        variant="bodySm"
      >
        {text}
      </Text>
    </InlineStack>
  );
}

/* ============================================================
   VARIANT LABEL
   ============================================================ */

function buildVariantLabel(
  size: string | null,
  variantName: string,
  sku: string | null,
) {
  const sizeLabel =
    size ||
    variantName ||
    "Default";

  if (!sku) {
    return sizeLabel;
  }

  return `${sizeLabel} • SKU ${sku}`;
}