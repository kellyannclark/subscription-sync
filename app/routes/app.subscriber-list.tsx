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

type SubscriberStatus =
  | "Active"
  | "Pending Selection"
  | "Auto-Select Needed"
  | "Order Ready"
  | "Needs Review";

type Subscriber = {
  id: string;
  name: string;
  email: string;
  tier: string;
  subscriptionStartDate: string;
  nextShipDate: string;
  nextSelectionDeadline: string;
  status: SubscriberStatus;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  const subscribers: Subscriber[] = [
    {
      id: "anna-jones",
      name: "Anna Jones",
      email: "anna@email.com",
      tier: "Twirl",
      subscriptionStartDate: "Sept 21",
      nextShipDate: "Oct 21",
      nextSelectionDeadline: "Oct 18",
      status: "Order Ready",
    },
    {
      id: "weston-clark",
      name: "Weston Clark",
      email: "weston@email.com",
      tier: "Adventure",
      subscriptionStartDate: "Sept 22",
      nextShipDate: "Oct 22",
      nextSelectionDeadline: "Oct 19",
      status: "Needs Review",
    },
    {
      id: "sadie-brown",
      name: "Sadie Brown",
      email: "sadie.brown@email.com",
      tier: "Classic",
      subscriptionStartDate: "Sept 23",
      nextShipDate: "Oct 23",
      nextSelectionDeadline: "Oct 20",
      status: "Pending Selection",
    },
    {
      id: "mia-thompson",
      name: "Mia Thompson",
      email: "mia.t@email.com",
      tier: "Deluxe",
      subscriptionStartDate: "Sept 24",
      nextShipDate: "Oct 24",
      nextSelectionDeadline: "Oct 21",
      status: "Auto-Select Needed",
    },
    {
      id: "oliver-smith",
      name: "Oliver Smith",
      email: "oliver.smith@email.com",
      tier: "Twirl",
      subscriptionStartDate: "Sept 25",
      nextShipDate: "Oct 25",
      nextSelectionDeadline: "Oct 22",
      status: "Active",
    },
    {
      id: "grace-lee",
      name: "Grace Lee",
      email: "grace.lee@email.com",
      tier: "Adventure",
      subscriptionStartDate: "Sept 26",
      nextShipDate: "Oct 26",
      nextSelectionDeadline: "Oct 23",
      status: "Active",
    },
  ];

  return json({ subscribers });
};

export default function SubscriberListPage() {
  const { subscribers } = useLoaderData<typeof loader>();

  const [searchValue, setSearchValue] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredSubscribers = useMemo(() => {
    return subscribers.filter((subscriber) => {
      const matchesSearch =
        subscriber.name.toLowerCase().includes(searchValue.toLowerCase()) ||
        subscriber.email.toLowerCase().includes(searchValue.toLowerCase());

      const matchesTier =
        tierFilter === "all" || subscriber.tier === tierFilter;

      const matchesStatus =
        statusFilter === "all" || subscriber.status === statusFilter;

      return matchesSearch && matchesTier && matchesStatus;
    });
  }, [subscribers, searchValue, tierFilter, statusFilter]);

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
                  Each subscriber has their own subscription start date, selection
                  deadline, and next shipping date. Orders are handled through a
                  rolling daily queue instead of one shared monthly cycle.
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
                      options={[
                        { label: "All tiers", value: "all" },
                        { label: "Twirl", value: "Twirl" },
                        { label: "Adventure", value: "Adventure" },
                        { label: "Classic", value: "Classic" },
                        { label: "Deluxe", value: "Deluxe" },
                      ]}
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

                    <IndexTable.Cell>{subscriber.tier}</IndexTable.Cell>

                    <IndexTable.Cell>
                      {subscriber.subscriptionStartDate}
                    </IndexTable.Cell>

                    <IndexTable.Cell>{subscriber.nextShipDate}</IndexTable.Cell>

                    <IndexTable.Cell>
                      {subscriber.nextSelectionDeadline}
                    </IndexTable.Cell>

                    <IndexTable.Cell>
                      <StatusBadge status={subscriber.status} />
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