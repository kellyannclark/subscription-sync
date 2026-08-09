import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import type { ReactNode } from "react";

import {
  Page,
  Layout,
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
      "Review upcoming deadlines, customer selections, auto-select needs, and fulfillment activity.",

    url: "/app/daily-queue",

    icon: CalendarIcon,
  },

  {
    title: "Quick Submit",

    description:
      "Manually record a customer's monthly product selection when needed.",

    url: "/app/quick-submit",

    icon: ClipboardIcon,
  },

  {
    title: "Activity Log",

    description:
      "Review SubscriptionSync activity, automation events, and administrative actions.",

    url: "/app/activity-log",

    icon: ClockIcon,
  },
];

const subscriberTools: DashboardLink[] = [
  {
    title: "Subscribers",

    description:
      "View Appstle subscription status, fulfillment profile, selection status, and upcoming order activity.",

    url: "/app/subscriber-list",

    icon: PersonIcon,
  },

  {
    title: "Customer Selection Form",

    description:
      "Preview the form customers use to choose eligible monthly products and sizes.",

    url: "/app/preferences-form",

    icon: ClipboardIcon,
  },
];

const setupTools: DashboardLink[] = [
  {
    title: "Fulfillment Profiles",

    description:
      "Manage the operational rules that connect each Appstle subscription plan to monthly selection and fulfillment.",

    url: "/app/tiers",

    icon: ProductIcon,
  },

  {
    title: "Create Fulfillment Profile",

    description:
      "Configure a new profile with its Appstle plan, selection window, products, inventory rules, reminders, and email settings.",

    url: "/app/tiers/new",

    icon: PlusIcon,
  },

  {
    title: "Settings",

    description:
      "Manage global automation, order rules, Shopify tags, and application settings.",

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

  return (
    <div
      style={{
        background: COLORS.pageBackground,
        minHeight: "100vh",
      }}
    >
      <Page>
        <TitleBar title="SubscriptionSync" />

        <BlockStack gap="600">

          {/* ==================================================
              HERO
              ================================================== */}

          <Layout>
            <Layout.Section>
              <div
                style={{
                  background: `linear-gradient(
                    135deg,
                    ${COLORS.navy} 0%,
                    ${COLORS.blue} 62%,
                    ${COLORS.tealBlue} 100%
                  )`,

                  borderRadius: "18px",

                  padding: "32px",

                  boxShadow:
                    "0 8px 26px rgba(23, 35, 62, 0.14)",

                  color: COLORS.white,
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
                        fontSize: "12px",

                        fontWeight: 700,

                        letterSpacing: "0.08em",

                        textTransform: "uppercase",

                        color: "#BFE8ED",

                        marginBottom: "9px",
                      }}
                    >
                      SubscriptionSync
                    </div>

                    <div
                      style={{
                        fontSize: "29px",

                        fontWeight: 700,

                        lineHeight: 1.2,

                        marginBottom: "10px",
                      }}
                    >
                      Little Adventures Subscription Operations
                    </div>

                    <div
                      style={{
                        fontSize: "14px",

                        lineHeight: 1.55,

                        color: "#E8EEF7",

                        maxWidth: "720px",
                      }}
                    >
                      Manage monthly customer selections,
                      fulfillment profiles, and the workflow
                      between Appstle subscriptions and shipment
                      fulfillment.
                    </div>
                  </div>

                  <div
                    style={{
                      background:
                        "rgba(255,255,255,0.12)",

                      border:
                        "1px solid rgba(255,255,255,0.20)",

                      borderRadius: "999px",

                      padding: "9px 15px",
                    }}
                  >
                    <span
                      style={{
                        color: COLORS.white,

                        fontSize: "13px",

                        fontWeight: 700,
                      }}
                    >
                      ● Development Sandbox
                    </span>
                  </div>
                </InlineStack>
              </div>
            </Layout.Section>
          </Layout>

          {/* ==================================================
              CURRENT SNAPSHOT
              ================================================== */}

          <BlockStack gap="300">
            <BlockStack gap="100">
              <SectionHeading>
                Current Snapshot
              </SectionHeading>

              <Text
                as="p"
                variant="bodyMd"
                tone="subdued"
              >
                A quick look at the current selection and
                fulfillment workload.
              </Text>
            </BlockStack>

            <div
              style={{
                display: "grid",

                gridTemplateColumns:
                  "repeat(auto-fit, minmax(210px, 1fr))",

                gap: "16px",
              }}
            >
              <MetricCard
                label="Active Subscribers"
                value={activeSubscribers}
                description="Customers with an active Appstle subscription"
              />

              <MetricCard
                label="Pending Selections"
                value={pendingSelections}
                description="Monthly selections still waiting to be completed"
              />

              <MetricCard
                label="Pending Shipments"
                value={pendingShipments}
                description="Upcoming fulfillment records still awaiting processing"
              />

              <MetricCard
                label="Active Fulfillment Profiles"
                value={activeFulfillmentProfiles}
                description="Operational profiles currently active in SubscriptionSync"
              />
            </div>
          </BlockStack>

          <Divider />

          {/* ==================================================
              DAILY OPERATIONS
              ================================================== */}

          <NavigationSection
            title="Daily Operations"
            description="Manage the work happening between customer subscription and shipment fulfillment."
            items={operations}
          />

          <Divider />

          {/* ==================================================
              SUBSCRIBERS
              ================================================== */}

          <NavigationSection
            title="Subscribers"
            description="Review customer subscription information, monthly selections, and fulfillment status."
            items={subscriberTools}
          />

          <Divider />

          {/* ==================================================
              FULFILLMENT SETUP
              ================================================== */}

          <NavigationSection
            title="Fulfillment Setup"
            description="Configure how each Appstle subscription plan is handled inside SubscriptionSync."
            items={setupTools}
          />

          <Divider />

          {/* ==================================================
              RECENT ACTIVITY
              ================================================== */}

          <BlockStack gap="300">
            <BlockStack gap="100">
              <SectionHeading>
                Recent Activity
              </SectionHeading>

              <Text
                as="p"
                variant="bodyMd"
                tone="subdued"
              >
                The latest activity recorded by
                SubscriptionSync.
              </Text>
            </BlockStack>

            <Card>
              {recentActivity.length === 0 ? (
                <Box padding="300">
                  <BlockStack gap="200">
                    <Text
                      as="p"
                      variant="headingSm"
                    >
                      No activity yet
                    </Text>

                    <Text
                      as="p"
                      variant="bodyMd"
                      tone="subdued"
                    >
                      Subscription activity will appear here
                      as you begin testing the sandbox.
                    </Text>
                  </BlockStack>
                </Box>
              ) : (
                <BlockStack gap="300">
                  {recentActivity.map(
                    (activity, index) => (
                      <BlockStack
                        key={activity.id}
                        gap="300"
                      >
                        <InlineStack
                          align="space-between"
                          blockAlign="start"
                          gap="300"
                          wrap
                        >
                          <InlineStack
                            gap="300"
                            blockAlign="start"
                            wrap={false}
                          >
                            <div
                              style={{
                                background:
                                  COLORS.softBlueStrong,

                                border:
                                  `1px solid ${COLORS.borderBlue}`,

                                borderRadius: "10px",

                                padding: "9px",

                                display: "flex",

                                alignItems: "center",

                                justifyContent: "center",
                              }}
                            >
                              <Icon
                                source={ListBulletedIcon}
                                tone="base"
                              />
                            </div>

                            <BlockStack gap="100">
                              <Text
                                as="p"
                                variant="headingSm"
                              >
                                {activity.eventType}
                              </Text>

                              <Text
                                as="p"
                                variant="bodyMd"
                              >
                                {activity.description}
                              </Text>

                              <Text
                                as="p"
                                variant="bodySm"
                                tone="subdued"
                              >
                                {new Date(
                                  activity.createdAt,
                                ).toLocaleString()}
                              </Text>
                            </BlockStack>
                          </InlineStack>

                          <Badge
                            tone={
                              activity.status === "Success"
                                ? "success"
                                : activity.status === "Failed"
                                  ? "critical"
                                  : "attention"
                            }
                          >
                            {activity.status}
                          </Badge>
                        </InlineStack>

                        {index <
                          recentActivity.length - 1 && (
                          <Divider />
                        )}
                      </BlockStack>
                    ),
                  )}
                </BlockStack>
              )}
            </Card>
          </BlockStack>
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
}: {
  label: string;
  value: number;
  description: string;
}) {
  return (
    <div
      style={{
        background: COLORS.softBlue,

        border:
          `1px solid ${COLORS.borderBlue}`,

        borderRadius: "14px",

        padding: "20px",

        boxShadow:
          "0 2px 8px rgba(41, 74, 120, 0.04)",

        minHeight: "135px",
      }}
    >
      <BlockStack gap="200">
        <Text
          as="p"
          variant="bodySm"
          tone="subdued"
        >
          {label}
        </Text>

        <div
          style={{
            fontSize: "30px",

            fontWeight: 750,

            lineHeight: 1,

            color: COLORS.numberBlue,
          }}
        >
          {value}
        </div>

        <Text
          as="p"
          variant="bodySm"
          tone="subdued"
        >
          {description}
        </Text>
      </BlockStack>
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

          border:
            `1px solid ${COLORS.border}`,

          borderRadius: "14px",

          transition:
            "transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease",

          boxShadow:
            "0 2px 8px rgba(23, 35, 62, 0.03)",
        }}
      >
        <Box padding="400">
          <BlockStack gap="300">
            <InlineStack
              gap="300"
              blockAlign="center"
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

                  background:
                    COLORS.softBlueStrong,

                  border:
                    `1px solid ${COLORS.borderBlue}`,

                  borderRadius: "10px",
                }}
              >
                <Icon
                  source={icon}
                  tone="base"
                />
              </div>

              <Text
                as="h3"
                variant="headingMd"
              >
                {title}
              </Text>
            </InlineStack>

            <Text
              as="p"
              variant="bodyMd"
              tone="subdued"
            >
              {description}
            </Text>
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
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: DashboardLink[];
}) {
  return (
    <BlockStack gap="300">
      <BlockStack gap="100">
        <SectionHeading>
          {title}
        </SectionHeading>

        <Text
          as="p"
          variant="bodyMd"
          tone="subdued"
        >
          {description}
        </Text>
      </BlockStack>

      <div
        style={{
          display: "grid",

          gridTemplateColumns:
            "repeat(auto-fit, minmax(240px, 1fr))",

          gap: "16px",
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
   SECTION HEADING
   ============================================================ */

function SectionHeading({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <InlineStack
      gap="200"
      blockAlign="center"
    >
      <div
        style={{
          width: "4px",

          height: "22px",

          borderRadius: "999px",

          background: COLORS.tealBlue,

          flexShrink: 0,
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