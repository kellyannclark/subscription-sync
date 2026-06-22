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
import db from "../db.server";

type LogStatus = "Success" | "Warning" | "Error";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  const logs = await db.activityLog.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  return json({ logs });
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

      const matchesType =
        typeFilter === "all" || log.eventType === typeFilter;

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
                        { label: "Settings", value: "Settings" },
                        { label: "Quick Submit", value: "Quick Submit" },
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
                    <IndexTable.Cell>
                      {formatDateTime(log.createdAt)}
                    </IndexTable.Cell>

                    <IndexTable.Cell>{log.eventType}</IndexTable.Cell>

                    <IndexTable.Cell>{log.description}</IndexTable.Cell>

                    <IndexTable.Cell>
                      <StatusBadge status={log.status as LogStatus} />
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

function formatDateTime(date: string | Date | null) {
  if (!date) return "Not available";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}