import type { LoaderFunctionArgs } from "@remix-run/node"; //needs a loader for authentication, even if it doesn't load any data
import { //UI building blocks from Polaris 
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  InlineStack,
  Box,
} from "@shopify/polaris";
import { Link } from "@remix-run/react";
import { TitleBar } from "@shopify/app-bridge-react";  //Shopify App Bridge component for consistent title bars across the app
import { authenticate } from "../shopify.server";//Custom authentication function to ensure only admins can access this dashboard

export const loader = async ({ request }: LoaderFunctionArgs) => {//Authenticate the user as an admin before allowing access to the dashboard
  await authenticate.admin(request);
  return null;
};
//Define the structure of each dashboard item for consistent rendering
type DashboardItem = {
  title: string;
  description: string;
  url: string;
  icon: string;
 
};
//List of dashboard items with their respective details for rendering on the dashboard
const dashboardItems: DashboardItem[] = [
  {
    title: "Current Cycle",
    description:
      "Track submissions, automation, and reminders for the current subscription period.",
    url: "/app/current-cycle",
    icon: "📅",
  
  },
  {
    title: "Quick Submit",
    description: "Manually submit a customer’s monthly selection.",
    url: "/app/quick-submit",
    icon: "⚡",
  
  },
  {
    title: "Activity Log",
    description:
      "View a history of sync events, automation runs, and admin actions.",
    url: "/app/activity-log",
    icon: "📝",
  },
  {
    title: "Subscriber List",
    description: "View and filter all subscribers.",
    url: "/app/customers",
    icon: "👥",
  },
  {
    title: "Subscriber View",
    description: "Access detailed subscriber profiles.",
    url: "/app/customers/demo",
    icon: "🔍",
  },
  {
    title: "Subscriber Form",
    description: "Preview the live form subscribers fill out.",
    url: "/app/form",
    icon: "🧾",
  },
  {
    title: "Tier List",
    description: "View all subscription tiers.",
    url: "/app/tiers",
    icon: "📚",
  },
  {
    title: "Create Tier",
    description: "Create a new subscription tier and add products.",
    url: "/app/tiers/new",
    icon: "➕",
  },
  {
    title: "Edit Tier",
    description: "Manage active subscription tiers.",
    url: "/app/tiers/demo",
    icon: "✏️",
  },
  {
    title: "Settings",
    description: "Adjust global automation and tagging rules.",
    url: "/app/settings",
    icon: "⚙️",
  },
];

// Component for rendering each dashboard card
function DashboardCard({ title, description, url, icon }: DashboardItem) {
  return (
    <Link
      to={url}
      style={{
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <Card>
        <div
          style={{
            minHeight: "140px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <BlockStack gap="300">
            <InlineStack gap="200" blockAlign="center">
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "999px",
                  backgroundColor: "#EEF2F6",
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

            <Text as="p" variant="bodyMd" tone="subdued">
              {description}
            </Text>
          </BlockStack>
        </div>
      </Card>
    </Link>
  );
}
//Main dashboard component that renders the title bar and a grid of dashboard cards for navigation
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