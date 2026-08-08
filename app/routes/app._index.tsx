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
    activeTiers,
    recentActivity,
  ] = await Promise.all([
    db.subscriber.count({
      where: {
        status: "Active",
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

    db.tier.count({
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
    activeTiers,
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
      "Review upcoming deadlines, submissions, and monthly subscription activity.",
    url: "/app/daily-queue",
    icon: CalendarIcon,
  },
  {
    title: "Quick Submit",
    description:
      "Manually submit or record a subscriber's monthly selection.",
    url: "/app/quick-submit",
    icon: ClipboardIcon,
  },
  {
    title: "Activity Log",
    description:
      "Review sync activity, automation events, and administrative actions.",
    url: "/app/activity-log",
    icon: ClockIcon,
  },
];

const subscriberTools: DashboardLink[] = [
  {
    title: "Subscribers",
    description:
      "View subscribers, subscription status, tiers, and upcoming shipment information.",
    url: "/app/subscriber-list",
    icon: PersonIcon,
  },
  {
    title: "Subscriber Form",
    description:
      "Preview the preference form subscribers use to submit their selections.",
    url: "/app/preferences-form",
    icon: ClipboardIcon,
  },
];

const setupTools: DashboardLink[] = [
  {
    title: "Subscription Tiers",
    description:
      "Review active tiers and the products assigned to each subscription.",
    url: "/app/tiers",
    icon: ProductIcon,
  },
  {
    title: "Create Tier",
    description:
      "Create a new subscription tier and assign eligible products.",
    url: "/app/tiers/new",
    icon: PlusIcon,
  },
  {
    title: "Settings",
    description:
      "Manage automation timing, selection rules, tags, and fulfillment settings.",
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
            <InlineStack gap="300" blockAlign="center" wrap={false}>
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
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "16px",
        }}
      >
        {items.map((item) => (
          <NavigationCard key={item.title} {...item} />
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
    activeTiers,
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
                      Little Adventures Subscription Management
                    </Text>

                    <Text as="p" variant="bodyMd" tone="subdued">
                      Manage customer selections, subscription tiers, and the monthly workflow between 
                      Appstle subscriptions and shipment fulfillment.
                    </Text>
                  </BlockStack>

                  <Badge tone="info">Development Sandbox</Badge>
                </InlineStack>
              </div>
            </Layout.Section>
          </Layout>

          <BlockStack gap="300">
            <BlockStack gap="100">
              <div className="ss-section-accent" />

              <Text as="h2" variant="headingLg">
                Current Snapshot
              </Text>

              <Text as="p" variant="bodyMd" tone="subdued">
                A quick look at the subscription program right now.
              </Text>
            </BlockStack>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "16px",
              }}
            >
              <MetricCard
                label="Active subscribers"
                value={activeSubscribers}
                description="Currently active subscription customers"
                className="ss-metric-blue"
              />

              <MetricCard
                label="Pending selections"
                value={pendingSelections}
                description="Selections still waiting to be completed"
                className="ss-metric-brand-blue"
              />

              <MetricCard
                label="Pending shipments"
                value={pendingShipments}
                description="Upcoming shipments that still need processing"
                className="ss-metric-gold"
              />

              <MetricCard
                label="Active tiers"
                value={activeTiers}
                description="Subscription tiers currently available"
                className="ss-metric-green"
              />
            </div>
          </BlockStack>

          <Divider />

          <NavigationSection
            title="Daily Operations"
            description="The tools used to manage the current subscription cycle."
            items={operations}
          />

          <Divider />

          <NavigationSection
            title="Subscribers"
            description="Review subscriber information and customer selections."
            items={subscriberTools}
          />

          <Divider />

          <NavigationSection
            title="Subscription Setup"
            description="Manage tiers, products, and application settings."
            items={setupTools}
          />

          <Divider />

          <BlockStack gap="300">
            <BlockStack gap="100">
              <div className="ss-section-accent" />

              <Text as="h2" variant="headingLg">
                Recent Activity
              </Text>

              <Text as="p" variant="bodyMd" tone="subdued">
                The latest activity recorded by SubscriptionSync.
              </Text>
            </BlockStack>

            <Card>
              {recentActivity.length === 0 ? (
                <BlockStack gap="200">
                  <Text as="p" variant="headingSm">
                    No activity yet
                  </Text>

                  <Text as="p" variant="bodyMd" tone="subdued">
                    Subscription activity will appear here as you begin testing
                    the sandbox.
                  </Text>
                </BlockStack>
              ) : (
                <BlockStack gap="300">
                  {recentActivity.map((activity, index) => (
                    <BlockStack key={activity.id} gap="300">
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
                            <Icon source={ListBulletedIcon} tone="base" />
                          </Box>

                          <BlockStack gap="100">
                            <Text as="p" variant="headingSm">
                              {activity.eventType}
                            </Text>

                            <Text as="p" variant="bodyMd">
                              {activity.description}
                            </Text>

                            <Text as="p" variant="bodySm" tone="subdued">
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

                      {index < recentActivity.length - 1 && <Divider />}
                    </BlockStack>
                  ))}
                </BlockStack>
              )}
            </Card>
          </BlockStack>
        </BlockStack>
      </Page>
    </div>
  );
}