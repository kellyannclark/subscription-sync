import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";

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

export const loader = async ({ request }: LoaderFunctionArgs) => {
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

function MetricCard({
  label,
  value,
  description,
  className,
}: {
  label: string;
  value: number;
  description: string;
  className: string;
}) {
  return (
    <div className={`ss-metric-card ${className}`}>
      <BlockStack gap="200">
        <Text as="p" variant="bodyMd" tone="subdued">
          {label}
        </Text>

        <Text as="p" variant="heading2xl">
          {value}
        </Text>

        <Text as="p" variant="bodySm" tone="subdued">
          {description}
        </Text>
      </BlockStack>
    </div>
  );
}

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
      <div className="ss-nav-card">
        <Box padding="400">
          <BlockStack gap="300">
            <InlineStack
              gap="300"
              blockAlign="center"
              wrap={false}
            >
              <Box
                background="bg-surface-secondary"
                borderRadius="300"
                padding="200"
              >
                <Icon source={icon} tone="base" />
              </Box>

              <Text as="h3" variant="headingMd">
                {title}
              </Text>
            </InlineStack>

            <Text as="p" variant="bodyMd" tone="subdued">
              {description}
            </Text>
          </BlockStack>
        </Box>
      </div>
    </Link>
  );
}

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
        <div className="ss-section-accent" />

        <Text as="h2" variant="headingLg">
          {title}
        </Text>

        <Text as="p" variant="bodyMd" tone="subdued">
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

export default function Dashboard() {
  const {
    activeSubscribers,
    pendingSelections,
    pendingShipments,
    activeFulfillmentProfiles,
    recentActivity,
  } = useLoaderData<typeof loader>();

  return (
    <div className="ss-dashboard">
      <Page>
        <TitleBar title="SubscriptionSync" />

        <BlockStack gap="600">
          <Layout>
            <Layout.Section>
              <div className="ss-hero">
                <InlineStack
                  align="space-between"
                  blockAlign="center"
                  gap="300"
                >
                  <BlockStack gap="100">
                    <Text as="h1" variant="headingXl">
                      Little Adventures Subscription Operations
                    </Text>

                    <Text
                      as="p"
                      variant="bodyMd"
                      tone="subdued"
                    >
                      Manage monthly customer selections,
                      fulfillment profiles, and the workflow
                      between Appstle subscriptions and shipment
                      fulfillment.
                    </Text>
                  </BlockStack>

                  <Badge tone="info">
                    Development Sandbox
                  </Badge>
                </InlineStack>
              </div>
            </Layout.Section>
          </Layout>

          {/* CURRENT SNAPSHOT */}
          <BlockStack gap="300">
            <BlockStack gap="100">
              <div className="ss-section-accent" />

              <Text as="h2" variant="headingLg">
                Current Snapshot
              </Text>

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
                  "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "16px",
              }}
            >
              <MetricCard
                label="Total Active Subscribers"
                value={activeSubscribers}
                description="Customers with an active Appstle subscription"
                className="ss-metric-blue"
              />

              <MetricCard
                label="Pending Selections"
                value={pendingSelections}
                description="Monthly customer selections still waiting to be completed"
                className="ss-metric-brand-blue"
              />

              <MetricCard
                label="Pending Shipments"
                value={pendingShipments}
                description="Upcoming shipments that still need processing"
                className="ss-metric-gold"
              />

              <MetricCard
                label="Active Fulfillment Profiles"
                value={activeFulfillmentProfiles}
                description="Operational profiles currently active in SubscriptionSync"
                className="ss-metric-green"
              />
            </div>
          </BlockStack>

          <Divider />

          {/* DAILY OPERATIONS */}
          <NavigationSection
            title="Daily Operations"
            description="Manage the work happening between customer subscription and shipment fulfillment."
            items={operations}
          />

          <Divider />

          {/* SUBSCRIBERS */}
          <NavigationSection
            title="Subscribers"
            description="Review customer subscription information, monthly selections, and fulfillment status."
            items={subscriberTools}
          />

          <Divider />

          {/* FULFILLMENT SETUP */}
          <NavigationSection
            title="Fulfillment Setup"
            description="Configure how each Appstle subscription plan is handled inside SubscriptionSync."
            items={setupTools}
          />

          <Divider />

          {/* RECENT ACTIVITY */}
          <BlockStack gap="300">
            <BlockStack gap="100">
              <div className="ss-section-accent" />

              <Text as="h2" variant="headingLg">
                Recent Activity
              </Text>

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
                <BlockStack gap="200">
                  <Text as="p" variant="headingSm">
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
                        >
                          <InlineStack
                            gap="300"
                            blockAlign="start"
                            wrap={false}
                          >
                            <Box
                              background="bg-surface-secondary"
                              borderRadius="300"
                              padding="200"
                            >
                              <Icon
                                source={
                                  ListBulletedIcon
                                }
                                tone="base"
                              />
                            </Box>

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

                        {index <
                          recentActivity.length -
                            1 && <Divider />}
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