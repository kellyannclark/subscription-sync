import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  Form,
  Link,
  useActionData,
  useLoaderData,
  useNavigation,
} from "@remix-run/react";
import { useMemo, useState } from "react";
import {
  Badge,
  Banner,
  BlockStack,
  Box,
  Button,
  Card,
  Divider,
  IndexTable,
  InlineStack,
  Layout,
  Page,
  Select,
  Text,
} from "@shopify/polaris";

import { authenticate } from "../shopify.server";

type QueueStatus =
  | "Due Today"
  | "Due Tomorrow"
  | "Pending Selection"
  | "Auto-Select Needed"
  | "Order Ready"
  | "Needs Review";

type QueueSubscriber = {
  id: string;
  name: string;
  email: string;
  tier: string;
  nextShipDate: string;
  selectionDeadline: string;
  autoSelectDate: string;
  orderCreationDate: string;
  autoSelection: boolean;
  status: QueueStatus;
};

type QueueStats = {
  queueDate: string;
  dueToday: number;
  dueTomorrow: number;
  pendingSelections: number;
  autoSelectNeeded: number;
  ordersReady: number;
  needsReview: number;
  lastReminderSent: string;
  lastSync: string;
  syncStatus: "Connected" | "Warning" | "Error";
};

const queueSubscribers: QueueSubscriber[] = [
  {
    id: "anna-jones",
    name: "Anna Jones",
    email: "anna@email.com",
    tier: "Twirl",
    nextShipDate: "Oct 21",
    selectionDeadline: "Oct 18",
    autoSelectDate: "Oct 19",
    orderCreationDate: "Oct 20",
    autoSelection: true,
    status: "Order Ready",
  },
  {
    id: "weston-clark",
    name: "Weston Clark",
    email: "weston@email.com",
    tier: "Adventure",
    nextShipDate: "Oct 21",
    selectionDeadline: "Oct 18",
    autoSelectDate: "Oct 19",
    orderCreationDate: "Oct 20",
    autoSelection: false,
    status: "Needs Review",
  },
  {
    id: "sadie-brown",
    name: "Sadie Brown",
    email: "sadie.brown@email.com",
    tier: "Classic",
    nextShipDate: "Oct 22",
    selectionDeadline: "Oct 19",
    autoSelectDate: "Oct 20",
    orderCreationDate: "Oct 21",
    autoSelection: true,
    status: "Auto-Select Needed",
  },
  {
    id: "mia-thompson",
    name: "Mia Thompson",
    email: "mia.t@email.com",
    tier: "Deluxe",
    nextShipDate: "Oct 23",
    selectionDeadline: "Oct 20",
    autoSelectDate: "Oct 21",
    orderCreationDate: "Oct 22",
    autoSelection: true,
    status: "Pending Selection",
  },
  {
    id: "oliver-smith",
    name: "Oliver Smith",
    email: "oliver.smith@email.com",
    tier: "Twirl",
    nextShipDate: "Oct 20",
    selectionDeadline: "Oct 17",
    autoSelectDate: "Oct 18",
    orderCreationDate: "Oct 19",
    autoSelection: true,
    status: "Due Today",
  },
  {
    id: "grace-lee",
    name: "Grace Lee",
    email: "grace.lee@email.com",
    tier: "Adventure",
    nextShipDate: "Oct 21",
    selectionDeadline: "Oct 18",
    autoSelectDate: "Oct 19",
    orderCreationDate: "Oct 20",
    autoSelection: true,
    status: "Due Tomorrow",
  },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  const stats: QueueStats = {
    queueDate: "Today’s Fulfillment Queue",
    dueToday: 1,
    dueTomorrow: 1,
    pendingSelections: 1,
    autoSelectNeeded: 1,
    ordersReady: 1,
    needsReview: 1,
    lastReminderSent: "Oct 17, 9:00 AM",
    lastSync: "Oct 17, 4:37 PM",
    syncStatus: "Connected",
  };

  return json({ stats, queueSubscribers });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  await authenticate.admin(request);

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "send-reminders") {
    return json({
      success: true,
      message: "Reminder job started for subscribers with upcoming deadlines.",
    });
  }

  if (intent === "run-auto-selection") {
    return json({
      success: true,
      message: "Auto-selection job started for eligible subscribers.",
    });
  }

  if (intent === "create-orders") {
    return json({
      success: true,
      message: "Order creation job started for subscribers ready to ship.",
    });
  }

  if (intent === "sync-now") {
    return json({
      success: true,
      message: "Shopify and Appstle sync started successfully.",
    });
  }

  return json({
    success: true,
    message: "Daily queue action completed.",
  });
};

export default function DailyQueuePage() {
  const { stats, queueSubscribers } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();

  const [filter, setFilter] = useState("all");
  const [intent, setIntent] = useState("");

  const isSubmitting = navigation.state === "submitting";

  const filteredSubscribers = useMemo(() => {
    if (filter === "all") {
      return queueSubscribers;
    }

    return queueSubscribers.filter((subscriber) => {
      if (filter === "due-today") return subscriber.status === "Due Today";
      if (filter === "due-tomorrow") return subscriber.status === "Due Tomorrow";
      if (filter === "pending-selection") return subscriber.status === "Pending Selection";
      if (filter === "auto-select-needed") return subscriber.status === "Auto-Select Needed";
      if (filter === "order-ready") return subscriber.status === "Order Ready";
      if (filter === "needs-review") return subscriber.status === "Needs Review";

      return true;
    });
  }, [filter, queueSubscribers]);

  return (
    <Page
      title="Daily Queue"
      subtitle="Manage subscribers with upcoming selection deadlines, auto-selection dates, order creation dates, and shipping dates."
      backAction={{ content: "Dashboard", url: "/app" }}
    >
      <Form method="post">
        <input type="hidden" name="intent" value={intent} />

        <BlockStack gap="500">
          {actionData?.message && (
            <Banner
              title={actionData.success ? "Success" : "Action needed"}
              tone={actionData.success ? "success" : "critical"}
            >
              <p>{actionData.message}</p>
            </Banner>
          )}

          <Card>
            <BlockStack gap="300">
              <InlineStack align="space-between" gap="300" wrap>
                <BlockStack gap="100">
                  <Text as="h2" variant="headingLg">
                    {stats.queueDate}
                  </Text>
                  <Text as="p" tone="subdued">
                    Orders and automation are now based on each subscriber’s
                    individual schedule, not one shared monthly cutoff.
                  </Text>
                </BlockStack>

                <Badge tone="success">{stats.syncStatus}</Badge>
              </InlineStack>
            </BlockStack>
          </Card>

          <Layout>
            <Layout.Section>
              <BlockStack gap="500">
                <Card>
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingMd">
                      Queue Status
                    </Text>

                    <InlineStack gap="300" wrap>
                      <StatBox label="Due Today" value={stats.dueToday} />
                      <StatBox label="Due Tomorrow" value={stats.dueTomorrow} />
                      <StatBox
                        label="Pending Selections"
                        value={stats.pendingSelections}
                      />
                      <StatBox
                        label="Auto-Select Needed"
                        value={stats.autoSelectNeeded}
                      />
                      <StatBox label="Orders Ready" value={stats.ordersReady} />
                      <StatBox label="Needs Review" value={stats.needsReview} />
                    </InlineStack>
                  </BlockStack>
                </Card>

                <Card>
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingMd">
                      Daily Actions
                    </Text>

                    <InlineStack gap="300" wrap>
                      <Button
                        submit
                        loading={isSubmitting && intent === "send-reminders"}
                        onClick={() => setIntent("send-reminders")}
                      >
                        Send Reminders
                      </Button>

                      <Button
                        submit
                        loading={
                          isSubmitting && intent === "run-auto-selection"
                        }
                        onClick={() => setIntent("run-auto-selection")}
                      >
                        Run Auto-Selection
                      </Button>

                      <Button
                        submit
                        loading={isSubmitting && intent === "create-orders"}
                        onClick={() => setIntent("create-orders")}
                      >
                        Create Ready Orders
                      </Button>

                      <Button
                        submit
                        loading={isSubmitting && intent === "sync-now"}
                        onClick={() => setIntent("sync-now")}
                      >
                        Sync Now
                      </Button>

                      <Button url="/app/activity-log">View Logs</Button>
                    </InlineStack>

                    <Text as="p" tone="subdued">
                      These actions run against subscribers who are due based on
                      their individual subscription schedule.
                    </Text>
                  </BlockStack>
                </Card>

                <Card>
                  <BlockStack gap="400">
                    <InlineStack align="space-between" gap="300" wrap>
                      <Text as="h2" variant="headingMd">
                        Subscribers in Queue
                      </Text>

                      <div style={{ minWidth: "240px" }}>
                        <Select
                          label="Filter queue"
                          labelHidden
                          value={filter}
                          onChange={setFilter}
                          options={[
                            { label: "All", value: "all" },
                            { label: "Due Today", value: "due-today" },
                            { label: "Due Tomorrow", value: "due-tomorrow" },
                            {
                              label: "Pending Selection",
                              value: "pending-selection",
                            },
                            {
                              label: "Auto-Select Needed",
                              value: "auto-select-needed",
                            },
                            { label: "Order Ready", value: "order-ready" },
                            { label: "Needs Review", value: "needs-review" },
                          ]}
                        />
                      </div>
                    </InlineStack>

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
                        { title: "Next Ship Date" },
                        { title: "Selection Deadline" },
                        { title: "Auto-Select Date" },
                        { title: "Order Date" },
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
                          <IndexTable.Cell>{subscriber.nextShipDate}</IndexTable.Cell>
                          <IndexTable.Cell>
                            {subscriber.selectionDeadline}
                          </IndexTable.Cell>
                          <IndexTable.Cell>{subscriber.autoSelectDate}</IndexTable.Cell>
                          <IndexTable.Cell>
                            {subscriber.orderCreationDate}
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
                  </BlockStack>
                </Card>
              </BlockStack>
            </Layout.Section>

            <Layout.Section variant="oneThird">
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Queue Health
                  </Text>

                  <InfoRow label="Last reminder sent" value={stats.lastReminderSent} />
                  <InfoRow label="Last sync" value={stats.lastSync} />
                  <InfoRow
                    label="Automation mode"
                    value="Rolling daily schedule"
                  />

                  <Divider />

                  <Banner title="Daily Fulfillment" tone="info">
                    <p>
                      Each subscriber’s deadlines and ship dates are calculated
                      from their own subscription start date.
                    </p>
                  </Banner>
                </BlockStack>
              </Card>
            </Layout.Section>
          </Layout>
        </BlockStack>
      </Form>
    </Page>
  );
}

function StatBox({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <Box
      padding="300"
      background="bg-surface-secondary"
      borderRadius="200"
      minWidth="150px"
    >
      <BlockStack gap="100">
        <Text as="p" fontWeight="semibold">
          {label}
        </Text>
        <Text as="p" variant="headingMd">
          {value}
        </Text>
      </BlockStack>
    </Box>
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

function StatusBadge({ status }: { status: QueueStatus }) {
  if (status === "Due Today") {
    return <Badge tone="critical">Due Today</Badge>;
  }

  if (status === "Due Tomorrow") {
    return <Badge tone="attention">Due Tomorrow</Badge>;
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