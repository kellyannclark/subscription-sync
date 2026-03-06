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
  url?: string;
  actionLabel?: string;
};

const dashboardItems: DashboardItem[] = [
  {
    title: "Current Cycle",
    description:
      "Track submissions, automation, and reminders for the current subscription period.",
    url: "/app/current-cycle",
    actionLabel: "Open",
  },
  {
    title: "Quick Submit",
    description:
      "Manually submit or adjust a customer's monthly selection.",
    actionLabel: "Coming soon",
  },
  {
    title: "Subscriber List",
    description:
      "View all subscribers, filter accounts, and access customer details.",
    url: "/app/customers",
    actionLabel: "Open",
  },
  {
    title: "Subscriber Form",
    description:
      "Preview the live customer form subscribers will use each month.",
    url: "/app/form",
    actionLabel: "Open",
  },
  {
    title: "Tier List",
    description:
      "View all subscription tiers and manage the products available in each one.",
    url: "/app/tiers",
    actionLabel: "Open",
  },
  {
    title: "Create Tier",
    description:
      "Create a new subscription tier and assign eligible products.",
    url: "/app/tiers/new",
    actionLabel: "Open",
  },
  {
    title: "Activity Log",
    description:
      "Review sync events, automation runs, and admin activity.",
    actionLabel: "Coming soon",
  },
  {
    title: "Settings",
    description:
      "Adjust automation rules, integrations, and global app settings.",
    url: "/app/settings",
    actionLabel: "Open",
  },
];

function DashboardCard({ title, description, url, actionLabel }: DashboardItem) {
  const isDisabled = !url;

  return (
    <Card>
      <BlockStack gap="300">
        <Text as="h2" variant="headingMd">
          {title}
        </Text>

        <Text as="p" variant="bodyMd" tone="subdued">
          {description}
        </Text>

        <InlineStack align="start">
          <Button url={url} disabled={isDisabled} variant="primary">
            {actionLabel ?? "Open"}
          </Button>
        </InlineStack>
      </BlockStack>
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