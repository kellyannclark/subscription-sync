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
   SUBSCRIPTIONSYNC DESIGN SYSTEM
   ============================================================ */

const COLORS = {
  page: "#F7F7F4",
  white: "#FFFFFF",

  text: "#20221F",
  textSoft: "#52574F",
  muted: "#787D75",

  sage: "#687A6C",
  sageDark: "#4D5E51",
  sageSoft: "#EEF1ED",
  sageSoftStrong: "#E4EAE3",

  border: "#E4E5DF",
  borderStrong: "#D7DAD2",

  warm: "#F6F1E8",
  warmText: "#755F38",
  warmBorder: "#E8DDC8",

  dangerSoft: "#F9EEEE",
  dangerText: "#8B4242",
  dangerBorder: "#EBCFCF",
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
      if (filter === "due-today") {
        return subscriber.status === "Due Today";
      }

      if (filter === "due-tomorrow") {
        return subscriber.status === "Due Tomorrow";
      }

      if (filter === "pending-selection") {
        return subscriber.status === "Pending Selection";
      }

      if (filter === "auto-select-needed") {
        return subscriber.status === "Auto-Select Needed";
      }

      if (filter === "order-ready") {
        return subscriber.status === "Order Ready";
      }

      if (filter === "fulfilled") {
        return subscriber.status === "Fulfilled";
      }

      if (filter === "needs-review") {
        return subscriber.status === "Needs Review";
      }

      return true;
    });
  }, [filter, queueSubscribers]);

  const needsAttention =
    stats.dueToday + stats.autoSelectNeeded + stats.needsReview;

  return (
    <div
      style={{
        background: COLORS.page,
        minHeight: "100vh",
      }}
    >
      <Page
        title="Daily Queue"
        subtitle="Manage each subscriber according to their individual selection, auto-selection, order, and shipping schedule."
        backAction={{
          content: "Dashboard",
          url: "/app",
        }}
      >
        <Form method="post">
          <input type="hidden" name="intent" value={intent} />

          <BlockStack gap="600">
            {/* ACTION RESULT */}
            {actionData?.message && (
              <Banner
                title={actionData.success ? "Success" : "Action needed"}
                tone={actionData.success ? "success" : "critical"}
              >
                <p>{actionData.message}</p>
              </Banner>
            )}

            {/* ==================================================
                INTRO / HERO
                ================================================== */}

            <div
              style={{
                position: "relative",
                overflow: "hidden",
                borderRadius: "22px",
                border: `1px solid ${COLORS.border}`,
                background: `
                  linear-gradient(
                    108deg,
                    #FCFBF7 0%,
                    #F7F6F1 48%,
                    #D9E2D8 72%,
                    #9FB09F 100%
                  )
                `,
                boxShadow:
                  "0 1px 2px rgba(32,34,31,0.03), 0 16px 36px rgba(32,34,31,0.07)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  width: "520px",
                  height: "220px",
                  borderRadius: "50%",
                  background:
                    "linear-gradient(135deg, rgba(77,94,81,0.96), rgba(104,122,108,0.86))",
                  bottom: "-180px",
                  left: "-110px",
                  transform: "rotate(5deg)",
                  pointerEvents: "none",
                }}
              />

              <div
                style={{
                  position: "absolute",
                  width: "330px",
                  height: "330px",
                  borderRadius: "50%",
                  border: "1px solid rgba(255,255,255,0.32)",
                  top: "-120px",
                  right: "15px",
                  pointerEvents: "none",
                }}
              />

              <div
                style={{
                  position: "absolute",
                  width: "230px",
                  height: "230px",
                  borderRadius: "50%",
                  border: "1px solid rgba(255,255,255,0.22)",
                  top: "-68px",
                  right: "65px",
                  pointerEvents: "none",
                }}
              />

              <div
                style={{
                  position: "relative",
                  zIndex: 2,
                  padding: "38px 40px",
                }}
              >
                <InlineStack
                  align="space-between"
                  blockAlign="center"
                  gap="600"
                  wrap
                >
                  <div style={{ maxWidth: "620px" }}>
                    <div
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        letterSpacing: "0.13em",
                        textTransform: "uppercase",
                        color: COLORS.sageDark,
                        marginBottom: "15px",
                      }}
                    >
                      Workflow
                    </div>

                    <div
                      style={{
                        fontSize: "34px",
                        fontWeight: 650,
                        letterSpacing: "-0.04em",
                        lineHeight: 1.08,
                        color: COLORS.text,
                        marginBottom: "14px",
                      }}
                    >
                      Daily fulfillment,
                      <br />
                      <span style={{ color: COLORS.sageDark }}>
                        made clear.
                      </span>
                    </div>

                    <div
                      style={{
                        fontSize: "14px",
                        lineHeight: 1.65,
                        color: COLORS.textSoft,
                        maxWidth: "570px",
                      }}
                    >
                      See what needs attention, move subscribers through
                      selection, and prepare fulfillment from one organized
                      queue.
                    </div>
                  </div>

                  <div
                    style={{
                      minWidth: "235px",
                      background: "rgba(255,255,255,0.78)",
                      backdropFilter: "blur(10px)",
                      border: "1px solid rgba(255,255,255,0.64)",
                      borderRadius: "18px",
                      padding: "18px 20px",
                      boxShadow: "0 10px 28px rgba(32,34,31,0.08)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        letterSpacing: "0.10em",
                        textTransform: "uppercase",
                        color: COLORS.sageDark,
                        marginBottom: "10px",
                      }}
                    >
                      Right now
                    </div>

                    <div
                      style={{
                        fontSize: "34px",
                        lineHeight: 1,
                        fontWeight: 650,
                        letterSpacing: "-0.04em",
                        color: COLORS.text,
                        marginBottom: "7px",
                      }}
                    >
                      {needsAttention}
                    </div>

                    <div
                      style={{
                        fontSize: "12px",
                        lineHeight: 1.45,
                        color: COLORS.muted,
                        marginBottom: "15px",
                      }}
                    >
                      item{needsAttention === 1 ? "" : "s"} need attention
                    </div>

                    <div
                      style={{
                        paddingTop: "12px",
                        borderTop: `1px solid ${COLORS.border}`,
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <div
                        style={{
                          width: "7px",
                          height: "7px",
                          borderRadius: "999px",
                          background: COLORS.sageDark,
                          boxShadow:
                            "0 0 0 4px rgba(77,94,81,0.10)",
                        }}
                      />
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 650,
                          color: COLORS.sageDark,
                        }}
                      >
                        Sandbox connected
                      </span>
                    </div>
                  </div>
                </InlineStack>
              </div>
            </div>

            {/* ==================================================
                QUEUE SNAPSHOT
                ================================================== */}

            <BlockStack gap="300">
              <SectionHeader
                eyebrow="Overview"
                title="Queue snapshot"
                description="A quick view of where subscribers are in today’s fulfillment workflow."
              />

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(150px, 1fr))",
                  gap: "12px",
                }}
              >
                <StatBox
                  label="Due Today"
                  value={stats.dueToday}
                  tone="urgent"
                />
                <StatBox
                  label="Due Tomorrow"
                  value={stats.dueTomorrow}
                  tone="attention"
                />
                <StatBox
                  label="Pending Selections"
                  value={stats.pendingSelections}
                />
                <StatBox
                  label="Auto-Select Needed"
                  value={stats.autoSelectNeeded}
                  tone="attention"
                />
                <StatBox
                  label="Orders Ready"
                  value={stats.ordersReady}
                  tone="positive"
                />
                <StatBox
                  label="Fulfilled"
                  value={stats.fulfilled}
                  tone="positive"
                />
                <StatBox
                  label="Needs Review"
                  value={stats.needsReview}
                  tone="urgent"
                />
              </div>
            </BlockStack>

            <Layout>
              <Layout.Section>
                <BlockStack gap="500">
                  {/* ==================================================
                      DAILY ACTIONS
                      ================================================== */}

                  <div
                    style={{
                      background: COLORS.white,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: "18px",
                      padding: "22px",
                      boxShadow: "0 1px 2px rgba(32,34,31,0.02)",
                    }}
                  >
                    <BlockStack gap="400">
                      <SectionHeader
                        eyebrow="Actions"
                        title="Move the queue forward"
                        description="Use the current sandbox workflow state and Fulfillment Profile rules to process the next steps."
                      />

                      <InlineStack gap="300" wrap>
                        <Button
                          submit
                          loading={
                            isSubmitting && intent === "send-reminders"
                          }
                          onClick={() => setIntent("send-reminders")}
                        >
                          Prepare Reminders
                        </Button>

                        <Button
                          submit
                          loading={
                            isSubmitting &&
                            intent === "run-auto-selection"
                          }
                          onClick={() => setIntent("run-auto-selection")}
                        >
                          Run Auto-Selection
                        </Button>

                        <Button
                          submit
                          loading={
                            isSubmitting && intent === "create-orders"
                          }
                          onClick={() => setIntent("create-orders")}
                        >
                          Create Ready Fulfillment
                        </Button>

                        <Button
                          submit
                          loading={isSubmitting && intent === "sync-now"}
                          onClick={() => setIntent("sync-now")}
                        >
                          Sandbox Sync
                        </Button>

                        <Button url="/app/activity-log">
                          View Activity Log
                        </Button>
                      </InlineStack>

                      <div
                        style={{
                          background: COLORS.sageSoft,
                          border: `1px solid ${COLORS.sageSoftStrong}`,
                          borderRadius: "12px",
                          padding: "12px 14px",
                          fontSize: "12px",
                          lineHeight: 1.5,
                          color: COLORS.textSoft,
                        }}
                      >
                        Sandbox actions are safe for testing. They do not
                        change live Little Adventures orders, emails, or
                        inventory.
                      </div>
                    </BlockStack>
                  </div>

                  {/* ==================================================
                      SUBSCRIBERS
                      ================================================== */}

                  <div
                    style={{
                      background: COLORS.white,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: "18px",
                      overflow: "hidden",
                      boxShadow: "0 1px 2px rgba(32,34,31,0.02)",
                    }}
                  >
                    <div style={{ padding: "22px 22px 18px" }}>
                      <InlineStack
                        align="space-between"
                        gap="300"
                        blockAlign="center"
                        wrap
                      >
                        <SectionHeader
                          eyebrow="Subscribers"
                          title="In the queue"
                          description={`${filteredSubscribers.length} subscriber${
                            filteredSubscribers.length === 1 ? "" : "s"
                          } shown`}
                        />

                        <div style={{ minWidth: "250px" }}>
                          <Select
                            label="Filter queue"
                            labelHidden
                            value={filter}
                            onChange={setFilter}
                            options={[
                              { label: "All", value: "all" },
                              { label: "Due Today", value: "due-today" },
                              {
                                label: "Due Tomorrow",
                                value: "due-tomorrow",
                              },
                              {
                                label: "Pending Selection",
                                value: "pending-selection",
                              },
                              {
                                label: "Auto-Select Needed",
                                value: "auto-select-needed",
                              },
                              {
                                label: "Order Ready",
                                value: "order-ready",
                              },
                              { label: "Fulfilled", value: "fulfilled" },
                              {
                                label: "Needs Review",
                                value: "needs-review",
                              },
                            ]}
                          />
                        </div>
                      </InlineStack>
                    </div>

                    <Divider />

                    <div style={{ overflow: "hidden" }}>
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
                          { title: "Fulfillment Profile" },
                          { title: "Next Ship Date" },
                          { title: "Selection Deadline" },
                          { title: "Auto-Select Date" },
                          { title: "Order Date" },
                          { title: "Queue Status" },
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
                              <BlockStack gap="050">
                                <Text as="span" fontWeight="semibold">
                                  {subscriber.name}
                                </Text>
                                <Text
                                  as="span"
                                  variant="bodySm"
                                  tone="subdued"
                                >
                                  {subscriber.workflowStatus}
                                </Text>
                              </BlockStack>
                            </IndexTable.Cell>

                            <IndexTable.Cell>
                              {subscriber.email}
                            </IndexTable.Cell>

                            <IndexTable.Cell>
                              <Text as="span" fontWeight="medium">
                                {subscriber.fulfillmentProfile}
                              </Text>
                            </IndexTable.Cell>

                            <IndexTable.Cell>
                              {subscriber.nextShipDate}
                            </IndexTable.Cell>

                            <IndexTable.Cell>
                              {subscriber.selectionDeadline}
                            </IndexTable.Cell>

                            <IndexTable.Cell>
                              {subscriber.autoSelectDate}
                            </IndexTable.Cell>

                            <IndexTable.Cell>
                              {subscriber.orderCreationDate}
                            </IndexTable.Cell>

                            <IndexTable.Cell>
                              <StatusBadge status={subscriber.status} />
                            </IndexTable.Cell>

                            <IndexTable.Cell>
                              <Link
                                to={`/app/subscriber-view/${subscriber.id}`}
                                style={{
                                  color: COLORS.sageDark,
                                  fontWeight: 650,
                                  textDecoration: "none",
                                }}
                              >
                                View details →
                              </Link>
                            </IndexTable.Cell>
                          </IndexTable.Row>
                        ))}
                      </IndexTable>
                    </div>
                  </div>
                </BlockStack>
              </Layout.Section>

              {/* ==================================================
                  QUEUE HEALTH
                  ================================================== */}

              <Layout.Section variant="oneThird">
                <BlockStack gap="400">
                  <div
                    style={{
                      background: COLORS.white,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: "18px",
                      padding: "20px",
                      boxShadow: "0 1px 2px rgba(32,34,31,0.02)",
                    }}
                  >
                    <BlockStack gap="400">
                      <SectionHeader
                        eyebrow="System"
                        title="Queue health"
                        description="Development environment status and recent activity."
                      />

                      <InfoRow
                        label="Connection"
                        value={stats.syncStatus}
                        dot
                      />
                      <InfoRow
                        label="Last reminder"
                        value={stats.lastReminderSent}
                      />
                      <InfoRow label="Last sync" value={stats.lastSync} />
                      <InfoRow label="Schedule" value="Rolling daily" />
                      <InfoRow label="Data source" value="Neon sandbox" />
                    </BlockStack>
                  </div>

                  <SoftInfoBox title="How the queue works">
                    Each subscriber’s dates are calculated from their own
                    subscription schedule. Fulfillment Profile rules determine
                    what happens next.
                  </SoftInfoBox>

                  <SoftInfoBox title="Sandbox mode" emphasis>
                    No live Little Adventures orders, emails, or inventory are
                    changed by these demo actions.
                  </SoftInfoBox>
                </BlockStack>
              </Layout.Section>
            </Layout>

            <div style={{ height: "24px" }} />
          </BlockStack>
        </Form>
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
  title: React.ReactNode;
  description: React.ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: "10px",
          fontWeight: 700,
          letterSpacing: "0.11em",
          textTransform: "uppercase",
          color: COLORS.sage,
          marginBottom: "6px",
        }}
      >
        {eyebrow}
      </div>

      <div
        style={{
          fontSize: "20px",
          fontWeight: 650,
          letterSpacing: "-0.015em",
          lineHeight: 1.2,
          color: COLORS.text,
          marginBottom: "5px",
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: "13px",
          lineHeight: 1.5,
          color: COLORS.muted,
          maxWidth: "700px",
        }}
      >
        {description}
      </div>
    </div>
  );
}

/* ============================================================
   STAT BOX
   ============================================================ */

function StatBox({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  tone?: "neutral" | "urgent" | "attention" | "positive";
}) {
  const background =
    tone === "urgent"
      ? COLORS.dangerSoft
      : tone === "attention"
        ? COLORS.warm
        : tone === "positive"
          ? COLORS.sageSoft
          : COLORS.white;

  const border =
    tone === "urgent"
      ? COLORS.dangerBorder
      : tone === "attention"
        ? COLORS.warmBorder
        : tone === "positive"
          ? COLORS.sageSoftStrong
          : COLORS.border;

  const accent =
    tone === "urgent"
      ? COLORS.dangerText
      : tone === "attention"
        ? COLORS.warmText
        : tone === "positive"
          ? COLORS.sageDark
          : COLORS.muted;

  return (
    <div
      style={{
        background,
        border: `1px solid ${border}`,
        borderRadius: "15px",
        padding: "17px 18px",
        minHeight: "112px",
        boxShadow: "0 1px 2px rgba(32,34,31,0.02)",
      }}
    >
      <div
        style={{
          width: "24px",
          height: "3px",
          borderRadius: "999px",
          background: accent,
          marginBottom: "15px",
          opacity: 0.8,
        }}
      />

      <div
        style={{
          fontSize: "28px",
          lineHeight: 1,
          fontWeight: 650,
          letterSpacing: "-0.04em",
          color: COLORS.text,
          marginBottom: "9px",
        }}
      >
        {value}
      </div>

      <div
        style={{
          fontSize: "11px",
          fontWeight: 700,
          lineHeight: 1.35,
          letterSpacing: "0.025em",
          color: accent,
        }}
      >
        {label}
      </div>
    </div>
  );
}

/* ============================================================
   SOFT INFO BOX
   ============================================================ */

function SoftInfoBox({
  title,
  children,
  emphasis = false,
}: {
  title: string;
  children: React.ReactNode;
  emphasis?: boolean;
}) {
  return (
    <div
      style={{
        background: emphasis ? COLORS.sageSoft : COLORS.white,
        border: `1px solid ${
          emphasis ? COLORS.sageSoftStrong : COLORS.border
        }`,
        borderRadius: "16px",
        padding: "18px",
      }}
    >
      <div
        style={{
          fontSize: "13px",
          fontWeight: 650,
          color: COLORS.text,
          marginBottom: "7px",
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: "12px",
          lineHeight: 1.55,
          color: COLORS.muted,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ============================================================
   INFO ROW
   ============================================================ */

function InfoRow({
  label,
  value,
  dot = false,
}: {
  label: string;
  value: string;
  dot?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: "16px",
        paddingBottom: "12px",
        borderBottom: `1px solid ${COLORS.border}`,
      }}
    >
      <span
        style={{
          fontSize: "12px",
          color: COLORS.muted,
        }}
      >
        {label}
      </span>

      <span
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: "7px",
          fontSize: "12px",
          fontWeight: 600,
          color: COLORS.text,
          textAlign: "right",
        }}
      >
        {dot && (
          <span
            style={{
              width: "7px",
              height: "7px",
              borderRadius: "999px",
              background: COLORS.sageDark,
              boxShadow: "0 0 0 3px rgba(77,94,81,0.09)",
              flexShrink: 0,
            }}
          />
        )}
        {value}
      </span>
    </div>
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