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
import db from "../db.server";

type PreferenceSubmissionRow = {
  id: string;
  month: string;
  size: string | null;
  style: string | null;
  submittedAt: string | Date;
};

type ShipmentRow = {
  id: string;
  shipDate: string | Date;
  status: string;
  productName: string | null;
  trackingUrl: string | null;
  notes: string | null;
};

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
      shipments: {
        orderBy: {
          shipDate: "desc",
        },
      },
      preferenceSubmissions: {
        orderBy: {
          submittedAt: "desc",
        },
      },
      selections: {
        orderBy: {
          createdAt: "desc",
        },
      },
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

  const preferenceSubmissions =
    subscriber.preferenceSubmissions as PreferenceSubmissionRow[];

  const shipments = subscriber.shipments as ShipmentRow[];

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

                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <TableHeader>Month</TableHeader>
                        <TableHeader>Selection Status</TableHeader>
                        <TableHeader>Form Submitted</TableHeader>
                        <TableHeader>Size</TableHeader>
                        <TableHeader>Style</TableHeader>
                        <TableHeader>Source</TableHeader>
                      </tr>
                    </thead>

                    <tbody>
                      {preferenceSubmissions.length > 0 ? (
                        preferenceSubmissions.map((submission) => (
                          <tr key={submission.id}>
                            <TableCell>{submission.month}</TableCell>
                            <TableCell>
                              <Badge tone="success">Form Submitted</Badge>
                            </TableCell>
                            <TableCell>
                              {formatDate(submission.submittedAt)}
                            </TableCell>
                            <TableCell>{submission.size ?? "—"}</TableCell>
                            <TableCell>{submission.style ?? "—"}</TableCell>
                            <TableCell>Customer Form</TableCell>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <TableCell colSpan={6}>
                            No submission history available yet.
                          </TableCell>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  Shipment History
                </Text>

                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <TableHeader>Ship Date</TableHeader>
                        <TableHeader>Status</TableHeader>
                        <TableHeader>Product</TableHeader>
                        <TableHeader>Tracking</TableHeader>
                        <TableHeader>Notes</TableHeader>
                      </tr>
                    </thead>

                    <tbody>
                      {shipments.length > 0 ? (
                        shipments.map((shipment) => (
                          <tr key={shipment.id}>
                            <TableCell>{formatDate(shipment.shipDate)}</TableCell>
                            <TableCell>
                              <Badge>{shipment.status}</Badge>
                            </TableCell>
                            <TableCell>{shipment.productName ?? "—"}</TableCell>
                            <TableCell>
                              {shipment.trackingUrl ? (
                                <a
                                  href={shipment.trackingUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  View tracking
                                </a>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell>{shipment.notes ?? "—"}</TableCell>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <TableCell colSpan={5}>
                            No shipment history available yet.
                          </TableCell>
                        </tr>
                      )}
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
  if (status === "Active") return <Badge tone="success">Active</Badge>;

  if (status === "Pending Selection") {
    return <Badge tone="info">Pending Selection</Badge>;
  }

  if (status === "Auto-Select Needed") {
    return <Badge tone="warning">Auto-Select Needed</Badge>;
  }

  if (status === "Order Ready") return <Badge tone="success">Order Ready</Badge>;

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