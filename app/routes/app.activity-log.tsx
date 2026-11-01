import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";

import {
  Link,
  useLoaderData,
} from "@remix-run/react";

import {
  useMemo,
  useState,
} from "react";

import {
  Badge,
  BlockStack,
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

/* ============================================================
   SUBSCRIPTIONSYNC DESIGN SYSTEM
   ============================================================ */

const COLORS = {
  // Main surfaces
  page: "#F7F7F4",
  white: "#FFFFFF",

  // Typography
  text: "#20221F",
  textSoft: "#52574F",
  muted: "#787D75",

  // Sage
  sage: "#687A6C",
  sageDark: "#4D5E51",
  sageDeep: "#39483D",
  sageSoft: "#EEF1ED",
  sageSoftStrong: "#E4EAE3",

  // Warm neutral
  cream: "#F5F1E8",
  creamStrong: "#E9E1D3",
  warmText: "#705F42",

  // Borders
  border: "#E4E5DF",
  borderStrong: "#D6D8D2",

  // Status surfaces
  attentionSoft: "#F7F0E2",
  attentionBorder: "#E9D6AE",
  successSoft: "#EDF3ED",
  successBorder: "#CDDCCF",
  criticalSoft: "#F8EDEC",
  criticalBorder: "#E8C7C4",
};

/* ============================================================
   TYPES
   ============================================================ */

type LogStatus =
  | "Success"
  | "Warning"
  | "Error";

/* ============================================================
   LOADER
   ============================================================ */

export const loader = async ({
  request,
}: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  const logs =
    await db.activityLog.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

  return json({
    logs,
  });
};

/* ============================================================
   PAGE
   ============================================================ */

export default function ActivityLogPage() {
  const {
    logs,
  } = useLoaderData<typeof loader>();

  const [
    searchValue,
    setSearchValue,
  ] = useState("");

  const [
    typeFilter,
    setTypeFilter,
  ] = useState("all");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("all");

  /* ==========================================================
     FILTERS
     ========================================================== */

  const filteredLogs =
    useMemo(() => {
      return logs.filter(
        (log) => {
          const search =
            searchValue
              .trim()
              .toLowerCase();

          const matchesSearch =
            search === "" ||
            log.description
              .toLowerCase()
              .includes(search) ||
            log.user
              .toLowerCase()
              .includes(search) ||
            log.source
              .toLowerCase()
              .includes(search) ||
            log.eventType
              .toLowerCase()
              .includes(search);

          const matchesType =
            typeFilter === "all" ||
            log.eventType ===
              typeFilter;

          const matchesStatus =
            statusFilter === "all" ||
            log.status ===
              statusFilter;

          return (
            matchesSearch &&
            matchesType &&
            matchesStatus
          );
        },
      );
    }, [
      logs,
      searchValue,
      typeFilter,
      statusFilter,
    ]);

  const successCount =
    logs.filter(
      (log) =>
        log.status ===
        "Success",
    ).length;

  const warningCount =
    logs.filter(
      (log) =>
        log.status ===
        "Warning",
    ).length;

  const errorCount =
    logs.filter(
      (log) =>
        log.status ===
        "Error",
    ).length;

  const attentionCount =
    warningCount + errorCount;

  return (
    <div
      style={{
        background: COLORS.page,
        minHeight: "100vh",
      }}
    >
      <Page
        title="Activity Log"
        subtitle="Review automation, sync, reminder, fulfillment, and system events."
        backAction={{
          content: "Dashboard",
          url: "/app",
        }}
      >
        <BlockStack gap="600">

          {/* Main navigation */}
          <nav
            aria-label="SubscriptionSync navigation"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
              marginBottom: "18px",
            }}
          >
            {[
              { label: "Home", to: "/app" },
              { label: "Subscribers", to: "/app/subscriber-list" },
              { label: "Activity", to: "/app/activity-log" },
              { label: "Settings", to: "/app/settings" },
            ].map((item) => (
              <Link
                key={item.label}
                to={item.to}
                aria-current={
                  item.label === "Activity" ? "page" : undefined
                }
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "9px 14px",
                  borderRadius: "10px",
                  border: "1px solid #D6DDE5",
                  background:
                    item.label === "Activity"
                      ? "#E6EDF5"
                      : "#FFFFFF",
                  color: "#43566D",
                  fontSize: "13px",
                  fontWeight: 650,
                  textDecoration: "none",
                }}
              >
                {item.label} →
              </Link>
            ))}
          </nav>

          {/* ==================================================
              FILTERS
              ================================================== */}

          <div
            style={{
              background:
                COLORS.white,

              border:
                `1px solid ${COLORS.border}`,

              borderRadius:
                "18px",

              padding:
                "22px 24px",

              boxShadow:
                "0 2px 8px rgba(32,34,31,0.025)",
            }}
          >
            <BlockStack gap="400">

              <InlineStack
                align="space-between"
                blockAlign="end"
                gap="400"
                wrap
              >
                <SectionHeader
                  eyebrow="Audit tools"
                  title="Search & filter"
                  description="Narrow the activity history by keyword, event type, or status."
                />

                <div
                  style={{
                    background:
                      COLORS.sageSoft,

                    border:
                      `1px solid ${COLORS.sageSoftStrong}`,

                    borderRadius:
                      "999px",

                    padding:
                      "7px 12px",

                    color:
                      COLORS.sageDark,

                    fontSize: "12px",
                    fontWeight: 700,

                    whiteSpace:
                      "nowrap",
                  }}
                >
                  {filteredLogs.length} shown
                </div>
              </InlineStack>

              <InlineStack
                gap="300"
                wrap
              >
                <div
                  style={{
                    minWidth:
                      "280px",

                    flex: "1",
                  }}
                >
                  <TextField
                    label="Search logs"
                    labelHidden

                    value={
                      searchValue
                    }

                    onChange={
                      setSearchValue
                    }

                    placeholder="Search description, user, source, or type..."

                    autoComplete="off"

                    clearButton

                    onClearButtonClick={() =>
                      setSearchValue("")
                    }
                  />
                </div>

                <div
                  style={{
                    minWidth:
                      "180px",
                  }}
                >
                  <Select
                    label="Type filter"
                    labelHidden

                    value={
                      typeFilter
                    }

                    onChange={
                      setTypeFilter
                    }

                    options={[
                      {
                        label:
                          "All types",
                        value:
                          "all",
                      },

                      {
                        label:
                          "Sync",
                        value:
                          "Sync",
                      },

                      {
                        label:
                          "Auto-Select",
                        value:
                          "Auto-Select",
                      },

                      {
                        label:
                          "Reminder",
                        value:
                          "Reminder",
                      },

                      {
                        label:
                          "Order",
                        value:
                          "Order",
                      },

                      {
                        label:
                          "Settings",
                        value:
                          "Settings",
                      },

                      {
                        label:
                          "Quick Submit",
                        value:
                          "Quick Submit",
                      },

                      {
                        label:
                          "Daily Queue",
                        value:
                          "Daily Queue",
                      },
                    ]}
                  />
                </div>

                <div
                  style={{
                    minWidth:
                      "180px",
                  }}
                >
                  <Select
                    label="Status filter"
                    labelHidden

                    value={
                      statusFilter
                    }

                    onChange={
                      setStatusFilter
                    }

                    options={[
                      {
                        label:
                          "All statuses",
                        value:
                          "all",
                      },

                      {
                        label:
                          "Success",
                        value:
                          "Success",
                      },

                      {
                        label:
                          "Warning",
                        value:
                          "Warning",
                      },

                      {
                        label:
                          "Error",
                        value:
                          "Error",
                      },
                    ]}
                  />
                </div>
              </InlineStack>
            </BlockStack>
          </div>

          {/* ==================================================
              ACTIVITY TABLE
              ================================================== */}

          <Layout>
            <Layout.Section>
              <div
                style={{
                  background:
                    COLORS.white,

                  border:
                    `1px solid ${COLORS.border}`,

                  borderRadius:
                    "18px",

                  overflow:
                    "hidden",

                  boxShadow:
                    "0 2px 8px rgba(32,34,31,0.025)",
                }}
              >
                <div
                  style={{
                    padding:
                      "20px 22px",

                    borderBottom:
                      `1px solid ${COLORS.border}`,
                  }}
                >
                  <SectionHeader
                    eyebrow="History"
                    title="Recorded events"
                    description="The most recent SubscriptionSync activity appears first."
                  />
                </div>

                {filteredLogs.length ===
                0 ? (
                  <div
                    style={{
                      padding:
                        "42px 28px",

                      textAlign:
                        "center",

                      background:
                        COLORS.page,
                    }}
                  >
                    <div
                      style={{
                        fontSize:
                          "16px",

                        fontWeight:
                          650,

                        color:
                          COLORS.text,

                        marginBottom:
                          "6px",
                      }}
                    >
                      No activity found
                    </div>

                    <div
                      style={{
                        fontSize:
                          "13px",

                        lineHeight:
                          1.5,

                        color:
                          COLORS.muted,
                      }}
                    >
                      No activity matches the
                      current search and filters.
                    </div>
                  </div>
                ) : (
                  <IndexTable
                    resourceName={{
                      singular:
                        "log",

                      plural:
                        "logs",
                    }}

                    itemCount={
                      filteredLogs.length
                    }

                    selectable={
                      false
                    }

                    headings={[
                      {
                        title:
                          "Timestamp",
                      },

                      {
                        title:
                          "Type",
                      },

                      {
                        title:
                          "Description",
                      },

                      {
                        title:
                          "Status",
                      },

                      {
                        title:
                          "User",
                      },

                      {
                        title:
                          "Source",
                      },
                    ]}
                  >
                    {filteredLogs.map(
                      (
                        log,
                        index,
                      ) => (
                        <IndexTable.Row
                          id={
                            log.id
                          }

                          key={
                            log.id
                          }

                          position={
                            index
                          }
                        >
                          <IndexTable.Cell>
                            <Text
                              as="span"
                              tone="subdued"
                            >
                              {formatDateTime(
                                log.createdAt,
                              )}
                            </Text>
                          </IndexTable.Cell>

                          <IndexTable.Cell>
                            <Text
                              as="span"
                              fontWeight="semibold"
                            >
                              {
                                log.eventType
                              }
                            </Text>
                          </IndexTable.Cell>

                          <IndexTable.Cell>
                            {
                              log.description
                            }
                          </IndexTable.Cell>

                          <IndexTable.Cell>
                            <StatusBadge
                              status={
                                log.status as LogStatus
                              }
                            />
                          </IndexTable.Cell>

                          <IndexTable.Cell>
                            {
                              log.user
                            }
                          </IndexTable.Cell>

                          <IndexTable.Cell>
                            {
                              log.source
                            }
                          </IndexTable.Cell>
                        </IndexTable.Row>
                      ),
                    )}
                  </IndexTable>
                )}
              </div>

              <InlineStack
                align="center"
              >
                <Pagination
                  hasPrevious={false}
                  onPrevious={() => {}}
                  hasNext={false}
                  onNext={() => {}}
                />
              </InlineStack>
            </Layout.Section>
          </Layout>

          <div style={{ height: "20px" }} />
        </BlockStack>
      </Page>
    </div>
  );
}

/* ============================================================
   SECTION HEADER
   ============================================================ */

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: "10px",

          fontWeight: 700,

          letterSpacing:
            "0.11em",

          textTransform:
            "uppercase",

          color:
            COLORS.sage,

          marginBottom:
            "6px",
        }}
      >
        {eyebrow}
      </div>

      <div
        style={{
          fontSize: "20px",

          fontWeight: 650,

          letterSpacing:
            "-0.015em",

          color:
            COLORS.text,

          marginBottom:
            "5px",
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: "13px",

          lineHeight: 1.5,

          color:
            COLORS.muted,

          maxWidth:
            "700px",
        }}
      >
        {description}
      </div>
    </div>
  );
}

/* ============================================================
   ACTIVITY METRIC
   ============================================================ */

function ActivityMetric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?:
    | "neutral"
    | "success"
    | "attention"
    | "critical";
}) {
  const palette = {
    neutral: {
      background:
        COLORS.white,

      border:
        COLORS.border,

      label:
        COLORS.muted,
    },

    success: {
      background:
        COLORS.successSoft,

      border:
        COLORS.successBorder,

      label:
        COLORS.sageDark,
    },

    attention: {
      background:
        COLORS.attentionSoft,

      border:
        COLORS.attentionBorder,

      label:
        COLORS.warmText,
    },

    critical: {
      background:
        COLORS.criticalSoft,

      border:
        COLORS.criticalBorder,

      label:
        "#7B4A46",
    },
  }[tone];

  return (
    <div
      style={{
        background:
          palette.background,

        border:
          `1px solid ${palette.border}`,

        borderRadius:
          "15px",

        padding:
          "18px 19px",

        minHeight:
          "112px",

        boxShadow:
          "0 1px 2px rgba(32,34,31,0.02)",
      }}
    >
      <div
        style={{
          fontSize: "10px",

          fontWeight: 700,

          letterSpacing:
            "0.07em",

          textTransform:
            "uppercase",

          color:
            palette.label,

          marginBottom:
            "13px",
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: "30px",

          lineHeight: 1,

          fontWeight: 650,

          letterSpacing:
            "-0.04em",

          color:
            COLORS.text,
        }}
      >
        {value}
      </div>
    </div>
  );
}

/* ============================================================
   STATUS BADGE
   ============================================================ */

function StatusBadge({
  status,
}: {
  status:
    LogStatus;
}) {
  if (
    status ===
    "Success"
  ) {
    return (
      <Badge tone="success">
        Success
      </Badge>
    );
  }

  if (
    status ===
    "Warning"
  ) {
    return (
      <Badge tone="warning">
        Warning
      </Badge>
    );
  }

  return (
    <Badge tone="critical">
      Error
    </Badge>
  );
}

/* ============================================================
   DATE
   ============================================================ */

function formatDateTime(
  date:
    | string
    | Date
    | null,
) {
  if (!date) {
    return "Not available";
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month:
        "short",

      day:
        "numeric",

      year:
        "numeric",

      hour:
        "numeric",

      minute:
        "2-digit",
    },
  ).format(
    new Date(date),
  );
}