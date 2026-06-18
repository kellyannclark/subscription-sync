import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useMemo, useState } from "react";
import {
  Badge,
  BlockStack,
  Card,
  IndexTable,
  InlineStack,
  Layout,
  Page,
  Pagination,
  Select,
  Text,
  TextField,
} from "@shopify/polaris";

import { authenticate } from "../shopify.server";

type LogStatus = "Success" | "Warning" | "Error";

type ActivityLog = {
  id: string;
  timestamp: string;
  type: string;
  description: string;
  status: LogStatus;
  user: string;
  source: string;
};

const mockLogs: ActivityLog[] = [
  {
    id: "1",
    timestamp: "Oct 9, 10:34 AM",
    type: "Sync",
    description: "Pulled 245 subscribers from Appstle",
    status: "Success",
    user: "System",
    source: "Appstle",
  },
  {
    id: "2",
    timestamp: "Oct 9, 10:36 AM",
    type: "Auto-Select",
    description: "Assigned 15 products to pending subscribers",
    status: "Success",
    user: "System",
    source: "SubscriptionSync",
  },
  {
    id: "3",
    timestamp: "Oct 9, 10:38 AM",
    type: "Reminder",
    description: "Sent reminder emails to 43 subscribers",
    status: "Success",
    user: "Kelly Clark",
    source: "Email Service",
  },
  {
    id: "4",
    timestamp: "Oct 9, 10:40 AM",
    type: "Sync",
    description: "Failed to push order #302 to Shopify",
    status: "Error",
    user: "System",
    source: "Shopify",
  },
  {
    id: "5",
    timestamp: "Oct 9, 11:15 AM",
    type: "Order",
    description: "Created 12 ready orders from the daily queue",
    status: "Success",
    user: "System",
    source: "Shopify",
  },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  return json({ logs: mockLogs });
};

export default function ActivityLogPage() {
  const { logs } = useLoaderData<typeof loader>();

  const [searchValue, setSearchValue] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        log.description.toLowerCase().includes(searchValue.toLowerCase()) ||
        log.user.toLowerCase().includes(searchValue.toLowerCase()) ||
        log.source.toLowerCase().includes(searchValue.toLowerCase());

      const matchesType = typeFilter === "all" || log.type === typeFilter;
      const matchesStatus =
        statusFilter === "all" || log.status === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [logs, searchValue, typeFilter, statusFilter]);

  return (
    <Page
      title="Activity Log"
      subtitle="View sync events, automation runs, reminders, order actions, and system errors."
      backAction={{ content: "Dashboard", url: "/app" }}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            <Card>
              <BlockStack gap="400">
                <Text as="p" tone="subdued">
                  Use the activity log to audit SubscriptionSync actions and
                  troubleshoot Shopify, Appstle, email, or automation issues.
                </Text>

                <InlineStack gap="300" wrap>
                  <div style={{ minWidth: "280px" }}>
                    <TextField
                      label="Search logs"
                      labelHidden
                      value={searchValue}
                      onChange={setSearchValue}
                      placeholder="Search logs"
                      autoComplete="off"
                    />
                  </div>

                  <div style={{ minWidth: "180px" }}>
                    <Select
                      label="Type filter"
                      labelHidden
                      value={typeFilter}
                      onChange={setTypeFilter}
                      options={[
                        { label: "All types", value: "all" },
                        { label: "Sync", value: "Sync" },
                        { label: "Auto-Select", value: "Auto-Select" },
                        { label: "Reminder", value: "Reminder" },
                        { label: "Order", value: "Order" },
                      ]}
                    />
                  </div>

                  <div style={{ minWidth: "180px" }}>
                    <Select
                      label="Status filter"
                      labelHidden
                      value={statusFilter}
                      onChange={setStatusFilter}
                      options={[
                        { label: "All statuses", value: "all" },
                        { label: "Success", value: "Success" },
                        { label: "Warning", value: "Warning" },
                        { label: "Error", value: "Error" },
                      ]}
                    />
                  </div>
                </InlineStack>
              </BlockStack>
            </Card>

            <Card padding="0">
              <IndexTable
                resourceName={{
                  singular: "log",
                  plural: "logs",
                }}
                itemCount={filteredLogs.length}
                selectable={false}
                headings={[
                  { title: "Timestamp" },
                  { title: "Type" },
                  { title: "Description" },
                  { title: "Status" },
                  { title: "User" },
                  { title: "Source" },
                ]}
              >
                {filteredLogs.map((log, index) => (
                  <IndexTable.Row id={log.id} key={log.id} position={index}>
                    <IndexTable.Cell>{log.timestamp}</IndexTable.Cell>
                    <IndexTable.Cell>{log.type}</IndexTable.Cell>
                    <IndexTable.Cell>{log.description}</IndexTable.Cell>
                    <IndexTable.Cell>
                      <StatusBadge status={log.status} />
                    </IndexTable.Cell>
                    <IndexTable.Cell>{log.user}</IndexTable.Cell>
                    <IndexTable.Cell>{log.source}</IndexTable.Cell>
                  </IndexTable.Row>
                ))}
              </IndexTable>
            </Card>

            <InlineStack align="center">
              <Pagination
                hasPrevious={false}
                onPrevious={() => {}}
                hasNext={false}
                onNext={() => {}}
              />
            </InlineStack>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

function StatusBadge({ status }: { status: LogStatus }) {
  if (status === "Success") {
    return <Badge tone="success">Success</Badge>;
  }

  if (status === "Warning") {
    return <Badge tone="attention">Warning</Badge>;
  }

  return <Badge tone="critical">Error</Badge>;
}