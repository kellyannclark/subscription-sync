import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";

import {
  Link,
  useLoaderData,
} from "@remix-run/react";

import {
  useMemo,
  useState,
} from "react";

import {
  Badge,
  BlockStack,
  Button,
  IndexTable,
  InlineStack,
  Layout,
  Page,
  Select,
  Text,
  TextField,
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

  // Sage
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

  // Status surfaces
  attentionSoft: "#F7F0E2",
  attentionBorder: "#E9D6AE",
  successSoft: "#EDF3ED",
  successBorder: "#CDDCCF",
  criticalSoft: "#F8EDEC",
  criticalBorder: "#E8C7C4",
};

/* ============================================================
   TYPES
   ============================================================ */

type SubscriptionStatus =
  | "Active"
  | "Paused"
  | "Cancelled"
  | "Reactivated";

type WorkflowStatus =
  | "Waiting for Selection"
  | "Selection Submitted"
  | "Auto Selected"
  | "Ready for Fulfillment"
  | "Fulfilled"
  | "Needs Review";

/* ============================================================
   LOADER
   ============================================================ */

export const loader = async ({
  request,
}: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  /*
   * Subscribers now use only the Fulfillment Profile
   * architecture.
   *
   * The legacy Tier relationship is intentionally
   * not loaded on this page anymore.
   */
  const [
    subscribers,
    fulfillmentProfiles,
  ] = await Promise.all([
    db.subscriber.findMany({
      orderBy: {
        updatedAt: "desc",
      },

      include: {
        fulfillmentProfile: true,
      },
    }),

    db.fulfillmentProfile.findMany({
      where: {
        isActive: true,
      },

      orderBy: {
        name: "asc",
      },
    }),
  ]);

  return json({
    subscribers,
    fulfillmentProfiles,
  });
};

/* ============================================================
   PAGE
   ============================================================ */

export default function SubscriberListPage() {
  const {
    subscribers,
    fulfillmentProfiles,
  } =
    useLoaderData<typeof loader>();

  /* ==========================================================
     FILTER STATE
     ========================================================== */

  const [
    searchValue,
    setSearchValue,
  ] = useState("");

  const [
    profileFilter,
    setProfileFilter,
  ] = useState("all");

  const [
    subscriptionStatusFilter,
    setSubscriptionStatusFilter,
  ] = useState("all");

  const [
    workflowStatusFilter,
    setWorkflowStatusFilter,
  ] = useState("all");

  /* ==========================================================
     FILTER SUBSCRIBERS
     ========================================================== */

  const filteredSubscribers =
    useMemo(() => {
      return subscribers.filter(
        (subscriber) => {
          const search =
            searchValue
              .trim()
              .toLowerCase();

          const profileName =
            subscriber
              .fulfillmentProfile
              ?.name ?? "";

          const matchesSearch =
            search === "" ||
            subscriber.name
              .toLowerCase()
              .includes(search) ||
            subscriber.email
              .toLowerCase()
              .includes(search) ||
            profileName
              .toLowerCase()
              .includes(search);

          const matchesProfile =
            profileFilter === "all" ||
            profileName ===
              profileFilter;

          const matchesSubscriptionStatus =
            subscriptionStatusFilter ===
              "all" ||
            subscriber.subscriptionStatus ===
              subscriptionStatusFilter;

          const matchesWorkflowStatus =
            workflowStatusFilter ===
              "all" ||
            subscriber.workflowStatus ===
              workflowStatusFilter;

          return (
            matchesSearch &&
            matchesProfile &&
            matchesSubscriptionStatus &&
            matchesWorkflowStatus
          );
        },
      );
    }, [
      subscribers,
      searchValue,
      profileFilter,
      subscriptionStatusFilter,
      workflowStatusFilter,
    ]);

  /* ==========================================================
     SNAPSHOT
     ========================================================== */

  const stats =
    useMemo(() => {
      return {
        total:
          subscribers.length,

        active:
          subscribers.filter(
            (subscriber) =>
              subscriber.subscriptionStatus ===
              "Active",
          ).length,

        waitingForSelection:
          subscribers.filter(
            (subscriber) =>
              subscriber.workflowStatus ===
              "Waiting for Selection",
          ).length,

        readyForFulfillment:
          subscribers.filter(
            (subscriber) =>
              subscriber.workflowStatus ===
                "Selection Submitted" ||
              subscriber.workflowStatus ===
                "Auto Selected" ||
              subscriber.workflowStatus ===
                "Ready for Fulfillment",
          ).length,

        needsAttention:
          subscribers.filter(
            (subscriber) =>
              subscriber.workflowStatus ===
                "Needs Review" ||
              subscriber.subscriptionStatus !==
                "Active",
          ).length,

        fulfilled:
          subscribers.filter(
            (subscriber) =>
              subscriber.workflowStatus ===
              "Fulfilled",
          ).length,
      };
    }, [
      subscribers,
    ]);

  /* ==========================================================
     FILTER OPTIONS
     ========================================================== */

  const profileOptions = [
    {
      label:
        "All fulfillment profiles",

      value:
        "all",
    },

    ...fulfillmentProfiles.map(
      (profile) => ({
        label:
          profile.name,

        value:
          profile.name,
      }),
    ),
  ];

  const subscriptionStatusOptions = [
    {
      label:
        "All subscription statuses",

      value:
        "all",
    },

    {
      label:
        "Active",

      value:
        "Active",
    },

    {
      label:
        "Paused",

      value:
        "Paused",
    },

    {
      label:
        "Cancelled",

      value:
        "Cancelled",
    },

    {
      label:
        "Reactivated",

      value:
        "Reactivated",
    },
  ];

  const workflowStatusOptions = [
    {
      label:
        "All workflow statuses",

      value:
        "all",
    },

    {
      label:
        "Waiting for Selection",

      value:
        "Waiting for Selection",
    },

    {
      label:
        "Selection Submitted",

      value:
        "Selection Submitted",
    },

    {
      label:
        "Auto Selected",

      value:
        "Auto Selected",
    },

    {
      label:
        "Ready for Fulfillment",

      value:
        "Ready for Fulfillment",
    },

    {
      label:
        "Fulfilled",

      value:
        "Fulfilled",
    },

    {
      label:
        "Needs Review",

      value:
        "Needs Review",
    },
  ];

  return (
    <div
      style={{
        background:
          COLORS.page,

        minHeight:
          "100vh",
      }}
    >
      <Page
        title="Subscribers"
        subtitle="Monitor subscription status, personalization progress, and upcoming fulfillment activity."
        backAction={{
          content:
            "Dashboard",

          url:
            "/app",
        }}
      >
        <Layout>
          <Layout.Section>
            <BlockStack gap="600">

              {/* ==================================================
                  HERO
                  ================================================== */}

              <div
                style={{
                  position:
                    "relative",

                  overflow:
                    "hidden",

                  border:
                    `1px solid ${COLORS.border}`,

                  borderRadius:
                    "20px",

                  minHeight:
                    "220px",

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
                    position:
                      "absolute",

                    width:
                      "390px",

                    height:
                      "390px",

                    borderRadius:
                      "50%",

                    background:
                      "radial-gradient(circle, rgba(57,72,61,0.22) 0%, rgba(57,72,61,0.07) 45%, transparent 70%)",

                    right:
                      "-85px",

                    top:
                      "-180px",

                    pointerEvents:
                      "none",
                  }}
                />

                <div
                  style={{
                    position:
                      "absolute",

                    width:
                      "560px",

                    height:
                      "170px",

                    borderRadius:
                      "50%",

                    background:
                      "linear-gradient(135deg, rgba(57,72,61,0.94), rgba(104,122,108,0.74))",

                    right:
                      "-160px",

                    bottom:
                      "-125px",

                    transform:
                      "rotate(-5deg)",

                    pointerEvents:
                      "none",
                  }}
                />

                <div
                  style={{
                    position:
                      "absolute",

                    width:
                      "245px",

                    height:
                      "245px",

                    borderRadius:
                      "50%",

                    border:
                      "1px solid rgba(255,255,255,0.28)",

                    right:
                      "38px",

                    top:
                      "-28px",

                    pointerEvents:
                      "none",
                  }}
                />

                <div
                  style={{
                    position:
                      "relative",

                    zIndex:
                      2,

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
                        maxWidth:
                          "650px",
                      }}
                    >
                      <div
                        style={{
                          fontSize:
                            "11px",

                          fontWeight:
                            700,

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
                        Customer operations
                      </div>

                      <div
                        style={{
                          fontSize:
                            "30px",

                          lineHeight:
                            1.12,

                          fontWeight:
                            650,

                          letterSpacing:
                            "-0.035em",

                          color:
                            COLORS.text,

                          marginBottom:
                            "11px",
                        }}
                      >
                        Every subscriber,
                        <br />

                        <span
                          style={{
                            color:
                              COLORS.sageDark,
                          }}
                        >
                          one clear workflow.
                        </span>
                      </div>

                      <div
                        style={{
                          maxWidth:
                            "580px",

                          fontSize:
                            "14px",

                          lineHeight:
                            1.6,

                          color:
                            COLORS.textSoft,
                        }}
                      >
                        Review each customer’s
                        subscription, fulfillment
                        profile, selection status,
                        and next operational date
                        from one place.
                      </div>
                    </div>

                    <div
                      style={{
                        minWidth:
                          "225px",

                        padding:
                          "18px 20px",

                        borderRadius:
                          "16px",

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
                          fontSize:
                            "10px",

                          fontWeight:
                            700,

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
                        Subscriber base
                      </div>

                      <div
                        style={{
                          fontSize:
                            "30px",

                          lineHeight:
                            1,

                          fontWeight:
                            650,

                          letterSpacing:
                            "-0.04em",

                          color:
                            COLORS.text,

                          marginBottom:
                            "8px",
                        }}
                      >
                        {
                          stats.total
                        }
                      </div>

                      <div
                        style={{
                          fontSize:
                            "12px",

                          lineHeight:
                            1.45,

                          color:
                            COLORS.muted,
                        }}
                      >
                        total subscriber
                        {stats.total === 1
                          ? ""
                          : "s"}
                      </div>

                      <div
                        style={{
                          height:
                            "1px",

                          background:
                            "rgba(77,94,81,0.12)",

                          margin:
                            "13px 0",
                        }}
                      />

                      <div
                        style={{
                          fontSize:
                            "11px",

                          color:
                            stats.needsAttention > 0
                              ? COLORS.warmText
                              : COLORS.sageDark,
                        }}
                      >
                        {
                          stats.needsAttention
                        }{" "}
                        need
                        {stats.needsAttention === 1
                          ? "s"
                          : ""}{" "}
                        attention
                      </div>
                    </div>
                  </InlineStack>
                </div>

                <div
                  style={{
                    position:
                      "absolute",

                    top:
                      "15px",

                    right:
                      "15px",

                    background:
                      "rgba(255,255,255,0.76)",

                    border:
                      "1px solid rgba(77,94,81,0.16)",

                    borderRadius:
                      "999px",

                    padding:
                      "7px 11px",

                    backdropFilter:
                      "blur(7px)",
                  }}
                >
                  <span
                    style={{
                      fontSize:
                        "11px",

                      fontWeight:
                        650,

                      color:
                        COLORS.sageDark,
                    }}
                  >
                    ● Development sandbox
                  </span>
                </div>
              </div>

              {/* ==================================================
                  SNAPSHOT
                  ================================================== */}

              <div>
                <SectionHeader
                  eyebrow="Overview"
                  title="Subscription snapshot"
                  description="A quick view of the current subscriber and fulfillment workload."
                />

                <div
                  style={{
                    display:
                      "grid",

                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(165px, 1fr))",

                    gap:
                      "12px",

                    marginTop:
                      "16px",
                  }}
                >
                  <SubscriberMetric
                    label="Total"
                    value={
                      stats.total
                    }
                  />

                  <SubscriberMetric
                    label="Active"
                    value={
                      stats.active
                    }
                    tone="success"
                  />

                  <SubscriberMetric
                    label="Waiting"
                    value={
                      stats.waitingForSelection
                    }
                  />

                  <SubscriberMetric
                    label="Ready"
                    value={
                      stats.readyForFulfillment
                    }
                    tone="success"
                  />

                  <SubscriberMetric
                    label="Fulfilled"
                    value={
                      stats.fulfilled
                    }
                    tone="success"
                  />

                  <SubscriberMetric
                    label="Needs attention"
                    value={
                      stats.needsAttention
                    }
                    tone="attention"
                  />
                </div>
              </div>

              {/* ==================================================
                  SEARCH + FILTERS
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
                    "22px 24px",

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
                      eyebrow="Search"
                      title="Find subscribers"
                      description="Search by customer, email, or fulfillment profile, then narrow by status."
                    />

                    <div
                      style={{
                        background:
                          COLORS.sageSoft,

                        border:
                          `1px solid ${COLORS.sageSoftStrong}`,

                        borderRadius:
                          "999px",

                        padding:
                          "7px 12px",

                        color:
                          COLORS.sageDark,

                        fontWeight:
                          700,

                        fontSize:
                          "12px",

                        whiteSpace:
                          "nowrap",
                      }}
                    >
                      Showing{" "}
                      {
                        filteredSubscribers.length
                      }{" "}
                      of{" "}
                      {
                        subscribers.length
                      }
                    </div>
                  </InlineStack>

                  <InlineStack
                    gap="300"
                    wrap
                  >
                    <div
                      style={{
                        minWidth:
                          "260px",

                        flex:
                          "1 1 320px",
                      }}
                    >
                      <TextField
                        label="Search subscribers"
                        labelHidden

                        value={
                          searchValue
                        }

                        onChange={
                          setSearchValue
                        }

                        placeholder="Search name, email, or fulfillment profile..."

                        autoComplete="off"

                        clearButton

                        onClearButtonClick={() =>
                          setSearchValue(
                            "",
                          )
                        }
                      />
                    </div>

                    <div
                      style={{
                        minWidth:
                          "210px",

                        flex:
                          "0 1 240px",
                      }}
                    >
                      <Select
                        label="Fulfillment profile filter"
                        labelHidden

                        value={
                          profileFilter
                        }

                        onChange={
                          setProfileFilter
                        }

                        options={
                          profileOptions
                        }
                      />
                    </div>

                    <div
                      style={{
                        minWidth:
                          "210px",

                        flex:
                          "0 1 240px",
                      }}
                    >
                      <Select
                        label="Subscription status filter"
                        labelHidden

                        value={
                          subscriptionStatusFilter
                        }

                        onChange={
                          setSubscriptionStatusFilter
                        }

                        options={
                          subscriptionStatusOptions
                        }
                      />
                    </div>

                    <div
                      style={{
                        minWidth:
                          "210px",

                        flex:
                          "0 1 250px",
                      }}
                    >
                      <Select
                        label="Workflow status filter"
                        labelHidden

                        value={
                          workflowStatusFilter
                        }

                        onChange={
                          setWorkflowStatusFilter
                        }

                        options={
                          workflowStatusOptions
                        }
                      />
                    </div>
                  </InlineStack>
                </BlockStack>
              </div>

              {/* ==================================================
                  SUBSCRIBER TABLE
                  ================================================== */}

              <div
                style={{
                  background:
                    COLORS.white,

                  border:
                    `1px solid ${COLORS.border}`,

                  borderRadius:
                    "18px",

                  overflow:
                    "hidden",

                  boxShadow:
                    "0 2px 8px rgba(32,34,31,0.025)",
                }}
              >
                <div
                  style={{
                    padding:
                      "20px 22px",

                    borderBottom:
                      `1px solid ${COLORS.border}`,
                  }}
                >
                  <SectionHeader
                    eyebrow="Customers"
                    title="Subscriber management"
                    description="Open a customer to review their full subscription and fulfillment history."
                  />
                </div>

                {filteredSubscribers.length ===
                0 ? (
                  <div
                    style={{
                      padding:
                        "42px 28px",

                      textAlign:
                        "center",

                      background:
                        COLORS.page,
                    }}
                  >
                    <div
                      style={{
                        fontSize:
                          "16px",

                        fontWeight:
                          650,

                        color:
                          COLORS.text,

                        marginBottom:
                          "6px",
                      }}
                    >
                      No subscribers found
                    </div>

                    <div
                      style={{
                        fontSize:
                          "13px",

                        lineHeight:
                          1.5,

                        color:
                          COLORS.muted,
                      }}
                    >
                      Try changing your search
                      or filters.
                    </div>
                  </div>
                ) : (
                  <IndexTable
                    resourceName={{
                      singular:
                        "subscriber",

                      plural:
                        "subscribers",
                    }}

                    itemCount={
                      filteredSubscribers.length
                    }

                    selectable={
                      false
                    }

                    headings={[
                      {
                        title:
                          "Customer",
                      },

                      {
                        title:
                          "Fulfillment Profile",
                      },

                      {
                        title:
                          "Next Order",
                      },

                      {
                        title:
                          "Selection Deadline",
                      },

                      {
                        title:
                          "Subscription",
                      },

                      {
                        title:
                          "Workflow",
                      },

                      {
                        title:
                          "",
                      },
                    ]}
                  >
                    {filteredSubscribers.map(
                      (
                        subscriber,
                        index,
                      ) => {
                        const profileName =
                          subscriber
                            .fulfillmentProfile
                            ?.name ??
                          null;

                        const nextOperationalDate =
                          subscriber
                            .nextOrderDate ??
                          subscriber
                            .nextShipDate;

                        return (
                          <IndexTable.Row
                            id={
                              subscriber.id
                            }

                            key={
                              subscriber.id
                            }

                            position={
                              index
                            }
                          >
                            <IndexTable.Cell>
                              <InlineStack
                                gap="300"
                                blockAlign="center"
                                wrap={false}
                              >
                                <CustomerAvatar
                                  name={
                                    subscriber.name
                                  }
                                />

                                <BlockStack gap="050">
                                  <Link
                                    to={`/app/subscriber-view/${subscriber.id}`}
                                    style={{
                                      color:
                                        "inherit",

                                      textDecoration:
                                        "none",
                                    }}
                                  >
                                    <Text
                                      as="span"
                                      fontWeight="semibold"
                                    >
                                      {
                                        subscriber.name
                                      }
                                    </Text>
                                  </Link>

                                  <Text
                                    as="span"
                                    variant="bodySm"
                                    tone="subdued"
                                  >
                                    {
                                      subscriber.email
                                    }
                                  </Text>
                                </BlockStack>
                              </InlineStack>
                            </IndexTable.Cell>

                            <IndexTable.Cell>
                              {profileName ? (
                                <div
                                  style={{
                                    display:
                                      "inline-block",

                                    background:
                                      COLORS.sageSoft,

                                    border:
                                      `1px solid ${COLORS.sageSoftStrong}`,

                                    color:
                                      COLORS.sageDark,

                                    borderRadius:
                                      "999px",

                                    padding:
                                      "5px 10px",

                                    fontWeight:
                                      600,

                                    fontSize:
                                      "12px",
                                  }}
                                >
                                  {
                                    profileName
                                  }
                                </div>
                              ) : (
                                <Text
                                  as="span"
                                  variant="bodySm"
                                  tone="subdued"
                                >
                                  No Profile
                                </Text>
                              )}
                            </IndexTable.Cell>

                            <IndexTable.Cell>
                              <BlockStack gap="050">
                                <Text
                                  as="span"
                                >
                                  {formatDate(
                                    nextOperationalDate,
                                  )}
                                </Text>

                                <Text
                                  as="span"
                                  variant="bodySm"
                                  tone="subdued"
                                >
                                  {getRelativeDate(
                                    nextOperationalDate,
                                  )}
                                </Text>
                              </BlockStack>
                            </IndexTable.Cell>

                            <IndexTable.Cell>
                              <BlockStack gap="050">
                                <Text
                                  as="span"
                                >
                                  {formatDate(
                                    subscriber
                                      .nextSelectionDeadline,
                                  )}
                                </Text>

                                <Text
                                  as="span"
                                  variant="bodySm"
                                  tone="subdued"
                                >
                                  {getRelativeDate(
                                    subscriber
                                      .nextSelectionDeadline,
                                  )}
                                </Text>
                              </BlockStack>
                            </IndexTable.Cell>

                            <IndexTable.Cell>
                              <SubscriptionStatusBadge
                                status={
                                  subscriber
                                    .subscriptionStatus as SubscriptionStatus
                                }
                              />
                            </IndexTable.Cell>

                            <IndexTable.Cell>
                              <WorkflowStatusBadge
                                status={
                                  subscriber
                                    .workflowStatus as WorkflowStatus
                                }
                              />
                            </IndexTable.Cell>

                            <IndexTable.Cell>
                              <Button
                                variant="plain"
                                url={`/app/subscriber-view/${subscriber.id}`}
                              >
                                View
                              </Button>
                            </IndexTable.Cell>
                          </IndexTable.Row>
                        );
                      },
                    )}
                  </IndexTable>
                )}
              </div>

              <div style={{ height: "20px" }} />
            </BlockStack>
          </Layout.Section>
        </Layout>
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
          fontSize:
            "10px",

          fontWeight:
            700,

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
          fontSize:
            "20px",

          fontWeight:
            650,

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
          fontSize:
            "13px",

          lineHeight:
            1.5,

          color:
            COLORS.muted,

          maxWidth:
            "700px",
        }}
      >
        {description}
      </div>
    </div>
  );
}

/* ============================================================
   SUBSCRIBER METRIC
   ============================================================ */

function SubscriberMetric({
  label,
  value,
  tone =
    "neutral",
}: {
  label: string;
  value: number;
  tone?:
    | "neutral"
    | "success"
    | "attention";
}) {
  const palette = {
    neutral: {
      background:
        COLORS.white,

      border:
        COLORS.border,

      label:
        COLORS.muted,
    },

    success: {
      background:
        COLORS.successSoft,

      border:
        COLORS.successBorder,

      label:
        COLORS.sageDark,
    },

    attention: {
      background:
        COLORS.attentionSoft,

      border:
        COLORS.attentionBorder,

      label:
        COLORS.warmText,
    },
  }[tone];

  return (
    <div
      style={{
        background:
          palette.background,

        border:
          `1px solid ${palette.border}`,

        borderRadius:
          "15px",

        padding:
          "18px 19px",

        minHeight:
          "108px",

        boxShadow:
          "0 1px 2px rgba(32,34,31,0.02)",
      }}
    >
      <div
        style={{
          fontSize:
            "10px",

          fontWeight:
            700,

          letterSpacing:
            "0.07em",

          textTransform:
            "uppercase",

          color:
            palette.label,

          marginBottom:
            "13px",
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize:
            "30px",

          lineHeight:
            1,

          fontWeight:
            650,

          letterSpacing:
            "-0.04em",

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
   CUSTOMER AVATAR
   ============================================================ */

function CustomerAvatar({
  name,
}: {
  name: string;
}) {
  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map(
        (part) =>
          part.charAt(0),
      )
      .join("")
      .toUpperCase();

  return (
    <div
      style={{
        width:
          "36px",

        height:
          "36px",

        borderRadius:
          "50%",

        background:
          COLORS.sageSoft,

        border:
          `1px solid ${COLORS.sageSoftStrong}`,

        color:
          COLORS.sageDark,

        display:
          "flex",

        alignItems:
          "center",

        justifyContent:
          "center",

        fontSize:
          "12px",

        fontWeight:
          700,

        flexShrink:
          0,
      }}
    >
      {initials || "—"}
    </div>
  );
}

/* ============================================================
   SUBSCRIPTION STATUS
   ============================================================ */

function SubscriptionStatusBadge({
  status,
}: {
  status:
    SubscriptionStatus;
}) {
  switch (status) {
    case "Active":
      return (
        <Badge tone="success">
          Active
        </Badge>
      );

    case "Paused":
      return (
        <Badge tone="attention">
          Paused
        </Badge>
      );

    case "Cancelled":
      return (
        <Badge tone="critical">
          Cancelled
        </Badge>
      );

    case "Reactivated":
      return (
        <Badge tone="info">
          Reactivated
        </Badge>
      );

    default:
      return (
        <Badge>
          {status}
        </Badge>
      );
  }
}

/* ============================================================
   WORKFLOW STATUS
   ============================================================ */

function WorkflowStatusBadge({
  status,
}: {
  status:
    WorkflowStatus;
}) {
  switch (status) {
    case "Waiting for Selection":
      return (
        <Badge tone="info">
          Waiting for Selection
        </Badge>
      );

    case "Selection Submitted":
      return (
        <Badge tone="success">
          Selection Submitted
        </Badge>
      );

    case "Auto Selected":
      return (
        <Badge tone="attention">
          Auto Selected
        </Badge>
      );

    case "Ready for Fulfillment":
      return (
        <Badge tone="success">
          Ready for Fulfillment
        </Badge>
      );

    case "Fulfilled":
      return (
        <Badge tone="success">
          Fulfilled
        </Badge>
      );

    case "Needs Review":
      return (
        <Badge tone="critical">
          Needs Review
        </Badge>
      );

    default:
      return (
        <Badge>
          {status}
        </Badge>
      );
  }
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

/* ============================================================
   RELATIVE DATE
   ============================================================ */

function getRelativeDate(
  date:
    | string
    | Date
    | null,
) {
  if (!date) {
    return "";
  }

  const target =
    new Date(date);

  const today =
    new Date();

  target.setHours(
    0,
    0,
    0,
    0,
  );

  today.setHours(
    0,
    0,
    0,
    0,
  );

  const difference =
    Math.round(
      (
        target.getTime() -
        today.getTime()
      ) /
        (
          1000 *
          60 *
          60 *
          24
        ),
    );

  if (
    difference === 0
  ) {
    return "Today";
  }

  if (
    difference === 1
  ) {
    return "Tomorrow";
  }

  if (
    difference === -1
  ) {
    return "Yesterday";
  }

  if (
    difference > 1
  ) {
    return `In ${difference} days`;
  }

  return `${Math.abs(
    difference,
  )} days ago`;
}