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
  Card,
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
          COLORS.pageBackground,

        minHeight:
          "100vh",
      }}
    >
      <Page
        title="Subscribers"
        subtitle="Monitor Appstle subscription status, fulfillment profiles, monthly selections, and upcoming fulfillment activity."
        backAction={{
          content:
            "Dashboard",

          url:
            "/app",
        }}
      >
        <Layout>
          <Layout.Section>
            <BlockStack gap="500">

              {/* ==================================================
                  BLUE HERO
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
                  blockAlign="center"
                  gap="400"
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
                      Subscriber Management
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
                          "720px",
                      }}
                    >
                      View Appstle subscriptions,
                      fulfillment profiles,
                      selection progress,
                      upcoming orders, and
                      fulfillment workflow from
                      one place.
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
                        color:
                          COLORS.white,

                        fontSize:
                          "13px",

                        fontWeight:
                          700,
                      }}
                    >
                      ● Development Sandbox
                    </span>
                  </div>
                </InlineStack>
              </div>

              {/* ==================================================
                  SUBSCRIPTION SNAPSHOT
                  ================================================== */}

              <BlockStack gap="300">
                <BlockStack gap="100">
                  <SectionHeading>
                    Subscription Snapshot
                  </SectionHeading>

                  <Text
                    as="p"
                    variant="bodyMd"
                    tone="subdued"
                  >
                    A quick look at the
                    current subscriber and
                    fulfillment workload.
                  </Text>
                </BlockStack>

                <div
                  style={{
                    display:
                      "grid",

                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(180px, 1fr))",

                    gap:
                      "16px",
                  }}
                >
                  <SubscriberMetric
                    label="Total Subscribers"
                    value={
                      stats.total
                    }
                  />

                  <SubscriberMetric
                    label="Active Subscribers"
                    value={
                      stats.active
                    }
                  />

                  <SubscriberMetric
                    label="Waiting for Selection"
                    value={
                      stats.waitingForSelection
                    }
                  />

                  <SubscriberMetric
                    label="Ready for Fulfillment"
                    value={
                      stats.readyForFulfillment
                    }
                  />

                  <SubscriberMetric
                    label="Fulfilled"
                    value={
                      stats.fulfilled
                    }
                  />

                  <SubscriberMetric
                    label="Needs Attention"
                    value={
                      stats.needsAttention
                    }
                  />
                </div>
              </BlockStack>

              {/* ==================================================
                  SEARCH + FILTERS
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
                        Find Subscribers
                      </SectionHeading>

                      <Text
                        as="p"
                        variant="bodySm"
                        tone="subdued"
                      >
                        Search by customer,
                        email, or Fulfillment
                        Profile, then narrow
                        the results by
                        subscription or
                        workflow status.
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
              </Card>

              {/* ==================================================
                  SUBSCRIBER TABLE
                  ================================================== */}

              <Card padding="0">

                {filteredSubscribers.length ===
                0 ? (
                  <div
                    style={{
                      padding:
                        "36px",

                      textAlign:
                        "center",
                    }}
                  >
                    <BlockStack gap="200">
                      <Text
                        as="p"
                        variant="headingMd"
                      >
                        No subscribers found
                      </Text>

                      <Text
                        as="p"
                        variant="bodyMd"
                        tone="subdued"
                      >
                        Try changing your
                        search or filters.
                      </Text>
                    </BlockStack>
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

                            {/* CUSTOMER */}

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

                            {/* FULFILLMENT PROFILE */}

                            <IndexTable.Cell>
                              {profileName ? (
                                <div
                                  style={{
                                    display:
                                      "inline-block",

                                    background:
                                      COLORS.softBlueStrong,

                                    border:
                                      `1px solid ${COLORS.borderBlue}`,

                                    color:
                                      COLORS.numberBlue,

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

                            {/* NEXT ORDER */}

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

                            {/* SELECTION DEADLINE */}

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

                            {/* APPSTLE SUBSCRIPTION */}

                            <IndexTable.Cell>
                              <SubscriptionStatusBadge
                                status={
                                  subscriber
                                    .subscriptionStatus as SubscriptionStatus
                                }
                              />
                            </IndexTable.Cell>

                            {/* SUBSCRIPTIONSYNC WORKFLOW */}

                            <IndexTable.Cell>
                              <WorkflowStatusBadge
                                status={
                                  subscriber
                                    .workflowStatus as WorkflowStatus
                                }
                              />
                            </IndexTable.Cell>

                            {/* ACTION */}

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
              </Card>

            </BlockStack>
          </Layout.Section>
        </Layout>
      </Page>
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
   SUBSCRIBER METRIC
   ============================================================ */

function SubscriberMetric({
  label,
  value,
}: {
  label: string;
  value: number;
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

        minHeight:
          "100px",

        boxShadow:
          "0 2px 8px rgba(41, 74, 120, 0.04)",
      }}
    >
      <BlockStack gap="150">
        <Text
          as="p"
          variant="bodySm"
          tone="subdued"
        >
          {label}
        </Text>

        <div
          style={{
            fontSize:
              "28px",

            lineHeight:
              1,

            fontWeight:
              750,

            color:
              COLORS.numberBlue,
          }}
        >
          {value}
        </div>
      </BlockStack>
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
          COLORS.softBlueStrong,

        border:
          `1px solid ${COLORS.borderBlue}`,

        color:
          COLORS.numberBlue,

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