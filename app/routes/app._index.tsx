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

import { COLORS } from "../styles/theme";

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
    actionNeeded,
    activeFulfillmentProfiles,
    recentActivity,
  ] = await Promise.all([
    db.subscriber.count({
      where: {
        subscriptionStatus: "Active",
      },
    }),

    db.subscriber.count({
      where: {
        subscriptionStatus: "Active",
        workflowStatus: "Waiting for Selection",
      },
    }),

    db.shipment.count({
      where: {
        status: "Pending",
      },
    }),

    db.subscriber.count({
      where: {
        workflowStatus: "Needs Review",
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
    actionNeeded,
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
    actionNeeded,
    activeFulfillmentProfiles,
    recentActivity,
  } = useLoaderData<typeof loader>();

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
              borderRadius: "18px",
              border: `1px solid ${COLORS.border}`,
              minHeight: "100px",
              background: `
                linear-gradient(
                  105deg,
                  #FCFBF7 0%,
                  #F7F6F1 58%,
                  ${COLORS.primarySoftStrong} 100%
                )
              `,
              boxShadow:
                "0 1px 2px rgba(32,34,31,0.03), 0 10px 24px rgba(32,34,31,0.05)",
            }}
          >
            <div
              style={{
                position: "absolute",
                width: "260px",
                height: "260px",
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(67,86,109,0.16) 0%, rgba(67,86,109,0.05) 45%, transparent 72%)",
                top: "-150px",
                right: "-50px",
                pointerEvents: "none",
              }}
            />

            <div
              style={{
                position: "relative",
                zIndex: 2,
                padding: "20px 26px",
              }}
            >
              <div
                style={{
                  fontSize: "10px",
                  lineHeight: 1,
                  fontWeight: 750,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: COLORS.primaryDark,
                  marginBottom: "8px",
                }}
              >
                SubscriptionSync
              </div>

              <div
                style={{
                  fontSize: "25px",
                  fontWeight: 680,
                  letterSpacing: "-0.035em",
                  lineHeight: 1.1,
                  color: COLORS.text,
                  marginBottom: "6px",
                }}
              >
                Personalized subscriptions,{" "}
                <span style={{ color: COLORS.primaryDark }}>simplified.</span>
              </div>

              <div
                style={{
                  fontSize: "13px",
                  lineHeight: 1.45,
                  color: COLORS.textSoft,
                  maxWidth: "760px",
                }}
              >
                A clear place to monitor subscription activity, review exceptions,
                and manage the parts of the customer experience your team can change.
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
              label="Action needed"
              value={actionNeeded}
              description={
                actionNeeded === 0
                  ? "All clear — no team action is needed"
                  : "Exceptions that require someone on the team to step in"
              }
              url="/app/daily-queue?filter=action-needed"
              actionCard
              emphasis={actionNeeded > 0}
            />

            <MetricCard
              label="Selections in progress"
              value={pendingSelections}
              description="Customers moving through the normal selection workflow"
              url="/app/daily-queue?filter=selections-in-progress"
            />

            <MetricCard
              label="Ready for shipping"
              value={pendingShipments}
              description="Pending fulfillment records for the shipping team"
              url="/app/daily-queue?filter=shipments-pending"
            />

            <MetricCard
              label="Active subscribers"
              value={activeSubscribers}
              description="Currently active subscriptions"
              url="/app/subscriber-list"
            />
          </div>

          {/* ======================================================
              HOW TO USE THIS DASHBOARD
              ====================================================== */}

          <div
            style={{
              background: COLORS.white,
              border: `1px solid ${COLORS.border}`,
              borderRadius: "16px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "18px 22px",
                borderBottom: `1px solid ${COLORS.border}`,
                background: COLORS.primarySoft,
              }}
            >
              <div
                style={{
                  fontSize: "15px",
                  fontWeight: 700,
                  color: COLORS.text,
                  marginBottom: "5px",
                }}
              >
                Most of SubscriptionSync is automatic
              </div>

              <div
                style={{
                  fontSize: "13px",
                  lineHeight: 1.55,
                  color: COLORS.textSoft,
                  maxWidth: "900px",
                }}
              >
                This dashboard is mainly here so you can see what SubscriptionSync
                is doing. Routine selection timing, reminders, and fulfillment
                workflow are designed to move forward automatically. You do not need
                an employee clicking through normal subscriptions every day.
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "0",
              }}
            >
              <div
                style={{
                  padding: "20px 22px",
                  borderRight: `1px solid ${COLORS.border}`,
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 750,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: COLORS.primaryDark,
                    marginBottom: "10px",
                  }}
                >
                  View & monitor
                </div>

                <div
                  style={{
                    fontSize: "13px",
                    lineHeight: 1.65,
                    color: COLORS.textSoft,
                  }}
                >
                  View subscriber status, selections, upcoming shipments, activity,
                  and the progress of automated workflow. If everything is moving
                  normally, there is nothing your team needs to do.
                </div>
              </div>

              <div
                style={{
                  padding: "20px 22px",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 750,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: COLORS.primaryDark,
                    marginBottom: "10px",
                  }}
                >
                  Things your team can manage
                </div>

                <div
                  style={{
                    fontSize: "13px",
                    lineHeight: 1.65,
                    color: COLORS.textSoft,
                  }}
                >
                  Open a customer when a manual change is needed, review or edit
                  customer communications, edit the customer selection form, manage
                  fulfillment profiles and rules, and change application settings.
                  These are intentional management tools — not daily steps required
                  for every subscriber.
                </div>
              </div>
            </div>

            <div
              style={{
                padding: "14px 22px",
                background: actionNeeded > 0 ? COLORS.dangerSoft : "#FBFCFD",
                borderTop: `1px solid ${
                  actionNeeded > 0 ? COLORS.dangerBorder : COLORS.border
                }`,
              }}
            >
              <InlineStack
                align="space-between"
                blockAlign="center"
                gap="300"
                wrap
              >
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 650,
                    color:
                      actionNeeded > 0 ? COLORS.dangerText : COLORS.textSoft,
                  }}
                >
                  {actionNeeded > 0
                    ? `⚠ ${actionNeeded} exception${
                        actionNeeded === 1 ? "" : "s"
                      } need team attention.`
                    : "✓ Action Needed is clear. SubscriptionSync is handling the normal workflow."}
                </div>

                <Link
                  to="/app/daily-queue?filter=action-needed"
                  style={{
                    textDecoration: "none",
                    color:
                      actionNeeded > 0 ? COLORS.dangerText : COLORS.primaryDark,
                    fontSize: "12px",
                    fontWeight: 750,
                  }}
                >
                  {actionNeeded > 0 ? "REVIEW ACTION NEEDED →" : "VIEW ACTION NEEDED →"}
                </Link>
              </InlineStack>
            </div>
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
                  color: COLORS.primaryDark,
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
                        background: COLORS.primarySoft,
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
                                    COLORS.primarySoft,
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
   METRIC CARD
   ============================================================ */

function MetricCard({
  label,
  value,
  description,
  url,
  emphasis = false,
  actionCard = false,
}: {
  label: string;
  value: number;
  description: string;
  url: string;
  emphasis?: boolean;
  actionCard?: boolean;
}) {
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
          background: actionCard
            ? emphasis
              ? COLORS.dangerSoft
              : "#FFF8F8"
            : COLORS.white,
          border: `2px solid ${
            actionCard
              ? emphasis
                ? "#C94A4A"
                : COLORS.dangerBorder
              : COLORS.border
          }`,
          borderRadius: "16px",
          padding: "20px",
          minHeight: "142px",
          height: "100%",
          cursor: "pointer",
          boxShadow: actionCard
            ? emphasis
              ? "0 8px 22px rgba(139,66,66,0.12)"
              : "0 4px 12px rgba(139,66,66,0.06)"
            : "0 1px 2px rgba(32,34,31,0.02)",
          transition:
            "transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease",
        }}
        onMouseEnter={(event) => {
          event.currentTarget.style.transform = "translateY(-2px)";
          event.currentTarget.style.boxShadow = actionCard
            ? emphasis
              ? "0 12px 28px rgba(139,66,66,0.18)"
              : "0 9px 22px rgba(139,66,66,0.10)"
            : "0 8px 20px rgba(32,34,31,0.08)";
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.transform = "translateY(0)";
          event.currentTarget.style.boxShadow = actionCard
            ? emphasis
              ? "0 8px 22px rgba(139,66,66,0.12)"
              : "0 4px 12px rgba(139,66,66,0.06)"
            : "0 1px 2px rgba(32,34,31,0.02)";
        }}
      >
        <div
          style={{
            fontSize: "11px",
            fontWeight: 750,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: actionCard ? COLORS.dangerText : COLORS.muted,
            marginBottom: "12px",
          }}
        >
          {actionCard ? (emphasis ? "⚠ " : "✓ ") : ""}
          {label}
        </div>

        <div
          style={{
            fontSize: "34px",
            fontWeight: 700,
            letterSpacing: "-0.04em",
            lineHeight: 1,
            color: actionCard ? COLORS.dangerText : COLORS.text,
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
            marginBottom: "12px",
          }}
        >
          {description}
        </div>

        <div
          style={{
            fontSize: "11px",
            fontWeight: 750,
            color: actionCard ? COLORS.dangerText : COLORS.primaryDark,
          }}
        >
          {actionCard ? (emphasis ? "REVIEW NOW →" : "VIEW DETAILS →") : "VIEW →"}
        </div>
      </div>
    </Link>
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
                  background: COLORS.primarySoft,
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
          color: COLORS.primary,
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