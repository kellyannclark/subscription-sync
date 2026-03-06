import type { LoaderFunctionArgs } from "@remix-run/node";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  InlineStack,
  Box,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

type DashboardItem = {
  title: string;
  description: string;
  url: string;
  icon: string;
  accent: string;
};

const dashboardItems: DashboardItem[] = [
  {
    title: "Current Cycle",
    description:
      "Track submissions, automation, and reminders for the current subscription period.",
    url: "/app/current-cycle",
    icon: "📅",
    accent: "#38b6ff",
  },
  {
    title: "Quick Submit",
    description: "Manually submit a customer’s monthly selection.",
    url: "/app/quick-submit",
    icon: "⚡",
    accent: "#8b5cf6",
  },
  {
    title: "Activity Log",
    description:
      "View a history of sync events, automation runs, and admin actions.",
    url: "/app/activity-log",
    icon: "📝",
    accent: "#6b7280",
  },
  {
    title: "Subscriber List",
    description: "View and filter all subscribers.",
    url: "/app/customers",
    icon: "👥",
    accent: "#14b8a6",
  },
  {
    title: "Subscriber View",
    description: "Access detailed subscriber profiles.",
    url: "/app/customers/demo",
    icon: "🔍",
    accent: "#0ea5e9",
  },
  {
    title: "Subscriber Form",
    description: "Preview the live form subscribers fill out.",
    url: "/app/form",
    icon: "🧾",
    accent: "#06b6d4",
  },
  {
    title: "Tier List",
    description: "View all subscription tiers.",
    url: "/app/tiers",
    icon: "📚",
    accent: "#f59e0b",
  },
  {
    title: "Create Tier",
    description: "Create a new subscription tier and add products.",
    url: "/app/tiers/new",
    icon: "➕",
    accent: "#f97316",
  },
  {
    title: "Edit Tier",
    description: "Manage active subscription tiers.",
    url: "/app/tiers/demo",
    icon: "✏️",
    accent: "#fb923c",
  },
  {
    title: "Settings",
    description: "Adjust global automation and tagging rules.",
    url: "/app/settings",
    icon: "⚙️",
    accent: "#64748b",
  },
];

function DashboardCard({ title, description, url, icon, accent }: DashboardItem) {
  return (
    <Card>
      <div
        style={{
          borderTop: `4px solid ${accent}`,
          borderRadius: "8px",
          paddingTop: "4px",
        }}
      >
        <BlockStack gap="300">
          <InlineStack align="space-between" blockAlign="center">
            <InlineStack gap="200" blockAlign="center">
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "999px",
                  backgroundColor: `${accent}20`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px",
                }}
              >
                {icon}
              </div>
              <Text as="h2" variant="headingMd">
                {title}
              </Text>
            </InlineStack>
          </InlineStack>

          <Text as="p" variant="bodyMd" tone="subdued">
            {description}
          </Text>

          <InlineStack align="start">
            <Button url={url} variant="primary">
              Open
            </Button>
          </InlineStack>
        </BlockStack>
      </div>
    </Card>
  );
}

export default function Dashboard() {
  return (
    <Page>
      <TitleBar title="SubscriptionSync Dashboard" />

      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Text as="h1" variant="headingLg">
                  Welcome to SubscriptionSync
                </Text>

                <Text as="p" variant="bodyMd" tone="subdued">
                  This is your Little Adventures control center for managing
                  customer subscriptions, preferences, and automated monthly
                  selections.
                </Text>

                <Text as="p" variant="bodyMd" tone="subdued">
                  From here, you can review customer data, manage tiers,
                  adjust settings, and prepare the app for monthly fulfillment
                  decisions.
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Box>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                  gap: "16px",
                }}
              >
                {dashboardItems.map((item) => (
                  <DashboardCard key={item.title} {...item} />
                ))}
              </div>
            </Box>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}