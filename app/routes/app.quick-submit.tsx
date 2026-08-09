import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
} from "@remix-run/node";

import { json } from "@remix-run/node";

import {
  Form,
  useActionData,
  useLoaderData,
  useNavigation,
} from "@remix-run/react";

import {
  useMemo,
  useState,
} from "react";

import {
  Banner,
  BlockStack,
  Button,
  InlineGrid,
  InlineStack,
  Layout,
  Page,
  Select,
  Text,
} from "@shopify/polaris";

import { authenticate } from "../shopify.server";
import db from "../db.server";

/* ============================================================
   SUBSCRIPTIONSYNC DESIGN SYSTEM
   ============================================================ */

const COLORS = {
  // Main surfaces
  page: "#F7F7F4",
  white: "#FFFFFF",

  // Typography
  text: "#20221F",
  textSoft: "#52574F",
  muted: "#787D75",

  // Sage brand accent
  sage: "#687A6C",
  sageDark: "#4D5E51",
  sageDeep: "#39483D",
  sageSoft: "#EEF1ED",
  sageSoftStrong: "#E4EAE3",

  // Warm neutral
  cream: "#F5F1E8",
  creamStrong: "#E9E1D3",
  warmText: "#705F42",

  // Borders
  border: "#E4E5DF",
  borderStrong: "#D6D8D2",

  // Attention
  attentionSoft: "#F7F0E2",
  attentionBorder: "#E9D6AE",

  // Success / critical surfaces
  successSoft: "#EDF3ED",
  successBorder: "#CDDCCF",
  criticalSoft: "#F8EDEC",
  criticalBorder: "#E8C7C4",
};

/* ============================================================
   TYPES
   ============================================================ */

type MonthlySelection = {
  month: string;
  product: string;
};

const initialSelections: MonthlySelection[] = [
  {
    month: "January",
    product: "",
  },
  {
    month: "February",
    product: "",
  },
  {
    month: "March",
    product: "",
  },
  {
    month: "April",
    product: "",
  },
  {
    month: "May",
    product: "",
  },
  {
    month: "June",
    product: "",
  },
  {
    month: "July",
    product: "",
  },
  {
    month: "August",
    product: "",
  },
  {
    month: "September",
    product: "",
  },
  {
    month: "October",
    product: "",
  },
  {
    month: "November",
    product: "",
  },
  {
    month: "December",
    product: "",
  },
];

/* ============================================================
   LOADER
   ============================================================ */

export const loader = async ({
  request,
}: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  /*
   * Load subscribers using the NEW
   * Fulfillment Profile architecture.
   *
   * Each subscriber's profile includes only
   * the products that have been configured
   * as eligible for that profile.
   */
  const subscribers =
    await db.subscriber.findMany({
      orderBy: {
        name: "asc",
      },

      include: {
        fulfillmentProfile: {
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

                  orderBy: {
                    size: "asc",
                  },
                },
              },
            },
          },
        },
      },
    });

  return json({
    subscribers,
    selections:
      initialSelections,
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

  const intent =
    formData.get("intent");

  if (
    intent === "clear"
  ) {
    return json({
      success: true,
      message:
        "Form cleared.",
    });
  }

  const subscriberId =
    String(
      formData.get(
        "subscriberId",
      ) ?? "",
    );

  const months =
    formData.getAll(
      "month",
    );

  const products =
    formData.getAll(
      "product",
    );

  if (!subscriberId) {
    return json({
      success: false,

      message:
        "Choose a subscriber before saving selections.",
    });
  }

  const subscriber =
    await db.subscriber.findUnique({
      where: {
        id: subscriberId,
      },

      include: {
        fulfillmentProfile: {
          include: {
            products: {
              where: {
                isActive: true,
              },
            },
          },
        },
      },
    });

  if (!subscriber) {
    return json({
      success: false,

      message:
        "Subscriber could not be found.",
    });
  }

  if (
    !subscriber
      .fulfillmentProfile
  ) {
    return json({
      success: false,

      message:
        "This subscriber does not have a Fulfillment Profile assigned.",
    });
  }

  const selectedItems =
    months
      .map(
        (
          month,
          index,
        ) => ({
          month:
            String(month),

          productName:
            String(
              products[
                index
              ] ?? "",
            ),
        }),
      )
      .filter(
        (item) =>
          item.productName
            .length > 0,
      );

  if (
    selectedItems.length ===
    0
  ) {
    return json({
      success: false,

      message:
        "Choose at least one product before saving.",
    });
  }

  /*
   * Validate that the products submitted by
   * the browser are actually eligible for the
   * subscriber's Fulfillment Profile.
   */
  const eligibleProductNames =
    new Set(
      subscriber
        .fulfillmentProfile
        .products
        .map(
          (product) =>
            product.productName,
        ),
    );

  const invalidSelection =
    selectedItems.find(
      (item) =>
        !eligibleProductNames.has(
          item.productName,
        ),
    );

  if (invalidSelection) {
    return json({
      success: false,

      message:
        `${invalidSelection.productName} is not eligible for ${subscriber.fulfillmentProfile.name}.`,
    });
  }

  await db.$transaction(
    async (tx) => {
      for (
        const item of
        selectedItems
      ) {
        await tx.selection.create({
          data: {
            subscriberId,

            month:
              item.month,

            productName:
              item.productName,

            status:
              "Manual Selection",

            source:
              "Quick Submit",

            notes:
              "Manual sandbox selection entered by administrator.",
          },
        });
      }

      /*
       * OLD:
       *
       * status: "Order Ready"
       *
       * NEW:
       *
       * workflowStatus is the operational
       * workflow field on Subscriber.
       */
      await tx.subscriber.update({
        where: {
          id:
            subscriberId,
        },

        data: {
          workflowStatus:
            "Selection Submitted",

          selectionSubmittedAt:
            new Date(),
        },
      });

      await tx.activityLog.create({
        data: {
          eventType:
            "Quick Submit",

          description:
            `Saved ${selectedItems.length} manual selection(s) for ${subscriber.name}.`,

          status:
            "Success",

          user:
            "Admin",

          source:
            "SubscriptionSync",
        },
      });
    },
  );

  return json({
    success: true,

    message:
      `Saved ${selectedItems.length} selection(s) for ${subscriber.name}.`,
  });
};

/* ============================================================
   PAGE
   ============================================================ */

export default function QuickSubmitPage() {
  const {
    subscribers,
    selections,
  } = useLoaderData<typeof loader>();

  const actionData =
    useActionData<typeof action>();

  const navigation =
    useNavigation();

  const isSubmitting =
    navigation.state === "submitting";

  const [
    intent,
    setIntent,
  ] = useState("save");

  const [
    selectedSubscriberId,
    setSelectedSubscriberId,
  ] = useState(
    subscribers[0]?.id ?? "",
  );

  const [
    monthlySelections,
    setMonthlySelections,
  ] =
    useState<MonthlySelection[]>(
      selections,
    );

  /* ==========================================================
     SELECTED SUBSCRIBER
     ========================================================== */

  const selectedSubscriber =
    useMemo(() => {
      return subscribers.find(
        (subscriber) =>
          subscriber.id ===
          selectedSubscriberId,
      );
    }, [
      subscribers,
      selectedSubscriberId,
    ]);

  const productOptions =
    useMemo(() => {
      const products =
        selectedSubscriber
          ?.fulfillmentProfile
          ?.products ?? [];

      return [
        {
          label:
            "Select a product",
          value: "",
        },

        ...products.map(
          (product) => ({
            label:
              product.productName,

            value:
              product.productName,
          }),
        ),
      ];
    }, [
      selectedSubscriber,
    ]);

  /* ==========================================================
     CHANGE SUBSCRIBER
     ========================================================== */

  const handleSubscriberChange =
    (
      subscriberId: string,
    ) => {
      setSelectedSubscriberId(
        subscriberId,
      );

      setMonthlySelections(
        (current) =>
          current.map(
            (selection) => ({
              ...selection,
              product: "",
            }),
          ),
      );
    };

  /* ==========================================================
     UPDATE MONTH
     ========================================================== */

  const updateSelection =
    (
      month: string,
      product: string,
    ) => {
      setMonthlySelections(
        (
          currentSelections,
        ) =>
          currentSelections.map(
            (selection) =>
              selection.month ===
              month
                ? {
                    ...selection,
                    product,
                  }
                : selection,
          ),
      );
    };

  /* ==========================================================
     CLEAR
     ========================================================== */

  const clearForm =
    () => {
      setIntent("clear");

      setMonthlySelections(
        (
          currentSelections,
        ) =>
          currentSelections.map(
            (selection) => ({
              ...selection,
              product: "",
            }),
          ),
      );
    };

  const firstHalf =
    monthlySelections.slice(
      0,
      6,
    );

  const secondHalf =
    monthlySelections.slice(
      6,
    );

  const selectedCount =
    monthlySelections.filter(
      (selection) =>
        Boolean(
          selection.product,
        ),
    ).length;

  const eligibleProductCount =
    selectedSubscriber
      ?.fulfillmentProfile
      ?.products.length ?? 0;

  return (
    <div
      style={{
        background: COLORS.page,
        minHeight: "100vh",
      }}
    >
      <Page
        title="Quick Submit"
        subtitle="Manually record or adjust a customer's monthly selection when needed."
        backAction={{
          content: "Dashboard",
          url: "/app",
        }}
      >
        <Form method="post">
          <input
            type="hidden"
            name="intent"
            value={intent}
          />

          <input
            type="hidden"
            name="subscriberId"
            value={
              selectedSubscriberId
            }
          />

          {monthlySelections.map(
            (selection) => (
              <div
                key={
                  selection.month
                }
              >
                <input
                  type="hidden"
                  name="month"
                  value={
                    selection.month
                  }
                />

                <input
                  type="hidden"
                  name="product"
                  value={
                    selection.product
                  }
                />
              </div>
            ),
          )}

          <BlockStack gap="600">

            {/* ==================================================
                RESULT
                ================================================== */}

            {actionData?.message && (
              <Banner
                title={
                  actionData.success
                    ? "Action completed"
                    : "Action needed"
                }
                tone={
                  actionData.success
                    ? "success"
                    : "critical"
                }
              >
                <p>
                  {
                    actionData.message
                  }
                </p>
              </Banner>
            )}

            {/* ==================================================
                HERO
                ================================================== */}

            <div
              style={{
                position: "relative",
                overflow: "hidden",

                border:
                  `1px solid ${COLORS.border}`,

                borderRadius: "20px",

                minHeight: "220px",

                background: `
                  linear-gradient(
                    108deg,
                    #FCFBF7 0%,
                    #F5F4EF 48%,
                    #D9E1D7 74%,
                    #A9BAAA 100%
                  )
                `,

                boxShadow:
                  "0 10px 28px rgba(32,34,31,0.06)",
              }}
            >
              {/* Soft sage glow */}
              <div
                style={{
                  position: "absolute",

                  width: "380px",
                  height: "380px",

                  borderRadius: "50%",

                  background:
                    "radial-gradient(circle, rgba(57,72,61,0.22) 0%, rgba(57,72,61,0.07) 45%, transparent 70%)",

                  right: "-80px",
                  top: "-175px",

                  pointerEvents: "none",
                }}
              />

              {/* Bottom curve */}
              <div
                style={{
                  position: "absolute",

                  width: "560px",
                  height: "170px",

                  borderRadius: "50%",

                  background:
                    "linear-gradient(135deg, rgba(57,72,61,0.94), rgba(104,122,108,0.74))",

                  right: "-155px",
                  bottom: "-125px",

                  transform:
                    "rotate(-5deg)",

                  pointerEvents: "none",
                }}
              />

              {/* Fine circles */}
              <div
                style={{
                  position: "absolute",

                  width: "240px",
                  height: "240px",

                  borderRadius: "50%",

                  border:
                    "1px solid rgba(255,255,255,0.28)",

                  right: "38px",
                  top: "-30px",

                  pointerEvents: "none",
                }}
              />

              <div
                style={{
                  position: "relative",
                  zIndex: 2,

                  padding:
                    "36px 38px",
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
                      maxWidth: "620px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,

                        letterSpacing:
                          "0.12em",

                        textTransform:
                          "uppercase",

                        color:
                          COLORS.sageDark,

                        marginBottom:
                          "14px",
                      }}
                    >
                      Manual selection
                    </div>

                    <div
                      style={{
                        fontSize: "30px",

                        lineHeight: 1.12,

                        fontWeight: 650,

                        letterSpacing:
                          "-0.035em",

                        color:
                          COLORS.text,

                        marginBottom:
                          "11px",
                      }}
                    >
                      Personalization when
                      <br />

                      <span
                        style={{
                          color:
                            COLORS.sageDark,
                        }}
                      >
                        a customer needs help.
                      </span>
                    </div>

                    <div
                      style={{
                        maxWidth: "560px",

                        fontSize: "14px",

                        lineHeight: 1.6,

                        color:
                          COLORS.textSoft,
                      }}
                    >
                      Choose a subscriber, review
                      their fulfillment rules, and
                      record only the products
                      eligible for their plan.
                    </div>
                  </div>

                  {/* Live selection summary */}

                  <div
                    style={{
                      minWidth: "225px",

                      padding:
                        "18px 20px",

                      borderRadius: "16px",

                      background:
                        "rgba(255,255,255,0.76)",

                      border:
                        "1px solid rgba(255,255,255,0.72)",

                      backdropFilter:
                        "blur(8px)",

                      boxShadow:
                        "0 8px 24px rgba(32,34,31,0.07)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "10px",

                        fontWeight: 700,

                        letterSpacing:
                          "0.10em",

                        textTransform:
                          "uppercase",

                        color:
                          COLORS.sageDark,

                        marginBottom:
                          "9px",
                      }}
                    >
                      Current entry
                    </div>

                    <div
                      style={{
                        fontSize: "30px",

                        lineHeight: 1,

                        fontWeight: 650,

                        letterSpacing:
                          "-0.04em",

                        color: COLORS.text,

                        marginBottom:
                          "8px",
                      }}
                    >
                      {selectedCount}
                    </div>

                    <div
                      style={{
                        fontSize: "12px",
                        lineHeight: 1.45,
                        color: COLORS.muted,
                      }}
                    >
                      month
                      {selectedCount === 1
                        ? ""
                        : "s"}{" "}
                      selected
                    </div>

                    <div
                      style={{
                        height: "1px",
                        background:
                          "rgba(77,94,81,0.12)",
                        margin:
                          "13px 0",
                      }}
                    />

                    <div
                      style={{
                        fontSize: "11px",
                        color:
                          COLORS.textSoft,
                      }}
                    >
                      {eligibleProductCount}{" "}
                      eligible product
                      {eligibleProductCount === 1
                        ? ""
                        : "s"}
                    </div>
                  </div>
                </InlineStack>
              </div>

              {/* Sandbox badge */}

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

                  backdropFilter:
                    "blur(7px)",
                }}
              >
                <span
                  style={{
                    fontSize: "11px",

                    fontWeight: 650,

                    color:
                      COLORS.sageDark,
                  }}
                >
                  ● Sandbox mode
                </span>
              </div>
            </div>

            {/* ==================================================
                CUSTOMER
                ================================================== */}

            <Layout>
              <Layout.Section>
                <BlockStack gap="500">

                  <div
                    style={{
                      background:
                        COLORS.white,

                      border:
                        `1px solid ${COLORS.border}`,

                      borderRadius:
                        "18px",

                      padding:
                        "24px",

                      boxShadow:
                        "0 2px 8px rgba(32,34,31,0.025)",
                    }}
                  >
                    <BlockStack gap="400">
                      <SectionHeader
                        eyebrow="Step 1"
                        title="Choose customer"
                        description="Select the subscriber whose monthly choices you need to enter or adjust."
                      />

                      <Select
                        label="Subscriber"
                        value={
                          selectedSubscriberId
                        }
                        onChange={
                          handleSubscriberChange
                        }
                        options={[
                          {
                            label:
                              "Choose a subscriber",
                            value: "",
                          },

                          ...subscribers.map(
                            (
                              subscriber,
                            ) => ({
                              label:
                                `${subscriber.name} — ${subscriber.email}`,

                              value:
                                subscriber.id,
                            }),
                          ),
                        ]}
                      />

                      {selectedSubscriber ? (
                        <div
                          style={{
                            background:
                              COLORS.sageSoft,

                            border:
                              `1px solid ${COLORS.sageSoftStrong}`,

                            borderRadius:
                              "14px",

                            padding:
                              "20px",
                          }}
                        >
                          <InlineGrid
                            columns={{
                              xs: 1,
                              md: 2,
                            }}
                            gap="400"
                          >
                            <InfoItem
                              label="Customer"
                              value={
                                selectedSubscriber.name
                              }
                            />

                            <InfoItem
                              label="Email"
                              value={
                                selectedSubscriber.email
                              }
                            />

                            <InfoItem
                              label="Fulfillment Profile"
                              value={
                                selectedSubscriber
                                  .fulfillmentProfile
                                  ?.name ??
                                "No Profile"
                              }
                            />

                            <InfoItem
                              label="Workflow Status"
                              value={
                                selectedSubscriber.workflowStatus
                              }
                            />

                            <InfoItem
                              label="Subscription Start"
                              value={formatDate(
                                selectedSubscriber.subscriptionStartDate,
                              )}
                            />

                            <InfoItem
                              label="Next Ship Date"
                              value={formatDate(
                                selectedSubscriber.nextShipDate,
                              )}
                            />

                            <InfoItem
                              label="Selection Deadline"
                              value={formatDate(
                                selectedSubscriber.nextSelectionDeadline,
                              )}
                            />

                            <InfoItem
                              label="Eligible Products"
                              value={String(
                                selectedSubscriber
                                  .fulfillmentProfile
                                  ?.products
                                  .length ?? 0,
                              )}
                            />
                          </InlineGrid>
                        </div>
                      ) : (
                        <EmptyPrompt>
                          Choose a subscriber to begin.
                        </EmptyPrompt>
                      )}
                    </BlockStack>
                  </div>

                  {/* ==================================================
                      MONTHLY SELECTIONS
                      ================================================== */}

                  <div
                    style={{
                      background:
                        COLORS.white,

                      border:
                        `1px solid ${COLORS.border}`,

                      borderRadius:
                        "18px",

                      padding:
                        "24px",

                      boxShadow:
                        "0 2px 8px rgba(32,34,31,0.025)",
                    }}
                  >
                    <BlockStack gap="400">

                      <InlineStack
                        align="space-between"
                        blockAlign="center"
                        gap="400"
                        wrap
                      >
                        <SectionHeader
                          eyebrow="Step 2"
                          title="Monthly selections"
                          description="Only products allowed by the selected customer's Fulfillment Profile are available."
                        />

                        <div
                          style={{
                            background:
                              selectedCount > 0
                                ? COLORS.sageSoft
                                : COLORS.cream,

                            border:
                              `1px solid ${
                                selectedCount > 0
                                  ? COLORS.sageSoftStrong
                                  : COLORS.creamStrong
                              }`,

                            borderRadius:
                              "999px",

                            padding:
                              "7px 12px",

                            color:
                              selectedCount > 0
                                ? COLORS.sageDark
                                : COLORS.warmText,

                            fontWeight: 700,
                            fontSize: "12px",

                            whiteSpace:
                              "nowrap",
                          }}
                        >
                          {selectedCount} selected
                        </div>
                      </InlineStack>

                      {selectedSubscriber &&
                      !selectedSubscriber
                        .fulfillmentProfile ? (
                        <Banner
                          title="Fulfillment Profile required"
                          tone="warning"
                        >
                          <p>
                            This subscriber needs a
                            Fulfillment Profile before
                            products can be selected.
                          </p>
                        </Banner>
                      ) : null}

                      {selectedSubscriber &&
                      selectedSubscriber
                        .fulfillmentProfile &&
                      productOptions.length === 1 ? (
                        <Banner
                          title="No eligible products"
                          tone="warning"
                        >
                          <p>
                            Add eligible products and
                            sizes to{" "}
                            {
                              selectedSubscriber
                                .fulfillmentProfile
                                .name
                            }{" "}
                            before using Quick Submit.
                          </p>
                        </Banner>
                      ) : null}

                      <InlineGrid
                        columns={{
                          xs: 1,
                          md: 2,
                        }}
                        gap="400"
                      >
                        <MonthlySelectionCard
                          title="January – June"
                          selections={
                            firstHalf
                          }
                          productOptions={
                            productOptions
                          }
                          onChange={
                            updateSelection
                          }
                          disabled={
                            !selectedSubscriber ||
                            !selectedSubscriber
                              .fulfillmentProfile ||
                            productOptions.length ===
                              1
                          }
                        />

                        <MonthlySelectionCard
                          title="July – December"
                          selections={
                            secondHalf
                          }
                          productOptions={
                            productOptions
                          }
                          onChange={
                            updateSelection
                          }
                          disabled={
                            !selectedSubscriber ||
                            !selectedSubscriber
                              .fulfillmentProfile ||
                            productOptions.length ===
                              1
                          }
                        />
                      </InlineGrid>
                    </BlockStack>
                  </div>

                  {/* ==================================================
                      SAVE AREA
                      ================================================== */}

                  <div
                    style={{
                      background:
                        COLORS.sageDeep,

                      borderRadius:
                        "18px",

                      padding:
                        "22px 24px",

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
                            fontSize:
                              "10px",

                            fontWeight:
                              700,

                            letterSpacing:
                              "0.11em",

                            textTransform:
                              "uppercase",

                            color:
                              "rgba(255,255,255,0.62)",

                            marginBottom:
                              "6px",
                          }}
                        >
                          Step 3
                        </div>

                        <div
                          style={{
                            fontSize:
                              "18px",

                            fontWeight:
                              650,

                            color:
                              "#FFFFFF",

                            marginBottom:
                              "4px",
                          }}
                        >
                          Save customer selections
                        </div>

                        <div
                          style={{
                            fontSize:
                              "12px",

                            color:
                              "rgba(255,255,255,0.65)",
                          }}
                        >
                          {selectedCount === 0
                            ? "Choose at least one month before saving."
                            : `${selectedCount} month${
                                selectedCount === 1
                                  ? ""
                                  : "s"
                              } ready to save.`}
                        </div>
                      </div>

                      <InlineStack
                        align="end"
                        gap="300"
                        wrap
                      >
                        <Button
                          submit
                          loading={
                            isSubmitting &&
                            intent ===
                              "clear"
                          }
                          onClick={
                            clearForm
                          }
                        >
                          Clear form
                        </Button>

                        <Button
                          submit
                          variant="primary"
                          loading={
                            isSubmitting &&
                            intent ===
                              "save"
                          }
                          disabled={
                            !selectedSubscriberId ||
                            selectedCount === 0
                          }
                          onClick={() =>
                            setIntent(
                              "save",
                            )
                          }
                        >
                          Save selections
                        </Button>
                      </InlineStack>
                    </InlineStack>
                  </div>
                </BlockStack>
              </Layout.Section>
            </Layout>

            <div style={{ height: "20px" }} />
          </BlockStack>
        </Form>
      </Page>
    </div>
  );
}

/* ============================================================
   MONTHLY SELECTION CARD
   ============================================================ */

function MonthlySelectionCard({
  title,
  selections,
  productOptions,
  onChange,
  disabled,
}: {
  title: string;

  selections:
    MonthlySelection[];

  productOptions: {
    label: string;
    value: string;
  }[];

  onChange: (
    month: string,
    product: string,
  ) => void;

  disabled: boolean;
}) {
  return (
    <div
      style={{
        background:
          COLORS.page,

        border:
          `1px solid ${COLORS.border}`,

        borderRadius:
          "15px",

        padding:
          "18px",
      }}
    >
      <BlockStack gap="300">
        <div
          style={{
            fontSize: "11px",
            fontWeight: 700,

            letterSpacing:
              "0.08em",

            textTransform:
              "uppercase",

            color:
              COLORS.sageDark,

            paddingBottom:
              "2px",
          }}
        >
          {title}
        </div>

        {selections.map(
          (selection) => (
            <div
              key={
                selection.month
              }
              style={{
                background:
                  selection.product
                    ? COLORS.sageSoft
                    : COLORS.white,

                border:
                  `1px solid ${
                    selection.product
                      ? COLORS.sageSoftStrong
                      : COLORS.border
                  }`,

                borderRadius:
                  "12px",

                padding:
                  "10px 11px",

                transition:
                  "background 150ms ease, border-color 150ms ease",
              }}
            >
              <InlineStack
                align="space-between"
                gap="300"
                blockAlign="center"
                wrap={false}
              >
                <div
                  style={{
                    width: "95px",
                    flexShrink: 0,
                  }}
                >
                  <Text
                    as="p"
                    fontWeight="medium"
                  >
                    {
                      selection.month
                    }
                  </Text>
                </div>

                <div
                  style={{
                    flex: 1,
                  }}
                >
                  <Select
                    label={`${selection.month} product`}
                    labelHidden

                    value={
                      selection.product
                    }

                    onChange={(
                      value,
                    ) =>
                      onChange(
                        selection.month,
                        value,
                      )
                    }

                    options={
                      productOptions
                    }

                    disabled={
                      disabled
                    }
                  />
                </div>
              </InlineStack>
            </div>
          ),
        )}
      </BlockStack>
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

          letterSpacing:
            "0.11em",

          textTransform:
            "uppercase",

          color:
            COLORS.sage,

          marginBottom:
            "6px",
        }}
      >
        {eyebrow}
      </div>

      <div
        style={{
          fontSize: "20px",

          fontWeight: 650,

          letterSpacing:
            "-0.015em",

          color:
            COLORS.text,

          marginBottom:
            "5px",
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: "13px",
          lineHeight: 1.5,

          color:
            COLORS.muted,

          maxWidth: "680px",
        }}
      >
        {description}
      </div>
    </div>
  );
}

/* ============================================================
   INFO ITEM
   ============================================================ */

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: "10px",

          fontWeight: 700,

          letterSpacing:
            "0.07em",

          textTransform:
            "uppercase",

          color:
            COLORS.muted,

          marginBottom:
            "5px",
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: "13px",

          fontWeight: 600,

          lineHeight: 1.4,

          color:
            COLORS.text,
        }}
      >
        {value}
      </div>
    </div>
  );
}

/* ============================================================
   EMPTY PROMPT
   ============================================================ */

function EmptyPrompt({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background:
          COLORS.cream,

        border:
          `1px solid ${COLORS.creamStrong}`,

        borderRadius:
          "13px",

        padding:
          "18px",

        color:
          COLORS.warmText,

        fontSize:
          "13px",
      }}
    >
      {children}
    </div>
  );
}

/* ============================================================
   DATE
   ============================================================ */

function formatDate(
  date:
    | string
    | Date
    | null,
) {
  if (!date) {
    return "Not set";
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month:
        "short",

      day:
        "numeric",

      year:
        "numeric",
    },
  ).format(
    new Date(date),
  );
}