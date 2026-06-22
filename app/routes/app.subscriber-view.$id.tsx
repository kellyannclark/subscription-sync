import db from "../db.server";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import {
  Badge,
  BlockStack,
  Card,
  InlineGrid,
  InlineStack,
  Layout,
  Page,
  Text,
  TextField,
} from "@shopify/polaris";

import { authenticate } from "../shopify.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  const subscriberId = params.id;

  if (!subscriberId) {
    throw new Response("Subscriber ID is required", { status: 400 });
  }

  const subscriber = await db.subscriber.findUnique({
    where: {
      id: subscriberId,
    },
    include: {
      tier: true,
    },
  });

  if (!subscriber) {
    throw new Response("Subscriber not found", { status: 404 });
  }

  return json({ subscriber });
};

export default function SubscriberViewPage() {
  const { subscriber } = useLoaderData<typeof loader>();

  const autoSelectionEnabled = Boolean(subscriber.autoSelectionDate);

  return (
    <Page
      title="Customer View"
      subtitle="Review a customer's profile, subscription schedule, and selection history."
      backAction={{ content: "Subscriber List", url: "/app/subscriber-list" }}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            <Card>
              <TextField
                label="Search customers"
                labelHidden
                placeholder="Search customers by name or email"
                autoComplete="off"
                value=""
                onChange={() => {}}
              />
            </Card>

            <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    Customer Info
                  </Text>

                  <InfoRow label="Name" value={subscriber.name} />
                  <InfoRow label="Email" value={subscriber.email} />
                  <InfoRow
                    label="Subscription Tier"
                    value={subscriber.tier?.name ?? "No tier assigned"}
                  />

                  <InlineStack align="space-between">
                    <Text as="span">Status</Text>
                    <StatusBadge status={subscriber.status} />
                  </InlineStack>

                  <InlineStack align="space-between">
                    <Text as="span">Auto Selection</Text>
                    {autoSelectionEnabled ? (
                      <Badge tone="success">Scheduled</Badge>
                    ) : (
                      <Badge tone="attention">Not scheduled</Badge>
                    )}
                  </InlineStack>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    Subscription Schedule
                  </Text>

                  <InfoRow
                    label="Subscription Start Date"
                    value={formatDate(subscriber.subscriptionStartDate)}
                  />
                  <InfoRow
                    label="Next Ship Date"
                    value={formatDate(subscriber.nextShipDate)}
                  />
                  <InfoRow
                    label="Next Selection Deadline"
                    value={formatDate(subscriber.nextSelectionDeadline)}
                  />
                  <InfoRow
                    label="Auto-Selection Date"
                    value={formatDate(subscriber.autoSelectionDate)}
                  />
                </BlockStack>
              </Card>
            </InlineGrid>

            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  Form Submission History
                </Text>

                <Text as="p" tone="subdued">
                  Preference submissions will appear here after we connect the
                  preference form records to subscribers.
                </Text>

                <div style={{ overflowX: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                    }}
                  >
                    <thead>
                      <tr>
                        <TableHeader>Month</TableHeader>
                        <TableHeader>Selection Status</TableHeader>
                        <TableHeader>Form Submitted</TableHeader>
                        <TableHeader>Product</TableHeader>
                        <TableHeader>Source</TableHeader>
                      </tr>
                    </thead>

                    <tbody>
                      <tr>
                        <TableCell colSpan={5}>
                          No submission history available yet.
                        </TableCell>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </BlockStack>
            </Card>

            <InlineStack align="end">
              <Link to="/app/subscriber-list">Back to Subscriber List</Link>
            </InlineStack>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "Active") {
    return <Badge tone="success">Active</Badge>;
  }

  if (status === "Pending Selection") {
    return <Badge tone="info">Pending Selection</Badge>;
  }

  if (status === "Auto-Select Needed") {
    return <Badge tone="warning">Auto-Select Needed</Badge>;
  }

  if (status === "Order Ready") {
    return <Badge tone="success">Order Ready</Badge>;
  }

  return <Badge tone="critical">Needs Review</Badge>;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <InlineStack align="space-between" gap="300">
      <Text as="span" tone="subdued">
        {label}
      </Text>
      <Text as="span" fontWeight="medium">
        {value}
      </Text>
    </InlineStack>
  );
}

function TableHeader({ children }: { children: React.ReactNode }) {
  return (
    <th
      style={{
        textAlign: "left",
        padding: "12px",
        borderBottom: "1px solid #E1E3E5",
      }}
    >
      <Text as="span" fontWeight="semibold">
        {children}
      </Text>
    </th>
  );
}

function TableCell({
  children,
  colSpan,
}: {
  children: React.ReactNode;
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      style={{
        padding: "12px",
        borderBottom: "1px solid #E1E3E5",
      }}
    >
      {children}
    </td>
  );
}

function formatDate(date: string | Date | null) {
  if (!date) return "Not set";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}