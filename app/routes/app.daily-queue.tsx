import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
} from "@remix-run/node";

import { json } from "@remix-run/node";

import {
  Form,
  Link,
  useActionData,
  useLoaderData,
  useNavigation,
} from "@remix-run/react";

import {
  useMemo,
  useState,
} from "react";

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
import db from "../db.server";

/* ============================================================
   SUBSCRIPTIONSYNC BRAND COLORS
   ============================================================ */

const COLORS = {
  navy: "#17233E",
  blue: "#294A78",
  tealBlue: "#2F7C89",

  pageBackground: "#F5F7FB",

  softBlue: "#F4F8FC",
  softBlueStrong: "#EAF1F8",

  border: "#D9E2EC",
  borderBlue: "#C6D5E5",

  text: "#1F2937",
  muted: "#667085",

  numberBlue: "#244B78",
  accentBlue: "#356A9A",

  white: "#FFFFFF",
};

/* ============================================================
   TYPES
   ============================================================ */

type QueueStatus =
  | "Due Today"
  | "Due Tomorrow"
  | "Pending Selection"
  | "Auto-Select Needed"
  | "Order Ready"
  | "Fulfilled"
  | "Needs Review";

type QueueSubscriber = {
  id: string;
  name: string;
  email: string;

  fulfillmentProfile: string;

  nextShipDate: string;
  selectionDeadline: string;
  autoSelectDate: string;
  orderCreationDate: string;

  workflowStatus: string;
  status: QueueStatus;
};

type QueueStats = {
  queueDate: string;

  dueToday: number;
  dueTomorrow: number;
  pendingSelections: number;
  autoSelectNeeded: number;
  ordersReady: number;
  fulfilled: number;
  needsReview: number;

  lastReminderSent: string;
  lastSync: string;

  syncStatus:
    | "Connected"
    | "Warning"
    | "Error";
};

/* ============================================================
   LOADER
   ============================================================ */

export const loader = async ({
  request,
}: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  const subscribers =
    await db.subscriber.findMany({
      orderBy: {
        nextShipDate: "asc",
      },

      include: {
        fulfillmentProfile: true,

        preferenceSubmissions: {
          orderBy: {
            submittedAt: "desc",
          },
          take: 1,
        },

        selections: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },

        shipments: {
          orderBy: {
            shipDate: "desc",
          },
          take: 1,
        },
      },
    });

  const [
    lastReminder,
    lastSync,
  ] = await Promise.all([
    db.activityLog.findFirst({
      where: {
        eventType: "Reminder",
      },

      orderBy: {
        createdAt: "desc",
      },
    }),

    db.activityLog.findFirst({
      where: {
        eventType: "Sync",
      },

      orderBy: {
        createdAt: "desc",
      },
    }),
  ]);

  const queueSubscribers: QueueSubscriber[] =
    subscribers.map(
      (subscriber) => {
        const latestSelection =
          subscriber.selections[0];

        const latestShipment =
          subscriber.shipments[0];

        const status =
          getQueueStatus({
            subscriptionStatus:
              subscriber.subscriptionStatus,

            workflowStatus:
              subscriber.workflowStatus,

            nextShipDate:
              subscriber.nextShipDate,

            selectionDeadline:
              subscriber.nextSelectionDeadline,

            autoSelectionDate:
              subscriber.autoSelectionDate,

            hasSelection:
              Boolean(
                latestSelection,
              ),

            hasShipment:
              Boolean(
                latestShipment,
              ),

            latestShipmentStatus:
              latestShipment?.status ??
              null,
          });

        return {
          id:
            subscriber.id,

          name:
            subscriber.name,

          email:
            subscriber.email,

          fulfillmentProfile:
            subscriber
              .fulfillmentProfile
              ?.name ??
            "No Profile",

          nextShipDate:
            formatDate(
              subscriber.nextShipDate,
            ),

          selectionDeadline:
            formatDate(
              subscriber
                .nextSelectionDeadline,
            ),

          autoSelectDate:
            formatDate(
              subscriber
                .autoSelectionDate,
            ),

          orderCreationDate:
            formatDate(
              getOrderCreationDate(
                subscriber
                  .nextShipDate,
              ),
            ),

          workflowStatus:
            subscriber
              .workflowStatus,

          status,
        };
      },
    );

  const stats: QueueStats = {
    queueDate:
      "Today’s Fulfillment Queue",

    dueToday:
      queueSubscribers.filter(
        (item) =>
          item.status ===
          "Due Today",
      ).length,

    dueTomorrow:
      queueSubscribers.filter(
        (item) =>
          item.status ===
          "Due Tomorrow",
      ).length,

    pendingSelections:
      queueSubscribers.filter(
        (item) =>
          item.status ===
          "Pending Selection",
      ).length,

    autoSelectNeeded:
      queueSubscribers.filter(
        (item) =>
          item.status ===
          "Auto-Select Needed",
      ).length,

    ordersReady:
      queueSubscribers.filter(
        (item) =>
          item.status ===
          "Order Ready",
      ).length,

    fulfilled:
      queueSubscribers.filter(
        (item) =>
          item.status ===
          "Fulfilled",
      ).length,

    needsReview:
      queueSubscribers.filter(
        (item) =>
          item.status ===
          "Needs Review",
      ).length,

    lastReminderSent:
      lastReminder
        ? formatDateTime(
            lastReminder.createdAt,
          )
        : "None yet",

    lastSync:
      lastSync
        ? formatDateTime(
            lastSync.createdAt,
          )
        : "Local sandbox data",

    syncStatus:
      "Connected",
  };

  return json({
    stats,
    queueSubscribers,
  });
};

/* ============================================================
   ACTION
   ============================================================ */

export const action = async ({
  request,
}: ActionFunctionArgs) => {
  await authenticate.admin(request);

  const formData =
    await request.formData();

  const intent =
    formData.get("intent");

  /* ==========================================================
     SEND REMINDERS
     ========================================================== */

  if (
    intent ===
    "send-reminders"
  ) {
    const reminderSubscribers =
      await db.subscriber.findMany({
        where: {
          subscriptionStatus:
            "Active",

          workflowStatus:
            "Waiting for Selection",

          selections: {
            none: {},
          },
        },

        orderBy: {
          nextSelectionDeadline:
            "asc",
        },
      });

    await db.$transaction(
      async (tx) => {
        for (
          const subscriber of
          reminderSubscribers
        ) {
          await tx.activityLog.create({
            data: {
              eventType:
                "Reminder",

              description:
                `Reminder prepared for ${subscriber.name} (${subscriber.email}) before selection deadline ${formatDate(
                  subscriber.nextSelectionDeadline,
                )}.`,

              status:
                "Success",

              user:
                "Admin",

              source:
                "Daily Queue",
            },
          });

          await tx.subscriber.update({
            where: {
              id:
                subscriber.id,
            },

            data: {
              selectionEmailSentAt:
                new Date(),
            },
          });
        }

        await tx.activityLog.create({
          data: {
            eventType:
              "Reminder",

            description:
              `Prepared ${reminderSubscribers.length} sandbox reminder(s) from the Daily Queue.`,

            status:
              "Success",

            user:
              "Admin",

            source:
              "Daily Queue",
          },
        });
      },
    );

    return json({
      success:
        true,

      message:
        `Prepared ${reminderSubscribers.length} reminder(s). No live email was sent.`,
    });
  }

  /* ==========================================================
     RUN AUTO-SELECTION
     ========================================================== */

  if (
    intent ===
    "run-auto-selection"
  ) {
    const today =
      endOfDay(
        new Date(),
      );

    const eligibleSubscribers =
      await db.subscriber.findMany({
        where: {
          subscriptionStatus:
            "Active",

          workflowStatus:
            "Waiting for Selection",

          fulfillmentProfileId: {
            not: null,
          },

          selections: {
            none: {},
          },

          OR: [
            {
              autoSelectionDate: {
                lte: today,
              },
            },

            {
              nextSelectionDeadline: {
                lte: today,
              },
            },
          ],
        },

        include: {
          fulfillmentProfile: {
            include: {
              products: {
                where: {
                  isActive: true,
                },

                include: {
                  variants: {
                    where: {
                      isActive: true,
                    },
                  },
                },
              },
            },
          },
        },

        orderBy: {
          autoSelectionDate:
            "asc",
        },
      });

    let createdSelections = 0;
    let skippedSubscribers = 0;

    await db.$transaction(
      async (tx) => {
        for (
          const subscriber of
          eligibleSubscribers
        ) {
          const eligibleProduct =
            subscriber
              .fulfillmentProfile
              ?.products
              .find(
                (product) =>
                  product.variants
                    .length > 0,
              );

          if (!eligibleProduct) {
            skippedSubscribers += 1;

            await tx.activityLog.create({
              data: {
                eventType:
                  "Auto-Select",

                description:
                  `Skipped ${subscriber.name}: ${subscriber.fulfillmentProfile?.name ?? "fulfillment profile"} has no eligible SKUs configured.`,

                status:
                  "Warning",

                user:
                  "Admin",

                source:
                  "Daily Queue",
              },
            });

            continue;
          }

          await tx.selection.create({
            data: {
              subscriberId:
                subscriber.id,

              month:
                getMonthLabel(
                  subscriber.nextShipDate,
                ),

              productName:
                eligibleProduct
                  .productName,

              status:
                "Auto Selected",

              source:
                "Daily Queue",

              notes:
                "Sandbox auto-selection from configured Fulfillment Profile.",
            },
          });

          await tx.subscriber.update({
            where: {
              id:
                subscriber.id,
            },

            data: {
              workflowStatus:
                "Auto Selected",
            },
          });

          await tx.activityLog.create({
            data: {
              eventType:
                "Auto-Select",

              description:
                `${subscriber.name} was auto-selected for ${eligibleProduct.productName} from ${subscriber.fulfillmentProfile?.name ?? "their fulfillment profile"}.`,

              status:
                "Success",

              user:
                "Admin",

              source:
                "Daily Queue",
            },
          });

          createdSelections += 1;
        }

        await tx.activityLog.create({
          data: {
            eventType:
              "Auto-Select",

            description:
              `Daily auto-selection completed: ${createdSelections} selected, ${skippedSubscribers} skipped.`,

            status:
              skippedSubscribers > 0
                ? "Warning"
                : "Success",

            user:
              "Admin",

            source:
              "Daily Queue",
          },
        });
      },
    );

    return json({
      success:
        true,

      message:
        `Auto-selection completed. ${createdSelections} subscriber(s) selected and ${skippedSubscribers} skipped.`,
    });
  }

  /* ==========================================================
     CREATE READY ORDERS
     ========================================================== */

  if (
    intent ===
    "create-orders"
  ) {
    const readySubscribers =
      await db.subscriber.findMany({
        where: {
          subscriptionStatus:
            "Active",

          workflowStatus: {
            in: [
              "Selection Submitted",
              "Auto Selected",
              "Ready for Fulfillment",
            ],
          },

          selections: {
            some: {},
          },

          shipments: {
            none: {},
          },
        },

        include: {
          selections: {
            orderBy: {
              createdAt:
                "desc",
            },

            take: 1,
          },
        },

        orderBy: {
          nextShipDate:
            "asc",
        },
      });

    await db.$transaction(
      async (tx) => {
        for (
          const subscriber of
          readySubscribers
        ) {
          const latestSelection =
            subscriber
              .selections[0];

          await tx.shipment.create({
            data: {
              subscriberId:
                subscriber.id,

              shipDate:
                subscriber
                  .nextShipDate,

              status:
                "Pending",

              productName:
                latestSelection
                  ?.productName ??
                "Manual selection",

              notes:
                "Sandbox shipment created from Daily Queue.",
            },
          });

          await tx.subscriber.update({
            where: {
              id:
                subscriber.id,
            },

            data: {
              workflowStatus:
                "Ready for Fulfillment",
            },
          });

          await tx.activityLog.create({
            data: {
              eventType:
                "Order",

              description:
                `Prepared sandbox fulfillment record for ${subscriber.name}.`,

              status:
                "Success",

              user:
                "Admin",

              source:
                "Daily Queue",
            },
          });
        }

        await tx.activityLog.create({
          data: {
            eventType:
              "Order",

            description:
              `Created ${readySubscribers.length} sandbox shipment record(s) from the Daily Queue.`,

            status:
              "Success",

            user:
              "Admin",

            source:
              "Daily Queue",
          },
        });
      },
    );

    return json({
      success:
        true,

      message:
        `Created ${readySubscribers.length} sandbox fulfillment record(s).`,
    });
  }

  /* ==========================================================
     SYNC NOW
     ========================================================== */

  if (
    intent ===
    "sync-now"
  ) {
    await db.activityLog.create({
      data: {
        eventType:
          "Sync",

        description:
          "Sandbox sync check completed using local SubscriptionSync data.",

        status:
          "Success",

        user:
          "Admin",

        source:
          "Daily Queue",
      },
    });

    return json({
      success:
        true,

      message:
        "Sandbox sync check completed. No live Shopify or Appstle data was changed.",
    });
  }

  await db.activityLog.create({
    data: {
      eventType:
        "Daily Queue",

      description:
        "Daily Queue action completed.",

      status:
        "Success",

      user:
        "Admin",

      source:
        "Daily Queue",
    },
  });

  return json({
    success:
      true,

    message:
      "Daily Queue action completed.",
  });
};

/* ============================================================
   PAGE
   ============================================================ */

export default function DailyQueuePage() {
  const {
    stats,
    queueSubscribers,
  } =
    useLoaderData<typeof loader>();

  const actionData =
    useActionData<typeof action>();

  const navigation =
    useNavigation();

  const [
    filter,
    setFilter,
  ] = useState(
    "all",
  );

  const [
    intent,
    setIntent,
  ] = useState(
    "",
  );

  const isSubmitting =
    navigation.state ===
    "submitting";

  const filteredSubscribers =
    useMemo(() => {
      if (
        filter ===
        "all"
      ) {
        return queueSubscribers;
      }

      return queueSubscribers.filter(
        (subscriber) => {
          if (
            filter ===
            "due-today"
          ) {
            return (
              subscriber.status ===
              "Due Today"
            );
          }

          if (
            filter ===
            "due-tomorrow"
          ) {
            return (
              subscriber.status ===
              "Due Tomorrow"
            );
          }

          if (
            filter ===
            "pending-selection"
          ) {
            return (
              subscriber.status ===
              "Pending Selection"
            );
          }

          if (
            filter ===
            "auto-select-needed"
          ) {
            return (
              subscriber.status ===
              "Auto-Select Needed"
            );
          }

          if (
            filter ===
            "order-ready"
          ) {
            return (
              subscriber.status ===
              "Order Ready"
            );
          }

          if (
            filter ===
            "fulfilled"
          ) {
            return (
              subscriber.status ===
              "Fulfilled"
            );
          }

          if (
            filter ===
            "needs-review"
          ) {
            return (
              subscriber.status ===
              "Needs Review"
            );
          }

          return true;
        },
      );
    }, [
      filter,
      queueSubscribers,
    ]);

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
        title="Daily Queue"
        subtitle="Manage each subscriber according to their individual selection, auto-selection, order, and shipping schedule."
        backAction={{
          content:
            "Dashboard",

          url:
            "/app",
        }}
      >
        <Form method="post">
          <input
            type="hidden"
            name="intent"
            value={intent}
          />

          <BlockStack gap="500">

            {/* ACTION RESULT */}

            {actionData?.message && (
              <Banner
                title={
                  actionData.success
                    ? "Success"
                    : "Action needed"
                }
                tone={
                  actionData.success
                    ? "success"
                    : "critical"
                }
              >
                <p>
                  {
                    actionData.message
                  }
                </p>
              </Banner>
            )}

            {/* ==================================================
                BLUE HERO
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
                    {
                      stats.queueDate
                    }
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
                        "680px",
                    }}
                  >
                    Rolling fulfillment
                    based on each
                    subscriber’s own
                    schedule and
                    Fulfillment Profile.
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
                    ● Sandbox Connected
                  </span>
                </div>
              </InlineStack>
            </div>

            {/* ==================================================
                QUEUE STATUS
                ================================================== */}

            <Card>
              <BlockStack gap="400">
                <BlockStack gap="100">
                  <SectionHeading>
                    Queue Status
                  </SectionHeading>

                  <Text
                    as="p"
                    variant="bodyMd"
                    tone="subdued"
                  >
                    A quick view of
                    subscribers moving
                    through today’s
                    fulfillment workflow.
                  </Text>
                </BlockStack>

                <InlineStack
                  gap="300"
                  wrap
                >
                  <StatBox
                    label="Due Today"
                    value={
                      stats.dueToday
                    }
                  />

                  <StatBox
                    label="Due Tomorrow"
                    value={
                      stats.dueTomorrow
                    }
                  />

                  <StatBox
                    label="Pending Selections"
                    value={
                      stats.pendingSelections
                    }
                  />

                  <StatBox
                    label="Auto-Select Needed"
                    value={
                      stats.autoSelectNeeded
                    }
                  />

                  <StatBox
                    label="Orders Ready"
                    value={
                      stats.ordersReady
                    }
                  />

                  <StatBox
                    label="Fulfilled"
                    value={
                      stats.fulfilled
                    }
                  />

                  <StatBox
                    label="Needs Review"
                    value={
                      stats.needsReview
                    }
                  />
                </InlineStack>
              </BlockStack>
            </Card>

            <Layout>
              <Layout.Section>
                <BlockStack gap="500">

                  {/* ==================================================
                      DAILY ACTIONS
                      ================================================== */}

                  <Card>
                    <BlockStack gap="400">
                      <BlockStack gap="100">
                        <SectionHeading>
                          Daily Actions
                        </SectionHeading>

                        <Text
                          as="p"
                          tone="subdued"
                        >
                          These sandbox
                          actions use the
                          subscriber's current
                          workflow state and
                          Fulfillment Profile.
                        </Text>
                      </BlockStack>

                      <InlineStack
                        gap="300"
                        wrap
                      >
                        <Button
                          submit
                          loading={
                            isSubmitting &&
                            intent ===
                              "send-reminders"
                          }
                          onClick={() =>
                            setIntent(
                              "send-reminders",
                            )
                          }
                        >
                          Prepare Reminders
                        </Button>

                        <Button
                          submit
                          loading={
                            isSubmitting &&
                            intent ===
                              "run-auto-selection"
                          }
                          onClick={() =>
                            setIntent(
                              "run-auto-selection",
                            )
                          }
                        >
                          Run Auto-Selection
                        </Button>

                        <Button
                          submit
                          loading={
                            isSubmitting &&
                            intent ===
                              "create-orders"
                          }
                          onClick={() =>
                            setIntent(
                              "create-orders",
                            )
                          }
                        >
                          Create Ready
                          Fulfillment
                        </Button>

                        <Button
                          submit
                          loading={
                            isSubmitting &&
                            intent ===
                              "sync-now"
                          }
                          onClick={() =>
                            setIntent(
                              "sync-now",
                            )
                          }
                        >
                          Sandbox Sync
                        </Button>

                        <Button
                          url="/app/activity-log"
                        >
                          View Activity Log
                        </Button>
                      </InlineStack>
                    </BlockStack>
                  </Card>

                  {/* ==================================================
                      SUBSCRIBERS
                      ================================================== */}

                  <Card>
                    <BlockStack gap="400">
                      <InlineStack
                        align="space-between"
                        gap="300"
                        blockAlign="center"
                        wrap
                      >
                        <BlockStack gap="050">
                          <SectionHeading>
                            Subscribers in Queue
                          </SectionHeading>

                          <Text
                            as="p"
                            variant="bodySm"
                            tone="subdued"
                          >
                            {
                              filteredSubscribers.length
                            }{" "}
                            subscriber
                            {filteredSubscribers.length ===
                            1
                              ? ""
                              : "s"}{" "}
                            shown
                          </Text>
                        </BlockStack>

                        <div
                          style={{
                            minWidth:
                              "250px",
                          }}
                        >
                          <Select
                            label="Filter queue"
                            labelHidden
                            value={
                              filter
                            }
                            onChange={
                              setFilter
                            }
                            options={[
                              {
                                label:
                                  "All",
                                value:
                                  "all",
                              },

                              {
                                label:
                                  "Due Today",
                                value:
                                  "due-today",
                              },

                              {
                                label:
                                  "Due Tomorrow",
                                value:
                                  "due-tomorrow",
                              },

                              {
                                label:
                                  "Pending Selection",
                                value:
                                  "pending-selection",
                              },

                              {
                                label:
                                  "Auto-Select Needed",
                                value:
                                  "auto-select-needed",
                              },

                              {
                                label:
                                  "Order Ready",
                                value:
                                  "order-ready",
                              },

                              {
                                label:
                                  "Fulfilled",
                                value:
                                  "fulfilled",
                              },

                              {
                                label:
                                  "Needs Review",
                                value:
                                  "needs-review",
                              },
                            ]}
                          />
                        </div>
                      </InlineStack>

                      <div
                        style={{
                          border:
                            `1px solid ${COLORS.border}`,

                          borderRadius:
                            "12px",

                          overflow:
                            "hidden",
                        }}
                      >
                        <IndexTable
                          resourceName={{
                            singular:
                              "subscriber",

                            plural:
                              "subscribers",
                          }}
                          itemCount={
                            filteredSubscribers.length
                          }
                          selectable={
                            false
                          }
                          headings={[
                            {
                              title:
                                "Customer",
                            },

                            {
                              title:
                                "Email",
                            },

                            {
                              title:
                                "Fulfillment Profile",
                            },

                            {
                              title:
                                "Next Ship Date",
                            },

                            {
                              title:
                                "Selection Deadline",
                            },

                            {
                              title:
                                "Auto-Select Date",
                            },

                            {
                              title:
                                "Order Date",
                            },

                            {
                              title:
                                "Queue Status",
                            },

                            {
                              title:
                                "Actions",
                            },
                          ]}
                        >
                          {filteredSubscribers.map(
                            (
                              subscriber,
                              index,
                            ) => (
                              <IndexTable.Row
                                id={
                                  subscriber.id
                                }
                                key={
                                  subscriber.id
                                }
                                position={
                                  index
                                }
                              >
                                <IndexTable.Cell>
                                  <BlockStack gap="050">
                                    <Text
                                      as="span"
                                      fontWeight="semibold"
                                    >
                                      {
                                        subscriber.name
                                      }
                                    </Text>

                                    <Text
                                      as="span"
                                      variant="bodySm"
                                      tone="subdued"
                                    >
                                      {
                                        subscriber.workflowStatus
                                      }
                                    </Text>
                                  </BlockStack>
                                </IndexTable.Cell>

                                <IndexTable.Cell>
                                  {
                                    subscriber.email
                                  }
                                </IndexTable.Cell>

                                <IndexTable.Cell>
                                  <Text
                                    as="span"
                                    fontWeight="medium"
                                  >
                                    {
                                      subscriber.fulfillmentProfile
                                    }
                                  </Text>
                                </IndexTable.Cell>

                                <IndexTable.Cell>
                                  {
                                    subscriber.nextShipDate
                                  }
                                </IndexTable.Cell>

                                <IndexTable.Cell>
                                  {
                                    subscriber.selectionDeadline
                                  }
                                </IndexTable.Cell>

                                <IndexTable.Cell>
                                  {
                                    subscriber.autoSelectDate
                                  }
                                </IndexTable.Cell>

                                <IndexTable.Cell>
                                  {
                                    subscriber.orderCreationDate
                                  }
                                </IndexTable.Cell>

                                <IndexTable.Cell>
                                  <StatusBadge
                                    status={
                                      subscriber.status
                                    }
                                  />
                                </IndexTable.Cell>

                                <IndexTable.Cell>
                                  <Link
                                    to={`/app/subscriber-view/${subscriber.id}`}
                                    style={{
                                      color:
                                        COLORS.accentBlue,

                                      fontWeight:
                                        600,
                                    }}
                                  >
                                    View details
                                  </Link>
                                </IndexTable.Cell>
                              </IndexTable.Row>
                            ),
                          )}
                        </IndexTable>
                      </div>
                    </BlockStack>
                  </Card>
                </BlockStack>
              </Layout.Section>

              {/* ==================================================
                  QUEUE HEALTH
                  ================================================== */}

              <Layout.Section variant="oneThird">
                <Card>
                  <BlockStack gap="400">
                    <BlockStack gap="100">
                      <SectionHeading>
                        Queue Health
                      </SectionHeading>

                      <Text
                        as="p"
                        variant="bodySm"
                        tone="subdued"
                      >
                        Development environment
                        status.
                      </Text>
                    </BlockStack>

                    <InfoRow
                      label="Last reminder"
                      value={
                        stats.lastReminderSent
                      }
                    />

                    <InfoRow
                      label="Last sync"
                      value={
                        stats.lastSync
                      }
                    />

                    <InfoRow
                      label="Schedule"
                      value="Rolling daily"
                    />

                    <InfoRow
                      label="Data source"
                      value="Neon sandbox"
                    />

                    <Divider />

                    <BlueInfoBox
                      title="Daily Fulfillment"
                    >
                      Each subscriber’s
                      dates are calculated
                      from their own
                      subscription schedule.
                      Fulfillment Profile
                      rules determine what
                      happens next.
                    </BlueInfoBox>

                    <BlueInfoBox
                      title="Sandbox Mode"
                    >
                      No live Little
                      Adventures orders,
                      emails, or inventory
                      are changed by these
                      demo actions.
                    </BlueInfoBox>
                  </BlockStack>
                </Card>
              </Layout.Section>
            </Layout>
          </BlockStack>
        </Form>
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
  children: React.ReactNode;
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
  value: string | number;
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
   BLUE INFO BOX
   ============================================================ */

function BlueInfoBox({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background:
          COLORS.softBlue,

        border:
          `1px solid ${COLORS.borderBlue}`,

        borderRadius:
          "12px",

        padding:
          "16px",
      }}
    >
      <BlockStack gap="100">
        <Text
          as="p"
          variant="bodyMd"
          fontWeight="semibold"
        >
          {title}
        </Text>

        <Text
          as="p"
          variant="bodySm"
          tone="subdued"
        >
          {children}
        </Text>
      </BlockStack>
    </div>
  );
}

/* ============================================================
   INFO ROW
   ============================================================ */

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <InlineStack
      align="space-between"
      gap="300"
    >
      <Text
        as="span"
        tone="subdued"
      >
        {label}
      </Text>

      <Text
        as="span"
        fontWeight="medium"
      >
        {value}
      </Text>
    </InlineStack>
  );
}

/* ============================================================
   STATUS BADGE
   ============================================================ */

function StatusBadge({
  status,
}: {
  status: QueueStatus;
}) {
  if (
    status ===
    "Due Today"
  ) {
    return (
      <Badge tone="critical">
        Due Today
      </Badge>
    );
  }

  if (
    status ===
    "Due Tomorrow"
  ) {
    return (
      <Badge tone="attention">
        Due Tomorrow
      </Badge>
    );
  }

  if (
    status ===
    "Pending Selection"
  ) {
    return (
      <Badge tone="info">
        Pending Selection
      </Badge>
    );
  }

  if (
    status ===
    "Auto-Select Needed"
  ) {
    return (
      <Badge tone="warning">
        Auto-Select Needed
      </Badge>
    );
  }

  if (
    status ===
    "Order Ready"
  ) {
    return (
      <Badge tone="success">
        Order Ready
      </Badge>
    );
  }

  if (
    status ===
    "Fulfilled"
  ) {
    return (
      <Badge tone="success">
        Fulfilled
      </Badge>
    );
  }

  return (
    <Badge tone="critical">
      Needs Review
    </Badge>
  );
}

/* ============================================================
   QUEUE STATUS LOGIC
   ============================================================ */

function getQueueStatus({
  subscriptionStatus,
  workflowStatus,
  nextShipDate,
  selectionDeadline,
  autoSelectionDate,
  hasSelection,
  hasShipment,
  latestShipmentStatus,
}: {
  subscriptionStatus: string;
  workflowStatus: string;

  nextShipDate: Date;
  selectionDeadline: Date;
  autoSelectionDate: Date | null;

  hasSelection: boolean;
  hasShipment: boolean;

  latestShipmentStatus:
    | string
    | null;
}): QueueStatus {
  if (
    subscriptionStatus !==
    "Active"
  ) {
    return "Needs Review";
  }

  if (
    workflowStatus ===
    "Needs Review"
  ) {
    return "Needs Review";
  }

  if (
    workflowStatus ===
    "Fulfilled"
  ) {
    return "Fulfilled";
  }

  if (
    latestShipmentStatus &&
    [
      "fulfilled",
      "delivered",
      "complete",
      "completed",
    ].includes(
      latestShipmentStatus.toLowerCase(),
    )
  ) {
    return "Fulfilled";
  }

  if (
    workflowStatus ===
      "Selection Submitted" ||
    workflowStatus ===
      "Auto Selected" ||
    workflowStatus ===
      "Ready for Fulfillment" ||
    hasSelection ||
    hasShipment
  ) {
    return "Order Ready";
  }

  const today =
    startOfDay(
      new Date(),
    );

  const tomorrow =
    addDays(
      today,
      1,
    );

  const shipDate =
    startOfDay(
      new Date(
        nextShipDate,
      ),
    );

  const deadline =
    startOfDay(
      new Date(
        selectionDeadline,
      ),
    );

  const autoDate =
    autoSelectionDate
      ? startOfDay(
          new Date(
            autoSelectionDate,
          ),
        )
      : null;

  if (
    sameDay(
      shipDate,
      today,
    )
  ) {
    return "Due Today";
  }

  if (
    sameDay(
      shipDate,
      tomorrow,
    )
  ) {
    return "Due Tomorrow";
  }

  if (
    autoDate &&
    autoDate <= today
  ) {
    return "Auto-Select Needed";
  }

  if (
    deadline <= today
  ) {
    return "Auto-Select Needed";
  }

  return "Pending Selection";
}

/* ============================================================
   DATE HELPERS
   ============================================================ */

function getOrderCreationDate(
  nextShipDate: Date,
) {
  const date =
    new Date(
      nextShipDate,
    );

  date.setDate(
    date.getDate() - 1,
  );

  return date;
}

function formatDate(
  date:
    | string
    | Date
    | null,
) {
  if (!date) {
    return "Not set";
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
    },
  ).format(
    new Date(date),
  );
}

function formatDateTime(
  date:
    | string
    | Date,
) {
  return new Intl.DateTimeFormat(
    "en-US",
    {
      month:
        "short",

      day:
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

function startOfDay(
  date: Date,
) {
  const copy =
    new Date(date);

  copy.setHours(
    0,
    0,
    0,
    0,
  );

  return copy;
}

function endOfDay(
  date: Date,
) {
  const copy =
    new Date(date);

  copy.setHours(
    23,
    59,
    59,
    999,
  );

  return copy;
}

function addDays(
  date: Date,
  days: number,
) {
  const copy =
    new Date(date);

  copy.setDate(
    copy.getDate() +
      days,
  );

  return copy;
}

function sameDay(
  firstDate: Date,
  secondDate: Date,
) {
  return (
    firstDate.getTime() ===
    secondDate.getTime()
  );
}

function getMonthLabel(
  date:
    | string
    | Date,
) {
  return new Intl.DateTimeFormat(
    "en-US",
    {
      month:
        "long",

      year:
        "numeric",
    },
  ).format(
    new Date(date),
  );
}