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

type SubscriptionStatus =
  | "Active"
  | "Paused"
  | "Cancelled"
  | "Reactivated";

type WorkflowStatus =
  | "Waiting for Selection"
  | "Selection Received"
  | "Auto-Select Needed"
  | "Order Ready"
  | "Ready for Fulfillment"
  | "Needs Review"
  | "Completed";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  const subscribers = await db.subscriber.findMany({
    orderBy: {
      updatedAt: "desc",
    },
    include: {
      tier: true,
      fulfillmentProfile: true,
    },
  });

  const fulfillmentProfiles = await db.fulfillmentProfile.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return json({
    subscribers,
    fulfillmentProfiles,
  });
};

export default function SubscriberListPage() {
  const { subscribers, fulfillmentProfiles } =
    useLoaderData<typeof loader>();

  const [searchValue, setSearchValue] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [subscriptionStatusFilter, setSubscriptionStatusFilter] =
    useState("all");
  const [workflowStatusFilter, setWorkflowStatusFilter] =
    useState("all");

  const filteredSubscribers = useMemo(() => {
    return subscribers.filter((subscriber) => {
      const search = searchValue.toLowerCase();

      const matchesSearch =
        subscriber.name.toLowerCase().includes(search) ||
        subscriber.email.toLowerCase().includes(search);

      const profileName =
        subscriber.fulfillmentProfile?.name ??
        subscriber.tier?.name ??
        "";

      const matchesTier =
        tierFilter === "all" || profileName === tierFilter;

      const matchesSubscriptionStatus =
        subscriptionStatusFilter === "all" ||
        subscriber.subscriptionStatus ===
          subscriptionStatusFilter;

      const matchesWorkflowStatus =
        workflowStatusFilter === "all" ||
        subscriber.workflowStatus === workflowStatusFilter;

      return (
        matchesSearch &&
        matchesTier &&
        matchesSubscriptionStatus &&
        matchesWorkflowStatus
      );
    });
  }, [
    subscribers,
    searchValue,
    tierFilter,
    subscriptionStatusFilter,
    workflowStatusFilter,
  ]);

  const stats = useMemo(() => {
    return {
      total: subscribers.length,

      active: subscribers.filter(
        (subscriber) =>
          subscriber.subscriptionStatus === "Active",
      ).length,

      waitingForSelection: subscribers.filter(
        (subscriber) =>
          subscriber.workflowStatus ===
          "Waiting for Selection",
      ).length,

      attention: subscribers.filter(
        (subscriber) =>
          subscriber.workflowStatus === "Needs Review" ||
          subscriber.workflowStatus ===
            "Auto-Select Needed",
      ).length,
    };
  }, [subscribers]);

  const tierOptions = [
    { label: "All tiers", value: "all" },
    ...fulfillmentProfiles.map((profile) => ({
      label: profile.name,
      value: profile.name,
    })),
  ];

  const subscriptionStatusOptions = [
    {
      label: "All subscription statuses",
      value: "all",
    },
    { label: "Active", value: "Active" },
    { label: "Paused", value: "Paused" },
    { label: "Cancelled", value: "Cancelled" },
    { label: "Reactivated", value: "Reactivated" },
  ];

  const workflowStatusOptions = [
    {
      label: "All workflow statuses",
      value: "all",
    },
    {
      label: "Waiting for Selection",
      value: "Waiting for Selection",
    },
    {
      label: "Selection Received",
      value: "Selection Received",
    },
    {
      label: "Auto-Select Needed",
      value: "Auto-Select Needed",
    },
    {
      label: "Order Ready",
      value: "Order Ready",
    },
    {
      label: "Ready for Fulfillment",
      value: "Ready for Fulfillment",
    },
    {
      label: "Needs Review",
      value: "Needs Review",
    },
    {
      label: "Completed",
      value: "Completed",
    },
  ];

  return (
    <div className="ss-dashboard">
      <Page
        title="Subscribers"
        subtitle="Monitor each subscriber's tier, Appstle subscription status, monthly selection workflow, and upcoming order schedule."
        backAction={{
          content: "Dashboard",
          url: "/app",
        }}
      >
        <Layout>
          <Layout.Section>
            <BlockStack gap="500">
              {/* PAGE INTRO */}
              <div className="ss-hero">
                <BlockStack gap="200">
                  <Text as="h2" variant="headingLg">
                    Subscription Operations
                  </Text>

                  <Text as="p" variant="bodyMd" tone="subdued">
                    Appstle manages the customer's subscription.
                    SubscriptionSync tracks what needs to happen next
                    for the customer's monthly selection and
                    fulfillment.
                  </Text>
                </BlockStack>
              </div>

              {/* SNAPSHOT */}
              <BlockStack gap="300">
                <BlockStack gap="100">
                  <div className="ss-section-accent" />

                  <Text as="h2" variant="headingLg">
                    Subscriber Snapshot
                  </Text>

                  <Text as="p" variant="bodyMd" tone="subdued">
                    A quick look at the current subscription
                    workload.
                  </Text>
                </BlockStack>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "16px",
                  }}
                >
                  <SubscriberMetric
                    label="Total subscribers"
                    value={stats.total}
                    className="ss-metric-blue"
                  />

                  <SubscriberMetric
                    label="Total active subscribers"
                    value={stats.active}
                    className="ss-metric-green"
                  />

                  <SubscriberMetric
                    label="Waiting for selection"
                    value={stats.waitingForSelection}
                    className="ss-metric-brand-blue"
                  />

                  <SubscriberMetric
                    label="Needs attention"
                    value={stats.attention}
                    className="ss-metric-gold"
                  />
                </div>
              </BlockStack>

              {/* SEARCH AND FILTERS */}
              <Card>
                <BlockStack gap="300">
                  <InlineStack
                    align="space-between"
                    blockAlign="center"
                    gap="300"
                    wrap
                  >
                    <BlockStack gap="100">
                      <Text as="h2" variant="headingMd">
                        Find Subscribers
                      </Text>

                      <Text
                        as="p"
                        variant="bodySm"
                        tone="subdued"
                      >
                        Search by customer name or email, then
                        narrow the list by tier, subscription
                        status, or workflow status.
                      </Text>
                    </BlockStack>

                    <Text
                      as="p"
                      variant="bodySm"
                      tone="subdued"
                    >
                      Showing {filteredSubscribers.length} of{" "}
                      {subscribers.length}
                    </Text>
                  </InlineStack>

                  <InlineStack gap="300" wrap>
                    <div
                      style={{
                        minWidth: "260px",
                        flex: "1 1 320px",
                      }}
                    >
                      <TextField
                        label="Search subscribers"
                        labelHidden
                        value={searchValue}
                        onChange={setSearchValue}
                        placeholder="Search by name or email"
                        autoComplete="off"
                        clearButton
                        onClearButtonClick={() =>
                          setSearchValue("")
                        }
                      />
                    </div>

                    <div
                      style={{
                        minWidth: "170px",
                        flex: "0 1 210px",
                      }}
                    >
                      <Select
                        label="Tier filter"
                        labelHidden
                        value={tierFilter}
                        onChange={setTierFilter}
                        options={tierOptions}
                      />
                    </div>

                    <div
                      style={{
                        minWidth: "200px",
                        flex: "0 1 230px",
                      }}
                    >
                      <Select
                        label="Subscription status filter"
                        labelHidden
                        value={subscriptionStatusFilter}
                        onChange={
                          setSubscriptionStatusFilter
                        }
                        options={
                          subscriptionStatusOptions
                        }
                      />
                    </div>

                    <div
                      style={{
                        minWidth: "210px",
                        flex: "0 1 240px",
                      }}
                    >
                      <Select
                        label="Workflow status filter"
                        labelHidden
                        value={workflowStatusFilter}
                        onChange={setWorkflowStatusFilter}
                        options={workflowStatusOptions}
                      />
                    </div>
                  </InlineStack>
                </BlockStack>
              </Card>

              {/* SUBSCRIBER TABLE */}
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
                    { title: "Tier" },
                    { title: "Next order" },
                    { title: "Selection deadline" },
                    { title: "Subscription" },
                    { title: "Workflow" },
                    { title: "" },
                  ]}
                >
                  {filteredSubscribers.map(
                    (subscriber, index) => {
                      const tierName =
                        subscriber.fulfillmentProfile?.name ??
                        subscriber.tier?.name ??
                        null;

                      const nextOperationalDate =
                        subscriber.nextOrderDate ??
                        subscriber.nextShipDate;

                      return (
                        <IndexTable.Row
                          id={subscriber.id}
                          key={subscriber.id}
                          position={index}
                        >
                          {/* CUSTOMER */}
                          <IndexTable.Cell>
                            <BlockStack gap="050">
                              <Link
                                to={`/app/subscriber-view/${subscriber.id}`}
                                style={{
                                  color: "inherit",
                                  textDecoration: "none",
                                }}
                              >
                                <Text
                                  as="span"
                                  fontWeight="semibold"
                                >
                                  {subscriber.name}
                                </Text>
                              </Link>

                              <Text
                                as="span"
                                variant="bodySm"
                                tone="subdued"
                              >
                                {subscriber.email}
                              </Text>
                            </BlockStack>
                          </IndexTable.Cell>

                          {/* TIER */}
                          <IndexTable.Cell>
                            {tierName ? (
                              <Badge>{tierName}</Badge>
                            ) : (
                              <Text
                                as="span"
                                variant="bodySm"
                                tone="subdued"
                              >
                                No tier
                              </Text>
                            )}
                          </IndexTable.Cell>

                          {/* NEXT ORDER */}
                          <IndexTable.Cell>
                            <BlockStack gap="050">
                              <Text as="span">
                                {formatDate(
                                  nextOperationalDate,
                                )}
                              </Text>

                              <Text
                                as="span"
                                variant="bodySm"
                                tone="subdued"
                              >
                                {getRelativeDate(
                                  nextOperationalDate,
                                )}
                              </Text>
                            </BlockStack>
                          </IndexTable.Cell>

                          {/* SELECTION DEADLINE */}
                          <IndexTable.Cell>
                            <BlockStack gap="050">
                              <Text as="span">
                                {formatDate(
                                  subscriber.nextSelectionDeadline,
                                )}
                              </Text>

                              <Text
                                as="span"
                                variant="bodySm"
                                tone="subdued"
                              >
                                {getRelativeDate(
                                  subscriber.nextSelectionDeadline,
                                )}
                              </Text>
                            </BlockStack>
                          </IndexTable.Cell>

                          {/* APPSTLE SUBSCRIPTION STATUS */}
                          <IndexTable.Cell>
                            <SubscriptionStatusBadge
                              status={
                                subscriber.subscriptionStatus as SubscriptionStatus
                              }
                            />
                          </IndexTable.Cell>

                          {/* SUBSCRIPTIONSYNC WORKFLOW STATUS */}
                          <IndexTable.Cell>
                            <WorkflowStatusBadge
                              status={
                                subscriber.workflowStatus as WorkflowStatus
                              }
                            />
                          </IndexTable.Cell>

                          {/* ACTION */}
                          <IndexTable.Cell>
                            <Link
                              to={`/app/subscriber-view/${subscriber.id}`}
                            >
                              View
                            </Link>
                          </IndexTable.Cell>
                        </IndexTable.Row>
                      );
                    },
                  )}
                </IndexTable>

                {filteredSubscribers.length === 0 && (
                  <div
                    style={{
                      padding: "32px",
                      textAlign: "center",
                    }}
                  >
                    <BlockStack gap="200">
                      <Text as="p" variant="headingMd">
                        No subscribers found
                      </Text>

                      <Text
                        as="p"
                        variant="bodyMd"
                        tone="subdued"
                      >
                        Try changing your search or filters.
                      </Text>
                    </BlockStack>
                  </div>
                )}
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </Page>
    </div>
  );
}

function SubscriberMetric({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className: string;
}) {
  return (
    <div className={`ss-metric-card ${className}`}>
      <BlockStack gap="150">
        <Text as="p" variant="bodyMd" tone="subdued">
          {label}
        </Text>

        <Text as="p" variant="heading2xl">
          {value}
        </Text>
      </BlockStack>
    </div>
  );
}

function SubscriptionStatusBadge({
  status,
}: {
  status: SubscriptionStatus;
}) {
  switch (status) {
    case "Active":
      return <Badge tone="success">Active</Badge>;

    case "Paused":
      return <Badge tone="attention">Paused</Badge>;

    case "Cancelled":
      return <Badge tone="critical">Cancelled</Badge>;

    case "Reactivated":
      return <Badge tone="info">Reactivated</Badge>;

    default:
      return <Badge>{status}</Badge>;
  }
}

function WorkflowStatusBadge({
  status,
}: {
  status: WorkflowStatus;
}) {
  switch (status) {
    case "Waiting for Selection":
      return (
        <Badge tone="info">Waiting for Selection</Badge>
      );

    case "Selection Received":
      return (
        <Badge tone="success">Selection Received</Badge>
      );

    case "Auto-Select Needed":
      return (
        <Badge tone="attention">
          Auto-Select Needed
        </Badge>
      );

    case "Order Ready":
      return <Badge tone="success">Order Ready</Badge>;

    case "Ready for Fulfillment":
      return (
        <Badge tone="success">
          Ready for Fulfillment
        </Badge>
      );

    case "Needs Review":
      return (
        <Badge tone="critical">Needs Review</Badge>
      );

    case "Completed":
      return <Badge>Completed</Badge>;

    default:
      return <Badge>{status}</Badge>;
  }
}

function formatDate(date: string | Date | null) {
  if (!date) return "Not set";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

function getRelativeDate(date: string | Date | null) {
  if (!date) return "";

  const target = new Date(date);
  const today = new Date();

  target.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const difference = Math.round(
    (target.getTime() - today.getTime()) /
      (1000 * 60 * 60 * 24),
  );

  if (difference === 0) return "Today";
  if (difference === 1) return "Tomorrow";
  if (difference === -1) return "Yesterday";

  if (difference > 1) {
    return `In ${difference} days`;
  }

  return `${Math.abs(difference)} days ago`;
}