import { COLORS as HOME_COLORS } from "../styles/theme";
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

const LEGACY_COLORS = {
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

const COLORS = {
  ...LEGACY_COLORS,
  page: HOME_COLORS.page,
  text: HOME_COLORS.text,
  textSoft: HOME_COLORS.textSoft,
  border: HOME_COLORS.border,

  sage: HOME_COLORS.primaryDark,
  sageDark: HOME_COLORS.primaryDark,
  sageDeep: HOME_COLORS.primaryDark,
  sageSoft: HOME_COLORS.primarySoftStrong,
  sageSoftStrong: HOME_COLORS.primarySoftStrong,
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
        subtitle="Find subscribers and review their dress-selection workflow."
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

              
              
              {/* Navigation */}
              <style>{`
                .ss-subscribers-nav {
                  display: flex;
                  flex-wrap: wrap;
                  align-items: center;
                  gap: 10px;
                  margin-bottom: 2px;
                }

                .ss-subscribers-nav-link {
                  display: inline-flex;
                  align-items: center;
                  justify-content: center;
                  padding: 9px 14px;
                  border-radius: 10px;
                  background: ${HOME_COLORS.white};
                  color: ${HOME_COLORS.primaryDark};
                  border: 1px solid ${HOME_COLORS.border};
                  text-decoration: none;
                  font-size: 13px;
                  font-weight: 650;
                  transition:
                    background .15s ease,
                    border-color .15s ease,
                    box-shadow .15s ease;
                }

                .ss-subscribers-nav-link:hover,
                .ss-subscribers-nav-link:focus-visible {
                  background: ${HOME_COLORS.primarySoftStrong};
                  border-color: ${HOME_COLORS.primaryDark};
                  box-shadow: 0 2px 7px rgba(32,34,31,.08);
                  outline-offset: 2px;
                }

                .ss-subscribers-nav-link--active {
                  background: ${HOME_COLORS.primarySoftStrong};
                  border-color: ${HOME_COLORS.primaryDark};
                }
              `}</style>

              <nav
                className="ss-subscribers-nav"
                aria-label="SubscriptionSync navigation"
              >
                <Link
                  className="ss-subscribers-nav-link"
                  to="/app"
                >
                  Home →
                </Link>

                <Link
                  className="ss-subscribers-nav-link ss-subscribers-nav-link--active"
                  to="/app/subscriber-list"
                  aria-current="page"
                >
                  Subscribers →
                </Link>

                <Link
                  className="ss-subscribers-nav-link"
                  to="/app/activity-log"
                >
                  Activity →
                </Link>

                <Link
                  className="ss-subscribers-nav-link"
                  to="/app/settings"
                >
                  Settings →
                </Link>
              </nav>

              {/* ==================================================
                  SEARCH + FILTERS
                  ================================================== */}

              <div
                style={{
                  background: `linear-gradient(105deg, #FCFBF7 0%, #F7F6F1 58%, ${HOME_COLORS.primarySoftStrong} 100%)`,

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
                      description="Search by subscriber, email, or fulfillment profile, then narrow by status."
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
                    eyebrow="Subscribers"
                    title="Subscriber management"
                    description="Open a subscriber to review their full subscription and fulfillment history."
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
                          "Subscriber",
                      },

                      {
                        title:
                          "Fulfillment Profile",
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
                                      color: COLORS.sageDark,
                                      textDecoration: "underline",
                                      textUnderlineOffset: "3px",
                                      fontWeight: 700,
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
                                variant="secondary"
                                url={`/app/subscriber-view/${subscriber.id}`}
                              >
                                View subscriber
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