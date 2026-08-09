import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";

import {
  useLoaderData,
} from "@remix-run/react";

import {
  useMemo,
  useState,
} from "react";

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

/* ============================================================
   SUBSCRIPTIONSYNC COLORS
   ============================================================ */

const COLORS = {
  navy: "#17233E",
  blue: "#294A78",
  tealBlue: "#2F7C89",

  pageBackground: "#F5F7FB",

  white: "#FFFFFF",

  softBlue: "#F4F8FC",
  softBlueStrong: "#EAF1F8",

  border: "#D9E2EC",
  borderBlue: "#C6D5E5",

  text: "#1F2937",
  muted: "#667085",

  numberBlue: "#244B78",
  accentBlue: "#356A9A",
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
  } =
    useLoaderData<typeof loader>();

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
            statusFilter ===
              "all" ||
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

  return (
    <div
      style={{
        background:
          COLORS.pageBackground,

        minHeight:
          "100vh",
      }}
    >
      <Page
        title="Activity Log"
        subtitle="View sync events, automation runs, reminders, order actions, and system errors."
        backAction={{
          content:
            "Dashboard",

          url:
            "/app",
        }}
      >
        <BlockStack gap="500">

          {/* ==================================================
              HERO
              ================================================== */}

          <div
            style={{
              background:
                `linear-gradient(
                  135deg,
                  ${COLORS.navy} 0%,
                  ${COLORS.blue} 62%,
                  ${COLORS.tealBlue} 100%
                )`,

              borderRadius:
                "18px",

              padding:
                "30px",

              boxShadow:
                "0 8px 26px rgba(23, 35, 62, 0.14)",

              color:
                COLORS.white,
            }}
          >
            <InlineStack
              align="space-between"
              gap="400"
              blockAlign="center"
              wrap
            >
              <div>
                <div
                  style={{
                    fontSize:
                      "12px",

                    fontWeight:
                      700,

                    letterSpacing:
                      "0.08em",

                    textTransform:
                      "uppercase",

                    color:
                      "#BFE8ED",

                    marginBottom:
                      "8px",
                  }}
                >
                  SubscriptionSync
                </div>

                <div
                  style={{
                    fontSize:
                      "27px",

                    fontWeight:
                      700,

                    lineHeight:
                      1.2,

                    marginBottom:
                      "8px",
                  }}
                >
                  Activity Log
                </div>

                <div
                  style={{
                    fontSize:
                      "14px",

                    lineHeight:
                      1.5,

                    color:
                      "#E8EEF7",

                    maxWidth:
                      "700px",
                  }}
                >
                  Review automation events,
                  sandbox actions, reminders,
                  fulfillment activity, and
                  system history in one place.
                </div>
              </div>

              <div
                style={{
                  background:
                    "rgba(255,255,255,0.12)",

                  border:
                    "1px solid rgba(255,255,255,0.20)",

                  borderRadius:
                    "999px",

                  padding:
                    "9px 15px",
                }}
              >
                <span
                  style={{
                    fontSize:
                      "13px",

                    fontWeight:
                      700,

                    color:
                      COLORS.white,
                  }}
                >
                  ● Sandbox Activity
                </span>
              </div>
            </InlineStack>
          </div>

          {/* ==================================================
              SNAPSHOT
              ================================================== */}

          <Card>
            <BlockStack gap="400">

              <BlockStack gap="100">
                <SectionHeading>
                  Activity Snapshot
                </SectionHeading>

                <Text
                  as="p"
                  variant="bodyMd"
                  tone="subdued"
                >
                  A quick view of the
                  activity currently recorded
                  by SubscriptionSync.
                </Text>
              </BlockStack>

              <InlineStack
                gap="300"
                wrap
              >
                <StatBox
                  label="Total Events"
                  value={
                    logs.length
                  }
                />

                <StatBox
                  label="Successful"
                  value={
                    successCount
                  }
                />

                <StatBox
                  label="Warnings"
                  value={
                    warningCount
                  }
                />

                <StatBox
                  label="Errors"
                  value={
                    errorCount
                  }
                />
              </InlineStack>

            </BlockStack>
          </Card>

          <Layout>
            <Layout.Section>

              <BlockStack gap="400">

                {/* =============================================
                    FILTERS
                    ============================================= */}

                <Card>
                  <BlockStack gap="400">

                    <BlockStack gap="100">
                      <SectionHeading>
                        Search & Filter
                      </SectionHeading>

                      <Text
                        as="p"
                        variant="bodyMd"
                        tone="subdued"
                      >
                        Use the activity log
                        to audit
                        SubscriptionSync
                        actions and
                        troubleshoot sandbox
                        workflows.
                      </Text>
                    </BlockStack>

                    <InlineStack
                      gap="300"
                      wrap
                    >
                      <div
                        style={{
                          minWidth:
                            "280px",

                          flex:
                            "1",
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
                            setSearchValue(
                              "",
                            )
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

                    <Text
                      as="p"
                      variant="bodySm"
                      tone="subdued"
                    >
                      {
                        filteredLogs.length
                      }{" "}
                      event
                      {filteredLogs.length ===
                      1
                        ? ""
                        : "s"}{" "}
                      shown
                    </Text>

                  </BlockStack>
                </Card>

                {/* =============================================
                    TABLE
                    ============================================= */}

                <Card padding="0">

                  {filteredLogs.length ===
                  0 ? (
                    <div
                      style={{
                        padding:
                          "36px",

                        textAlign:
                          "center",
                      }}
                    >
                      <BlockStack gap="150">

                        <Text
                          as="p"
                          variant="headingMd"
                        >
                          No activity found
                        </Text>

                        <Text
                          as="p"
                          variant="bodyMd"
                          tone="subdued"
                        >
                          No activity matches
                          the current search
                          and filters.
                        </Text>

                      </BlockStack>
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
                              {
                                formatDateTime(
                                  log.createdAt,
                                )
                              }
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

                </Card>

                <InlineStack
                  align="center"
                >
                  <Pagination
                    hasPrevious={
                      false
                    }
                    onPrevious={() => {}}
                    hasNext={
                      false
                    }
                    onNext={() => {}}
                  />
                </InlineStack>

              </BlockStack>

            </Layout.Section>
          </Layout>

        </BlockStack>
      </Page>
    </div>
  );
}

/* ============================================================
   SECTION HEADING
   ============================================================ */

function SectionHeading({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <InlineStack
      gap="200"
      blockAlign="center"
    >
      <div
        style={{
          width:
            "4px",

          height:
            "22px",

          borderRadius:
            "999px",

          background:
            COLORS.tealBlue,

          flexShrink:
            0,
        }}
      />

      <Text
        as="h2"
        variant="headingLg"
      >
        {children}
      </Text>

    </InlineStack>
  );
}

/* ============================================================
   STAT BOX
   ============================================================ */

function StatBox({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div
      style={{
        background:
          COLORS.softBlue,

        border:
          `1px solid ${COLORS.borderBlue}`,

        borderRadius:
          "14px",

        minWidth:
          "155px",

        padding:
          "17px 18px",

        boxShadow:
          "0 2px 8px rgba(41, 74, 120, 0.04)",
      }}
    >
      <div
        style={{
          fontSize:
            "12px",

          fontWeight:
            700,

          color:
            COLORS.muted,

          marginBottom:
            "7px",
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize:
            "27px",

          lineHeight:
            1,

          fontWeight:
            750,

          color:
            COLORS.numberBlue,
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