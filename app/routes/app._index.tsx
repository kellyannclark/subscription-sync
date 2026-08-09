import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import type { ReactNode } from "react";

import {
  Page,
  Text,
  Card,
  BlockStack,
  InlineStack,
  Box,
  Badge,
  Icon,
  Divider,
} from "@shopify/polaris";

import {
  CalendarIcon,
  PersonIcon,
  ClipboardIcon,
  ProductIcon,
  SettingsIcon,
  PlusIcon,
  ListBulletedIcon,
  ClockIcon,
} from "@shopify/polaris-icons";

import { TitleBar } from "@shopify/app-bridge-react";

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
  sageSoft: "#EEF1ED",
  sageSoftStrong: "#E4EAE3",

  // Neutral borders
  border: "#E4E5DF",
  borderStrong: "#D7DAD2",

  // Status colors
  warm: "#F6F1E8",
  warmText: "#755F38",

  dangerSoft: "#F9EEEE",
  dangerText: "#8B4242",
};

/* ============================================================
   LOADER
   ============================================================ */

export const loader = async ({
  request,
}: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  const [
    activeSubscribers,
    pendingSelections,
    pendingShipments,
    activeFulfillmentProfiles,
    recentActivity,
  ] = await Promise.all([
    db.subscriber.count({
      where: {
        subscriptionStatus: "Active",
      },
    }),

    db.selection.count({
      where: {
        status: "Pending",
      },
    }),

    db.shipment.count({
      where: {
        status: "Pending",
      },
    }),

    db.fulfillmentProfile.count({
      where: {
        isActive: true,
      },
    }),

    db.activityLog.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    }),
  ]);

  return json({
    activeSubscribers,
    pendingSelections,
    pendingShipments,
    activeFulfillmentProfiles,
    recentActivity,
  });
};

/* ============================================================
   DASHBOARD LINKS
   ============================================================ */

type DashboardLink = {
  title: string;
  description: string;
  url: string;
  icon: any;
};

const operations: DashboardLink[] = [
  {
    title: "Daily Queue",
    description:
      "See what needs attention today across selections, deadlines, and fulfillment.",
    url: "/app/daily-queue",
    icon: CalendarIcon,
  },
  {
    title: "Quick Submit",
    description:
      "Record a customer selection manually when a little extra help is needed.",
    url: "/app/quick-submit",
    icon: ClipboardIcon,
  },
  {
    title: "Activity Log",
    description:
      "Review automation events, system activity, and administrative actions.",
    url: "/app/activity-log",
    icon: ClockIcon,
  },
];

const subscriberTools: DashboardLink[] = [
  {
    title: "Subscribers",
    description:
      "View subscription status, selections, fulfillment profiles, and upcoming activity.",
    url: "/app/subscriber-list",
    icon: PersonIcon,
  },
  {
    title: "Customer Selection Form",
    description:
      "Preview the experience customers use to personalize their upcoming shipment.",
    url: "/app/preferences-form",
    icon: ClipboardIcon,
  },
];

const setupTools: DashboardLink[] = [
  {
    title: "Fulfillment Profiles",
    description:
      "Manage the rules connecting subscription plans to selections and fulfillment.",
    url: "/app/tiers",
    icon: ProductIcon,
  },
  {
    title: "Create Fulfillment Profile",
    description:
      "Build a new subscription workflow with products, timing, reminders, and inventory rules.",
    url: "/app/tiers/new",
    icon: PlusIcon,
  },
  {
    title: "Settings",
    description:
      "Manage automation, Shopify tags, order behavior, and application settings.",
    url: "/app/settings",
    icon: SettingsIcon,
  },
];

/* ============================================================
   DASHBOARD
   ============================================================ */

export default function Dashboard() {
  const {
    activeSubscribers,
    pendingSelections,
    pendingShipments,
    activeFulfillmentProfiles,
    recentActivity,
  } = useLoaderData<typeof loader>();

  const totalNeedsAttention =
    pendingSelections + pendingShipments;

  return (
    <div
      style={{
        background: COLORS.page,
        minHeight: "100vh",
      }}
    >
      <Page>
        <TitleBar title="SubscriptionSync" />

        <BlockStack gap="800">
          {/* ======================================================
              INTRO / HERO
              ====================================================== */}

          <div
            style={{
              position: "relative",
              overflow: "hidden",
              borderRadius: "22px",
              border: `1px solid ${COLORS.border}`,
              minHeight: "290px",
              background: `
                linear-gradient(
                  105deg,
                  #FCFBF7 0%,
                  #F7F6F1 48%,
                  #DCE4DA 72%,
                  #AEBEAF 100%
                )
              `,
              boxShadow: `
                0 1px 2px rgba(32, 34, 31, 0.03),
                0 16px 36px rgba(32, 34, 31, 0.07)
              `,
            }}
          >
            {/* Large soft sage glow */}
            <div
              style={{
                position: "absolute",
                width: "430px",
                height: "430px",
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(77,94,81,0.22) 0%, rgba(77,94,81,0.08) 42%, transparent 70%)",
                top: "-150px",
                right: "-80px",
                pointerEvents: "none",
              }}
            />

            {/* Large curved shape bottom left */}
            <div
              style={{
                position: "absolute",
                width: "620px",
                height: "250px",
                borderRadius: "50%",
                background:
                  "linear-gradient(135deg, rgba(77,94,81,0.95), rgba(104,122,108,0.85))",
                bottom: "-185px",
                left: "-120px",
                transform: "rotate(6deg)",
                pointerEvents: "none",
              }}
            />

            {/* Secondary soft curve */}
            <div
              style={{
                position: "absolute",
                width: "520px",
                height: "200px",
                borderRadius: "50%",
                background: "rgba(238,241,237,0.78)",
                bottom: "-155px",
                left: "80px",
                transform: "rotate(3deg)",
                pointerEvents: "none",
              }}
            />

            {/* Fine circular lines on right */}
            <div
              style={{
                position: "absolute",
                width: "310px",
                height: "310px",
                borderRadius: "50%",
                border:
                  "1px solid rgba(255,255,255,0.30)",
                top: "-40px",
                right: "35px",
                pointerEvents: "none",
              }}
            />

            <div
              style={{
                position: "absolute",
                width: "220px",
                height: "220px",
                borderRadius: "50%",
                border:
                  "1px solid rgba(255,255,255,0.22)",
                top: "5px",
                right: "80px",
                pointerEvents: "none",
              }}
            />

            {/* Main content */}
            <div
              style={{
                position: "relative",
                zIndex: 2,
                padding: "42px 42px 46px",
              }}
            >
              <InlineStack
                align="space-between"
                blockAlign="center"
                gap="600"
                wrap
              >
                {/* LEFT SIDE */}

                <div
                  style={{
                    maxWidth: "660px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "12px",
                      lineHeight: 1,
                      fontWeight: 700,
                      letterSpacing: "0.13em",
                      textTransform: "uppercase",
                      color: COLORS.sageDark,
                      marginBottom: "18px",
                    }}
                  >
                    SubscriptionSync
                  </div>

                  <div
                    style={{
                      fontSize: "36px",
                      fontWeight: 650,
                      letterSpacing: "-0.04em",
                      lineHeight: 1.08,
                      color: COLORS.text,
                      marginBottom: "16px",
                      maxWidth: "580px",
                    }}
                  >
                    Personalized subscriptions,
                    <br />

                    <span
                      style={{
                        color: COLORS.sageDark,
                      }}
                    >
                      simplified.
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: "15px",
                      lineHeight: 1.65,
                      color: COLORS.textSoft,
                      maxWidth: "580px",
                    }}
                  >
                    Customer preferences, subscription details,
                    and fulfillment rules working together in one
                    clear operational workflow.
                  </div>
                </div>

                {/* RIGHT SIDE */}

                <div
                  style={{
                    minWidth: "240px",
                    maxWidth: "280px",
                    background:
                      "rgba(255,255,255,0.72)",
                    backdropFilter: "blur(10px)",
                    border:
                      "1px solid rgba(255,255,255,0.60)",
                    borderRadius: "18px",
                    padding: "20px",
                    boxShadow:
                      "0 10px 30px rgba(32,34,31,0.08)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      letterSpacing: "0.10em",
                      textTransform: "uppercase",
                      color: COLORS.sageDark,
                      marginBottom: "12px",
                    }}
                  >
                    Subscription Flow
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gap: "10px",
                    }}
                  >
                    <FlowItem
                      label="Customer"
                      detail="Subscription active"
                    />

                    <FlowConnector />

                    <FlowItem
                      label="Preferences"
                      detail="Selection captured"
                    />

                    <FlowConnector />

                    <FlowItem
                      label="Fulfillment"
                      detail="Ready to process"
                      active
                    />
                  </div>
                </div>
              </InlineStack>

              {/* Sandbox badge */}

              <div
                style={{
                  position: "absolute",
                  top: "18px",
                  right: "18px",
                  background:
                    "rgba(255,255,255,0.80)",
                  backdropFilter: "blur(8px)",
                  border:
                    "1px solid rgba(77,94,81,0.16)",
                  borderRadius: "999px",
                  padding: "8px 12px",
                  boxShadow:
                    "0 4px 12px rgba(32,34,31,0.04)",
                }}
              >
                <InlineStack
                  gap="200"
                  blockAlign="center"
                  wrap={false}
                >
                  <div
                    style={{
                      width: "7px",
                      height: "7px",
                      borderRadius: "999px",
                      background: COLORS.sageDark,
                    }}
                  />

                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 650,
                      color: COLORS.sageDark,
                    }}
                  >
                    Development Sandbox
                  </span>
                </InlineStack>
              </div>
            </div>
          </div>

          {/* ======================================================
              TODAY
              ====================================================== */}

          <SectionHeader
            eyebrow="Overview"
            title="Today"
            description="A simple view of what is happening across subscriptions and fulfillment."
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(205px, 1fr))",
              gap: "14px",
            }}
          >
            <MetricCard
              label="Needs attention"
              value={totalNeedsAttention}
              description="Open selections and shipments"
              emphasis
            />

            <MetricCard
              label="Selections waiting"
              value={pendingSelections}
              description="Customer selections still pending"
            />

            <MetricCard
              label="Shipments pending"
              value={pendingShipments}
              description="Fulfillment records awaiting processing"
            />

            <MetricCard
              label="Active subscribers"
              value={activeSubscribers}
              description="Currently active subscriptions"
            />
          </div>

          {/* ======================================================
              OPERATIONAL SUMMARY
              ====================================================== */}

          <div
            style={{
              background: COLORS.sageSoft,
              border: `1px solid ${COLORS.sageSoftStrong}`,
              borderRadius: "16px",
              padding: "20px 22px",
            }}
          >
            <InlineStack
              align="space-between"
              blockAlign="center"
              gap="400"
              wrap
            >
              <InlineStack
                gap="300"
                blockAlign="center"
                wrap={false}
              >
                <div
                  style={{
                    width: "38px",
                    height: "38px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: COLORS.white,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: "11px",
                    flexShrink: 0,
                  }}
                >
                  <Icon
                    source={ListBulletedIcon}
                    tone="base"
                  />
                </div>

                <div>
                  <div
                    style={{
                      fontSize: "14px",
                      color: COLORS.text,
                      fontWeight: 650,
                      marginBottom: "3px",
                    }}
                  >
                    {totalNeedsAttention === 0
                      ? "Everything is caught up"
                      : `${totalNeedsAttention} item${
                          totalNeedsAttention === 1
                            ? ""
                            : "s"
                        } need attention`}
                  </div>

                  <div
                    style={{
                      fontSize: "13px",
                      color: COLORS.muted,
                    }}
                  >
                    SubscriptionSync is organizing the work
                    between customer choice and fulfillment.
                  </div>
                </div>
              </InlineStack>

              <Link
                to="/app/daily-queue"
                style={{
                  textDecoration: "none",
                  color: COLORS.sageDark,
                  fontSize: "13px",
                  fontWeight: 650,
                }}
              >
                View Daily Queue →
              </Link>
            </InlineStack>
          </div>

          <Divider />

          {/* ======================================================
              DAILY OPERATIONS
              ====================================================== */}

          <NavigationSection
            eyebrow="Workflow"
            title="Daily operations"
            description="Handle the work happening between a customer's subscription and their next shipment."
            items={operations}
          />

          <Divider />

          {/* ======================================================
              CUSTOMERS
              ====================================================== */}

          <NavigationSection
            eyebrow="Customers"
            title="Personalization"
            description="Understand each subscriber and manage the choices that personalize their shipment."
            items={subscriberTools}
          />

          <Divider />

          {/* ======================================================
              SETUP
              ====================================================== */}

          <NavigationSection
            eyebrow="System"
            title="Rules & automation"
            description="Define how SubscriptionSync turns subscription information into fulfillment instructions."
            items={setupTools}
          />

          {/* ======================================================
              PROFILE COUNT
              ====================================================== */}

          <div
            style={{
              padding: "18px 20px",
              background: COLORS.white,
              border: `1px solid ${COLORS.border}`,
              borderRadius: "14px",
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
                    fontSize: "13px",
                    fontWeight: 600,
                    color: COLORS.text,
                    marginBottom: "3px",
                  }}
                >
                  Fulfillment engine
                </div>

                <div
                  style={{
                    fontSize: "13px",
                    color: COLORS.muted,
                  }}
                >
                  {activeFulfillmentProfiles} active fulfillment{" "}
                  {activeFulfillmentProfiles === 1
                    ? "profile is"
                    : "profiles are"}{" "}
                  currently managing subscription rules.
                </div>
              </div>

              <Link
                to="/app/tiers"
                style={{
                  textDecoration: "none",
                  color: COLORS.sageDark,
                  fontSize: "13px",
                  fontWeight: 650,
                }}
              >
                Manage profiles →
              </Link>
            </InlineStack>
          </div>

          <Divider />

          {/* ======================================================
              RECENT ACTIVITY
              ====================================================== */}

          <BlockStack gap="400">
            <SectionHeader
              eyebrow="System"
              title="Recent activity"
              description="A record of the latest activity processed by SubscriptionSync."
            />

            <Card>
              {recentActivity.length === 0 ? (
                <Box padding="500">
                  <div
                    style={{
                      textAlign: "center",
                      padding: "16px 0",
                    }}
                  >
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        margin: "0 auto 14px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: COLORS.sageSoft,
                        borderRadius: "13px",
                      }}
                    >
                      <Icon
                        source={ClockIcon}
                        tone="base"
                      />
                    </div>

                    <Text
                      as="p"
                      variant="headingSm"
                    >
                      No activity yet
                    </Text>

                    <div
                      style={{
                        marginTop: "6px",
                        fontSize: "13px",
                        color: COLORS.muted,
                      }}
                    >
                      Activity will appear here as you begin
                      testing SubscriptionSync.
                    </div>
                  </div>
                </Box>
              ) : (
                <BlockStack gap="0">
                  {recentActivity.map(
                    (activity, index) => (
                      <div key={activity.id}>
                        <div
                          style={{
                            padding: "18px 20px",
                          }}
                        >
                          <InlineStack
                            align="space-between"
                            blockAlign="start"
                            gap="400"
                            wrap
                          >
                            <InlineStack
                              gap="300"
                              blockAlign="start"
                              wrap={false}
                            >
                              <div
                                style={{
                                  width: "36px",
                                  height: "36px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent:
                                    "center",
                                  background:
                                    COLORS.sageSoft,
                                  borderRadius: "10px",
                                  flexShrink: 0,
                                }}
                              >
                                <Icon
                                  source={
                                    ListBulletedIcon
                                  }
                                  tone="base"
                                />
                              </div>

                              <div>
                                <div
                                  style={{
                                    fontSize: "13px",
                                    fontWeight: 650,
                                    color: COLORS.text,
                                    marginBottom:
                                      "4px",
                                  }}
                                >
                                  {activity.eventType}
                                </div>

                                <div
                                  style={{
                                    fontSize: "13px",
                                    lineHeight: 1.5,
                                    color:
                                      COLORS.textSoft,
                                    marginBottom:
                                      "5px",
                                  }}
                                >
                                  {
                                    activity.description
                                  }
                                </div>

                                <div
                                  style={{
                                    fontSize: "11px",
                                    color:
                                      COLORS.muted,
                                  }}
                                >
                                  {new Date(
                                    activity.createdAt,
                                  ).toLocaleString()}
                                </div>
                              </div>
                            </InlineStack>

                            <Badge
                              tone={
                                activity.status ===
                                "Success"
                                  ? "success"
                                  : activity.status ===
                                      "Failed"
                                    ? "critical"
                                    : "attention"
                              }
                            >
                              {activity.status}
                            </Badge>
                          </InlineStack>
                        </div>

                        {index <
                          recentActivity.length -
                            1 && <Divider />}
                      </div>
                    ),
                  )}
                </BlockStack>
              )}
            </Card>
          </BlockStack>

          <div style={{ height: "24px" }} />
        </BlockStack>
      </Page>
    </div>
  );
}

/* ============================================================
   HERO FLOW ITEM
   ============================================================ */

function FlowItem({
  label,
  detail,
  active = false,
}: {
  label: string;
  detail: string;
  active?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",

        background: active
          ? COLORS.sageDark
          : "rgba(255,255,255,0.82)",

        border: `1px solid ${
          active
            ? COLORS.sageDark
            : "rgba(77,94,81,0.10)"
        }`,

        borderRadius: "12px",
        padding: "10px 12px",

        boxShadow: active
          ? "0 5px 14px rgba(47,60,51,0.14)"
          : "0 1px 3px rgba(32,34,31,0.025)",
      }}
    >
      <div
        style={{
          width: "9px",
          height: "9px",
          borderRadius: "999px",

          background: active
            ? "#FFFFFF"
            : COLORS.sage,

          boxShadow: active
            ? "0 0 0 4px rgba(255,255,255,0.10)"
            : "0 0 0 4px rgba(104,122,108,0.08)",

          flexShrink: 0,
        }}
      />

      <div>
        <div
          style={{
            fontSize: "12px",
            fontWeight: 650,

            color: active
              ? "#FFFFFF"
              : COLORS.text,
          }}
        >
          {label}
        </div>

        <div
          style={{
            fontSize: "10px",

            color: active
              ? "rgba(255,255,255,0.72)"
              : COLORS.muted,

            marginTop: "2px",
          }}
        >
          {detail}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   HERO FLOW CONNECTOR
   ============================================================ */

function FlowConnector() {
  return (
    <div
      style={{
        position: "relative",
        width: "1px",
        height: "12px",
        background: "rgba(77,94,81,0.28)",
        marginLeft: "16px",
      }}
    >
      <div
        style={{
          position: "absolute",
          bottom: "-2px",
          left: "-2px",
          width: "5px",
          height: "5px",
          borderRadius: "999px",
          background: COLORS.sage,
        }}
      />
    </div>
  );
}

/* ============================================================
   METRIC CARD
   ============================================================ */

function MetricCard({
  label,
  value,
  description,
  emphasis = false,
}: {
  label: string;
  value: number;
  description: string;
  emphasis?: boolean;
}) {
  return (
    <div
      style={{
        background: emphasis
          ? COLORS.sageSoft
          : COLORS.white,

        border: `1px solid ${
          emphasis
            ? COLORS.sageSoftStrong
            : COLORS.border
        }`,

        borderRadius: "16px",
        padding: "20px",
        minHeight: "132px",

        boxShadow:
          "0 1px 2px rgba(32, 34, 31, 0.02)",
      }}
    >
      <div
        style={{
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: emphasis
            ? COLORS.sageDark
            : COLORS.muted,
          marginBottom: "14px",
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: "32px",
          fontWeight: 650,
          letterSpacing: "-0.04em",
          lineHeight: 1,
          color: COLORS.text,
          marginBottom: "11px",
        }}
      >
        {value}
      </div>

      <div
        style={{
          fontSize: "12px",
          lineHeight: 1.45,
          color: COLORS.muted,
        }}
      >
        {description}
      </div>
    </div>
  );
}

/* ============================================================
   NAVIGATION CARD
   ============================================================ */

function NavigationCard({
  title,
  description,
  url,
  icon,
}: DashboardLink) {
  return (
    <Link
      to={url}
      style={{
        textDecoration: "none",
        color: "inherit",
        display: "block",
        height: "100%",
      }}
    >
      <div
        style={{
          height: "100%",
          background: COLORS.white,
          border: `1px solid ${COLORS.border}`,
          borderRadius: "16px",

          transition:
            "transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease",

          boxShadow:
            "0 1px 2px rgba(32, 34, 31, 0.02)",
        }}
        onMouseEnter={(event) => {
          event.currentTarget.style.transform =
            "translateY(-2px)";

          event.currentTarget.style.boxShadow =
            "0 7px 20px rgba(32, 34, 31, 0.06)";

          event.currentTarget.style.borderColor =
            COLORS.borderStrong;
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.transform =
            "translateY(0)";

          event.currentTarget.style.boxShadow =
            "0 1px 2px rgba(32, 34, 31, 0.02)";

          event.currentTarget.style.borderColor =
            COLORS.border;
        }}
      >
        <Box padding="500">
          <BlockStack gap="400">
            <InlineStack
              align="space-between"
              blockAlign="start"
              gap="300"
              wrap={false}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: COLORS.sageSoft,
                  borderRadius: "11px",
                }}
              >
                <Icon
                  source={icon}
                  tone="base"
                />
              </div>

              <div
                style={{
                  fontSize: "18px",
                  lineHeight: 1,
                  color: COLORS.muted,
                  paddingTop: "5px",
                }}
              >
                →
              </div>
            </InlineStack>

            <div>
              <div
                style={{
                  fontSize: "15px",
                  fontWeight: 650,
                  color: COLORS.text,
                  marginBottom: "7px",
                }}
              >
                {title}
              </div>

              <div
                style={{
                  fontSize: "13px",
                  lineHeight: 1.55,
                  color: COLORS.muted,
                }}
              >
                {description}
              </div>
            </div>
          </BlockStack>
        </Box>
      </div>
    </Link>
  );
}

/* ============================================================
   NAVIGATION SECTION
   ============================================================ */

function NavigationSection({
  eyebrow,
  title,
  description,
  items,
}: {
  eyebrow: string;
  title: string;
  description: string;
  items: DashboardLink[];
}) {
  return (
    <BlockStack gap="400">
      <SectionHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(245px, 1fr))",
          gap: "14px",
        }}
      >
        {items.map((item) => (
          <NavigationCard
            key={item.title}
            {...item}
          />
        ))}
      </div>
    </BlockStack>
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
  title: ReactNode;
  description: ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: "10px",
          fontWeight: 700,
          letterSpacing: "0.11em",
          textTransform: "uppercase",
          color: COLORS.sage,
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
          color: COLORS.text,
          marginBottom: "5px",
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: "13px",
          lineHeight: 1.5,
          color: COLORS.muted,
          maxWidth: "700px",
        }}
      >
        {description}
      </div>
    </div>
  );
}