import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import {
  Badge,
  BlockStack,
  Box,
  Card,
  InlineGrid,
  InlineStack,
  Layout,
  Page,
  Text,
  TextField,
} from "@shopify/polaris";

import { authenticate } from "../shopify.server";

type SubmissionHistory = {
  month: string;
  selectionStatus: string;
  formSubmitted: string;
  product: string;
  source: string;
};

type Subscriber = {
  id: string;
  name: string;
  email: string;
  tier: string;
  autoSelection: boolean;
  defaultTag: string;
  renewalDate: string;
  currentMonth: string;
  currentSize: string;
  currentStyle: string;
  currentTheme: string;
  currentFormSubmitted: string;
  history: SubmissionHistory[];
};

const mockSubscribers: Subscriber[] = [
  {
    id: "anna-jones",
    name: "Anna Jones",
    email: "anna.jones@email.com",
    tier: "Twirl",
    autoSelection: true,
    defaultTag: "SubscriptionSync-Auto",
    renewalDate: "March 2026",
    currentMonth: "October 2025",
    currentSize: "Medium",
    currentStyle: "Style",
    currentTheme: "Princess",
    currentFormSubmitted: "Oct. 3",
    history: [
      {
        month: "Sept 2025",
        selectionStatus: "Form Submitted",
        formSubmitted: "Sept. 15",
        product: "Belle Dress",
        source: "Customer Form",
      },
      {
        month: "Oct 2025",
        selectionStatus: "Auto Selected",
        formSubmitted: "—",
        product: "Ariel Dress",
        source: "Automation",
      },
      {
        month: "Nov 2025",
        selectionStatus: "Pending",
        formSubmitted: "—",
        product: "—",
        source: "—",
      },
    ],
  },
  {
    id: "weston-clark",
    name: "Weston Clark",
    email: "weston@email.com",
    tier: "Adventure",
    autoSelection: false,
    defaultTag: "SubscriptionSync-Auto",
    renewalDate: "April 2026",
    currentMonth: "October 2025",
    currentSize: "Large",
    currentStyle: "Adventure",
    currentTheme: "Pirate",
    currentFormSubmitted: "Oct. 2",
    history: [],
  },
];

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  const subscriberId = params.id ?? "anna-jones";

  const subscriber =
    mockSubscribers.find((item) => item.id === subscriberId) ??
    mockSubscribers[0];

  return json({ subscriber });
};

export default function SubscriberViewPage() {
  const { subscriber } = useLoaderData<typeof loader>();

  return (
    <Page
      title="Customer View"
      subtitle="Review a customer's profile, monthly selections, and form submission history."
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
                  <InfoRow label="Subscription Tier" value={subscriber.tier} />

                  <InlineStack align="space-between">
                    <Text as="span">Auto Selection</Text>
                    {subscriber.autoSelection ? (
                      <Badge tone="success">Enabled</Badge>
                    ) : (
                      <Badge tone="critical">Disabled</Badge>
                    )}
                  </InlineStack>

                  <InfoRow label="Default Tag" value={subscriber.defaultTag} />
                  <InfoRow label="Renewal Date" value={subscriber.renewalDate} />
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    Current Preferences Summary
                  </Text>

                  <InfoRow label="Month" value={subscriber.currentMonth} />
                  <InfoRow label="Size" value={subscriber.currentSize} />
                  <InfoRow label="Style" value={subscriber.currentStyle} />
                  <InfoRow label="Theme" value={subscriber.currentTheme} />
                  <InfoRow
                    label="Form Submitted"
                    value={subscriber.currentFormSubmitted}
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
                      {subscriber.history.length > 0 ? (
                        subscriber.history.map((item) => (
                          <tr key={item.month}>
                            <TableCell>{item.month}</TableCell>
                            <TableCell>
                              <Badge
                                tone={
                                  item.selectionStatus === "Form Submitted"
                                    ? "success"
                                    : item.selectionStatus === "Auto Selected"
                                      ? "info"
                                      : "attention"
                                }
                              >
                                {item.selectionStatus}
                              </Badge>
                            </TableCell>
                            <TableCell>{item.formSubmitted}</TableCell>
                            <TableCell>{item.product}</TableCell>
                            <TableCell>{item.source}</TableCell>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <TableCell colSpan={5}>
                            No submission history available yet.
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