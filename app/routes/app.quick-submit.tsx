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
  Box,
  Button,
  Card,
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
   SUBSCRIPTIONSYNC BRAND COLORS
   ============================================================ */

const COLORS = {
  navy: "#17233E",
  blue: "#294A78",
  tealBlue: "#2F7C89",

  pageBackground: "#F5F7FB",

  white: "#FFFFFF",

  softBlue: "#F4F8FC",
  softBlueStrong: "#EAF1F8",

  border: "#D9E2EC",
  borderBlue: "#C6D5E5",

  text: "#1F2937",
  muted: "#667085",

  numberBlue: "#244B78",
  accentBlue: "#356A9A",
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
  } =
    useLoaderData<typeof loader>();

  const actionData =
    useActionData<typeof action>();

  const navigation =
    useNavigation();

  const isSubmitting =
    navigation.state ===
    "submitting";

  const [
    intent,
    setIntent,
  ] = useState(
    "save",
  );

  const [
    selectedSubscriberId,
    setSelectedSubscriberId,
  ] = useState(
    subscribers[0]?.id ??
      "",
  );

  const [
    monthlySelections,
    setMonthlySelections,
  ] =
    useState<
      MonthlySelection[]
    >(selections);

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

  /*
   * Products now come from the selected
   * subscriber's Fulfillment Profile.
   *
   * That means Princess Twirl customers only
   * see products configured for Princess Twirl.
   */
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

      /*
       * Clear previous product choices because
       * a different Fulfillment Profile may have
       * different eligible products.
       */
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
      setIntent(
        "clear",
      );

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

  return (
    <div
      style={{
        background:
          COLORS.pageBackground,

        minHeight:
          "100vh",
      }}
    >
      <Page
        title="Quick Submit"
        subtitle="Manually record or adjust a customer's monthly selection when needed."
        backAction={{
          content:
            "Dashboard",

          url:
            "/app",
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

          <BlockStack gap="500">

            {/* ==================================================
                RESULT
                ================================================== */}

            {actionData?.message && (
              <Banner
                title={
                  actionData.success
                    ? "Success"
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
                background:
                  `linear-gradient(
                    135deg,
                    ${COLORS.navy} 0%,
                    ${COLORS.blue} 62%,
                    ${COLORS.tealBlue} 100%
                  )`,

                borderRadius:
                  "18px",

                padding:
                  "30px",

                boxShadow:
                  "0 8px 26px rgba(23, 35, 62, 0.14)",

                color:
                  COLORS.white,
              }}
            >
              <InlineStack
                align="space-between"
                gap="400"
                blockAlign="center"
                wrap
              >
                <div>
                  <div
                    style={{
                      fontSize:
                        "12px",

                      fontWeight:
                        700,

                      letterSpacing:
                        "0.08em",

                      textTransform:
                        "uppercase",

                      color:
                        "#BFE8ED",

                      marginBottom:
                        "8px",
                    }}
                  >
                    SubscriptionSync
                  </div>

                  <div
                    style={{
                      fontSize:
                        "27px",

                      fontWeight:
                        700,

                      lineHeight:
                        1.2,

                      marginBottom:
                        "8px",
                    }}
                  >
                    Quick Submit
                  </div>

                  <div
                    style={{
                      fontSize:
                        "14px",

                      lineHeight:
                        1.5,

                      color:
                        "#E8EEF7",

                      maxWidth:
                        "690px",
                    }}
                  >
                    Record a customer’s
                    requested monthly
                    selections using the
                    products configured
                    for their Fulfillment
                    Profile.
                  </div>
                </div>

                <div
                  style={{
                    background:
                      "rgba(255,255,255,0.12)",

                    border:
                      "1px solid rgba(255,255,255,0.20)",

                    borderRadius:
                      "999px",

                    padding:
                      "9px 15px",
                  }}
                >
                  <span
                    style={{
                      fontSize:
                        "13px",

                      fontWeight:
                        700,

                      color:
                        COLORS.white,
                    }}
                  >
                    ● Sandbox Mode
                  </span>
                </div>
              </InlineStack>
            </div>

            <Layout>
              <Layout.Section>
                <BlockStack gap="500">

                  {/* ==================================================
                      CUSTOMER
                      ================================================== */}

                  <Card>
                    <BlockStack gap="400">
                      <BlockStack gap="100">
                        <SectionHeading>
                          Customer
                        </SectionHeading>

                        <Text
                          as="p"
                          tone="subdued"
                        >
                          Choose the
                          subscriber whose
                          selection you need
                          to enter or adjust.
                        </Text>
                      </BlockStack>

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

                            value:
                              "",
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
                              COLORS.softBlue,

                            border:
                              `1px solid ${COLORS.borderBlue}`,

                            borderRadius:
                              "12px",

                            padding:
                              "18px",
                          }}
                        >
                          <InlineGrid
                            columns={{
                              xs: 1,
                              md: 2,
                            }}
                            gap="300"
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
                                  .length ??
                                  0,
                              )}
                            />
                          </InlineGrid>
                        </div>
                      ) : (
                        <Text
                          as="p"
                          tone="subdued"
                        >
                          Choose a subscriber
                          to begin.
                        </Text>
                      )}
                    </BlockStack>
                  </Card>

                  {/* ==================================================
                      MONTHLY SELECTIONS
                      ================================================== */}

                  <Card>
                    <BlockStack gap="400">
                      <InlineStack
                        align="space-between"
                        blockAlign="center"
                        gap="300"
                        wrap
                      >
                        <BlockStack gap="100">
                          <SectionHeading>
                            Monthly Selections
                          </SectionHeading>

                          <Text
                            as="p"
                            tone="subdued"
                          >
                            Only products
                            eligible for the
                            selected customer's
                            Fulfillment Profile
                            are available.
                          </Text>
                        </BlockStack>

                        <div
                          style={{
                            background:
                              COLORS.softBlueStrong,

                            border:
                              `1px solid ${COLORS.borderBlue}`,

                            borderRadius:
                              "999px",

                            padding:
                              "7px 12px",

                            color:
                              COLORS.numberBlue,

                            fontWeight:
                              700,

                            fontSize:
                              "13px",
                          }}
                        >
                          {
                            selectedCount
                          }{" "}
                          selected
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
                            This subscriber
                            needs a Fulfillment
                            Profile before
                            products can be
                            selected.
                          </p>
                        </Banner>
                      ) : null}

                      {selectedSubscriber &&
                      selectedSubscriber
                        .fulfillmentProfile &&
                      productOptions.length ===
                        1 ? (
                        <Banner
                          title="No eligible products"
                          tone="warning"
                        >
                          <p>
                            Add eligible
                            products and sizes
                            to{" "}
                            {
                              selectedSubscriber
                                .fulfillmentProfile
                                .name
                            }{" "}
                            before using Quick
                            Submit.
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
                  </Card>

                  {/* ==================================================
                      ACTIONS
                      ================================================== */}

                  <InlineStack
                    align="end"
                    gap="300"
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
                      Clear Form
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
                        selectedCount ===
                          0
                      }
                      onClick={() =>
                        setIntent(
                          "save",
                        )
                      }
                    >
                      Save Selections
                    </Button>
                  </InlineStack>
                </BlockStack>
              </Layout.Section>
            </Layout>
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
  selections,
  productOptions,
  onChange,
  disabled,
}: {
  selections:
    MonthlySelection[];

  productOptions:
    {
      label: string;
      value: string;
    }[];

  onChange:
    (
      month: string,
      product: string,
    ) => void;

  disabled: boolean;
}) {
  return (
    <div
      style={{
        background:
          COLORS.softBlue,

        border:
          `1px solid ${COLORS.borderBlue}`,

        borderRadius:
          "14px",

        padding:
          "18px",
      }}
    >
      <BlockStack gap="300">
        {selections.map(
          (selection) => (
            <InlineStack
              key={
                selection.month
              }
              align="space-between"
              gap="300"
              blockAlign="center"
              wrap={false}
            >
              <div
                style={{
                  width:
                    "105px",

                  flexShrink:
                    0,
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
          ),
        )}
      </BlockStack>
    </div>
  );
}

/* ============================================================
   SECTION HEADING
   ============================================================ */

function SectionHeading({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <InlineStack
      gap="200"
      blockAlign="center"
    >
      <div
        style={{
          width:
            "4px",

          height:
            "22px",

          borderRadius:
            "999px",

          background:
            COLORS.tealBlue,

          flexShrink:
            0,
        }}
      />

      <Text
        as="h2"
        variant="headingLg"
      >
        {children}
      </Text>
    </InlineStack>
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
    <BlockStack gap="050">
      <Text
        as="p"
        variant="bodySm"
        tone="subdued"
      >
        {label}
      </Text>

      <Text
        as="p"
        variant="bodyMd"
        fontWeight="medium"
      >
        {value}
      </Text>
    </BlockStack>
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