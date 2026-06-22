import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { useMemo, useState } from "react";
import {
  Badge,
  BlockStack,
  Card,
  IndexTable,
  InlineStack,
  Layout,
  Page,
  Select,
  Text,
  TextField,
} from "@shopify/polaris";

import { authenticate } from "../shopify.server";
import db from "../db.server";

type SubscriberStatus =
  | "Active"
  | "Pending Selection"
  | "Auto-Select Needed"
  | "Order Ready"
  | "Needs Review";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  const subscribers = await db.subscriber.findMany({
    orderBy: {
      updatedAt: "desc",
    },
    include: {
      tier: true,
    },
  });

  const tiers = await db.tier.findMany({
    orderBy: {
      name: "asc",
    },
  });

  return json({ subscribers, tiers });
};

export default function SubscriberListPage() {
  const { subscribers, tiers } = useLoaderData<typeof loader>();

  const [searchValue, setSearchValue] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredSubscribers = useMemo(() => {
    return subscribers.filter((subscriber) => {
      const matchesSearch =
        subscriber.name.toLowerCase().includes(searchValue.toLowerCase()) ||
        subscriber.email.toLowerCase().includes(searchValue.toLowerCase());

      const matchesTier =
        tierFilter === "all" || subscriber.tier?.name === tierFilter;

      const matchesStatus =
        statusFilter === "all" || subscriber.status === statusFilter;

      return matchesSearch && matchesTier && matchesStatus;
    });
  }, [subscribers, searchValue, tierFilter, statusFilter]);

  const tierOptions = [
    { label: "All tiers", value: "all" },
    ...tiers.map((tier) => ({
      label: tier.name,
      value: tier.name,
    })),
  ];

  return (
    <Page
      title="Subscriber List"
      subtitle="View each subscriber's individual schedule, shipping date, selection deadline, and current status."
      backAction={{ content: "Dashboard", url: "/app" }}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            <Card>
              <BlockStack gap="400">
                <Text as="p" tone="subdued">
                  Each subscriber has their own subscription start date,
                  selection deadline, and next shipping date. Orders are handled
                  through a rolling daily queue instead of one shared monthly
                  cycle.
                </Text>

                <InlineStack gap="300" wrap>
                  <div style={{ minWidth: "260px" }}>
                    <TextField
                      label="Search subscribers"
                      labelHidden
                      value={searchValue}
                      onChange={setSearchValue}
                      placeholder="Search by name or email"
                      autoComplete="off"
                    />
                  </div>

                  <div style={{ minWidth: "160px" }}>
                    <Select
                      label="Tier filter"
                      labelHidden
                      value={tierFilter}
                      onChange={setTierFilter}
                      options={tierOptions}
                    />
                  </div>

                  <div style={{ minWidth: "220px" }}>
                    <Select
                      label="Status filter"
                      labelHidden
                      value={statusFilter}
                      onChange={setStatusFilter}
                      options={[
                        { label: "All statuses", value: "all" },
                        { label: "Active", value: "Active" },
                        {
                          label: "Pending Selection",
                          value: "Pending Selection",
                        },
                        {
                          label: "Auto-Select Needed",
                          value: "Auto-Select Needed",
                        },
                        { label: "Order Ready", value: "Order Ready" },
                        { label: "Needs Review", value: "Needs Review" },
                      ]}
                    />
                  </div>
                </InlineStack>
              </BlockStack>
            </Card>

            <Card padding="0">
              <IndexTable
                resourceName={{
                  singular: "subscriber",
                  plural: "subscribers",
                }}
                itemCount={filteredSubscribers.length}
                selectable={false}
                headings={[
                  { title: "Customer" },
                  { title: "Email" },
                  { title: "Tier" },
                  { title: "Subscription Start Date" },
                  { title: "Next Ship Date" },
                  { title: "Next Selection Deadline" },
                  { title: "Status" },
                  { title: "Actions" },
                ]}
              >
                {filteredSubscribers.map((subscriber, index) => (
                  <IndexTable.Row
                    id={subscriber.id}
                    key={subscriber.id}
                    position={index}
                  >
                    <IndexTable.Cell>
                      <Text as="span" fontWeight="semibold">
                        {subscriber.name}
                      </Text>
                    </IndexTable.Cell>

                    <IndexTable.Cell>{subscriber.email}</IndexTable.Cell>

                    <IndexTable.Cell>
                      {subscriber.tier?.name ?? "No tier"}
                    </IndexTable.Cell>

                    <IndexTable.Cell>
                      {formatDate(subscriber.subscriptionStartDate)}
                    </IndexTable.Cell>

                    <IndexTable.Cell>
                      {formatDate(subscriber.nextShipDate)}
                    </IndexTable.Cell>

                    <IndexTable.Cell>
                      {formatDate(subscriber.nextSelectionDeadline)}
                    </IndexTable.Cell>

                    <IndexTable.Cell>
                      <StatusBadge status={subscriber.status as SubscriberStatus} />
                    </IndexTable.Cell>

                    <IndexTable.Cell>
                      <Link to={`/app/subscriber-view/${subscriber.id}`}>
                        View details
                      </Link>
                    </IndexTable.Cell>
                  </IndexTable.Row>
                ))}
              </IndexTable>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

function StatusBadge({ status }: { status: SubscriberStatus }) {
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

function formatDate(date: string | Date | null) {
  if (!date) return "Not set";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}