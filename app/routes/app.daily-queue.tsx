import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
} from "@remix-run/node";

import { json } from "@remix-run/node";

import {
  Link,
  useLoaderData,
  useSearchParams,
} from "@remix-run/react";

import { useMemo } from "react";

import {
  Badge,
  BlockStack,
  Box,
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

import { COLORS } from "../styles/theme";

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
  shipmentStatus: string | null;
  status: QueueStatus;

  actionNeeded: boolean;
  actionReason: string | null;
  recommendedAction: string | null;
  actionLabel: string | null;
  actionUrl: string | null;
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

        const actionInfo =
          getActionNeededInfo({
            id: subscriber.id,
            subscriptionStatus:
              subscriber.subscriptionStatus,
            workflowStatus:
              subscriber.workflowStatus,
            hasFulfillmentProfile:
              Boolean(subscriber.fulfillmentProfile),
            selectionDeadline:
              subscriber.nextSelectionDeadline,
            autoSelectionDate:
              subscriber.autoSelectionDate,
            latestShipmentStatus:
              latestShipment?.status ?? null,
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

          shipmentStatus:
            latestShipment?.status ?? null,

          status,

          actionNeeded:
            actionInfo.actionNeeded,

          actionReason:
            actionInfo.reason,

          recommendedAction:
            actionInfo.recommendedAction,

          actionLabel:
            actionInfo.actionLabel,

          actionUrl:
            actionInfo.actionUrl,
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
  const [searchParams, setSearchParams] = useSearchParams();

  const filter = searchParams.get("filter") || "all";

  const setFilter = (value: string) => {
    const nextParams = new URLSearchParams(searchParams.toString());

    if (value === "all") {
      nextParams.delete("filter");
    } else {
      nextParams.set("filter", value);
    }

    setSearchParams(nextParams);
  };

  const filteredSubscribers = useMemo(() => {
    if (filter === "all") {
      return queueSubscribers;
    }

    return queueSubscribers.filter((subscriber) => {
      if (filter === "action-needed") {
        return subscriber.actionNeeded;
      }

      if (filter === "selections-in-progress") {
        return subscriber.workflowStatus === "Waiting for Selection";
      }

      if (filter === "shipments-pending") {
        return subscriber.shipmentStatus?.toLowerCase() === "pending";
      }

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

      return true;
    });
  }, [filter, queueSubscribers]);

  const needsAttention = queueSubscribers.filter(
    (subscriber) => subscriber.actionNeeded,
  ).length;

  return (
    <div
      style={{
        background: COLORS.page,
        minHeight: "100vh",
      }}
    >
      <Page
        backAction={{
          content: "Dashboard",
          url: "/app",
        }}
      >
        <BlockStack gap="500">
          {/* ==================================================
              INTRO / HERO
              ================================================== */}

          <div
            style={{
              position: "relative",
              overflow: "hidden",
              borderRadius: "18px",
              border: `1px solid ${COLORS.border}`,
              minHeight: "72px",
              background: `
                linear-gradient(
                  105deg,
                  #FCFBF7 0%,
                  #F7F6F1 58%,
                  ${COLORS.primarySoftStrong} 100%
                )
              `,
              boxShadow:
                "0 1px 2px rgba(32,34,31,0.03), 0 10px 24px rgba(32,34,31,0.05)",
            }}
          >
            <div
              style={{
                position: "absolute",
                width: "260px",
                height: "260px",
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(67,86,109,0.16) 0%, rgba(67,86,109,0.05) 45%, transparent 72%)",
                top: "-150px",
                right: "-50px",
                pointerEvents: "none",
              }}
            />

            <div
              style={{
                position: "relative",
                zIndex: 2,
                padding: "13px 18px",
              }}
            >
              <div
                style={{
                  fontSize: "10px",
                  lineHeight: 1,
                  fontWeight: 750,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: COLORS.primaryDark,
                  marginBottom: "5px",
                }}
              >
                Daily Queue
              </div>

              <div
                style={{
                  fontSize: "20px",
                  fontWeight: 680,
                  letterSpacing: "-0.035em",
                  lineHeight: 1.1,
                  color: COLORS.text,
                  marginBottom: "4px",
                }}
              >
                Monitor the workflow.{" "}
                <span style={{ color: COLORS.primaryDark }}>
                  Step in only when needed.
                </span>
              </div>

              <div
                style={{
                  fontSize: "12px",
                  lineHeight: 1.4,
                  color: COLORS.textSoft,
                  maxWidth: "820px",
                }}
              >
                SubscriptionSync is designed to move routine subscription work
                forward automatically. This page shows where each subscriber is
                in that process and clearly flags the exceptions that need a person.
              </div>
            </div>
          </div>

          {/* ==================================================
              PURPOSE / AUTOMATION EXPLANATION
              ================================================== */}

          <div
            style={{
              background: COLORS.white,
              border: `1px solid ${COLORS.border}`,
              borderRadius: "16px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "18px 22px",
                background: COLORS.primarySoft,
                borderBottom: `1px solid ${COLORS.primarySoftStrong}`,
              }}
            >
              <div
                style={{
                  fontSize: "15px",
                  fontWeight: 700,
                  color: COLORS.text,
                  marginBottom: "5px",
                }}
              >
                You do not need to run the Daily Queue
              </div>

              <div
                style={{
                  fontSize: "13px",
                  lineHeight: 1.55,
                  color: COLORS.textSoft,
                  maxWidth: "920px",
                }}
              >
                Routine reminders, customer selection timing, automatic selection
                rules, and fulfillment preparation are intended to happen
                automatically. The Daily Queue is primarily a monitoring screen.
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              }}
            >
              <div
                style={{
                  padding: "20px 22px",
                  borderRight: `1px solid ${COLORS.border}`,
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 750,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: COLORS.primaryDark,
                    marginBottom: "9px",
                  }}
                >
                  SubscriptionSync is handling it
                </div>

                <div
                  style={{
                    fontSize: "13px",
                    lineHeight: 1.65,
                    color: COLORS.textSoft,
                  }}
                >
                  Waiting for a customer, reminder timing, auto-selection timing,
                  and normal fulfillment progress are statuses to view. They are
                  not instructions for an employee to press a button.
                </div>
              </div>

              <div
                style={{
                  padding: "20px 22px",
                  background: needsAttention > 0 ? COLORS.dangerSoft : "#FFFDFD",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 800,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: COLORS.dangerText,
                    marginBottom: "9px",
                  }}
                >
                  {needsAttention > 0 ? "⚠ Action Needed" : "✓ Action Needed"}
                </div>

                <div
                  style={{
                    fontSize: "13px",
                    lineHeight: 1.65,
                    color: COLORS.textSoft,
                    marginBottom: "10px",
                  }}
                >
                  {needsAttention > 0
                    ? `${needsAttention} exception${
                        needsAttention === 1 ? "" : "s"
                      } match a rule that automation cannot safely finish by itself.`
                    : "There are no exceptions that match a rule requiring a person right now."}
                </div>

                <div
                  style={{
                    fontSize: "12px",
                    lineHeight: 1.55,
                    color: COLORS.muted,
                    marginBottom: needsAttention > 0 ? "12px" : 0,
                  }}
                >
                  Current Action Needed rules include: a missing fulfillment profile,
                  an item explicitly marked Needs Review, an overdue customer
                  selection with no automatic fallback scheduled, or a failed
                  shipment status.
                </div>

                {needsAttention > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilter("action-needed")}
                    style={{
                      border: "none",
                      borderRadius: "9px",
                      padding: "10px 13px",
                      background: COLORS.dangerText,
                      color: "#FFFFFF",
                      fontSize: "12px",
                      fontWeight: 750,
                      cursor: "pointer",
                    }}
                  >
                    REVIEW ACTION NEEDED →
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ==================================================
              QUEUE SNAPSHOT
              ================================================== */}

          <BlockStack gap="300">
            <SectionHeader
              eyebrow="Overview"
              title="Workflow snapshot"
              description="These cards show what the automated workflow is doing. Only Action Needed represents work that requires a person."
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(155px, 1fr))",
                gap: "12px",
              }}
            >
              <StatBox
                label="Selections In Progress"
                value={
                  queueSubscribers.filter(
                    (item) => item.workflowStatus === "Waiting for Selection",
                  ).length
                }
              />
              <StatBox
                label="Auto-Selection Scheduled"
                value={stats.autoSelectNeeded}
                tone="attention"
              />
              <StatBox
                label="Ready for Shipping"
                value={stats.ordersReady}
                tone="positive"
              />
              <StatBox
                label="Fulfilled"
                value={stats.fulfilled}
                tone="positive"
              />
              <button
                type="button"
                onClick={() => setFilter("action-needed")}
                style={{
                  border: "none",
                  padding: 0,
                  margin: 0,
                  background: "transparent",
                  textAlign: "left",
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                <StatBox
                  label="Action Needed — Review →"
                  value={needsAttention}
                  tone="urgent"
                  strong
                />
              </button>
            </div>
          </BlockStack>

          <Layout>
            <Layout.Section>
              <BlockStack gap="500">
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
                        title="Workflow details"
                        description={`${filteredSubscribers.length} subscriber${
                          filteredSubscribers.length === 1 ? "" : "s"
                        } shown. Open a customer when you need more detail or a manual change.`}
                      />

                      <div style={{ minWidth: "250px" }}>
                        <Select
                          label="Filter queue"
                          labelHidden
                          value={filter}
                          onChange={setFilter}
                          options={[
                            { label: "All workflow activity", value: "all" },
                            {
                              label: "⚠ Action Needed",
                              value: "action-needed",
                            },
                            {
                              label: "Selections In Progress",
                              value: "selections-in-progress",
                            },
                            {
                              label: "Ready for Shipping",
                              value: "shipments-pending",
                            },
                            { label: "Shipping Today", value: "due-today" },
                            {
                              label: "Shipping Tomorrow",
                              value: "due-tomorrow",
                            },
                            {
                              label: "Waiting for Selection",
                              value: "pending-selection",
                            },
                            {
                              label: "Auto-Selection Scheduled",
                              value: "auto-select-needed",
                            },
                            {
                              label: "Order Ready",
                              value: "order-ready",
                            },
                            { label: "Fulfilled", value: "fulfilled" },
                          ]}
                        />
                      </div>
                    </InlineStack>
                  </div>

                  <Divider />

                  <div style={{ overflow: "hidden" }}>
                    {filter === "action-needed" ? (
                      filteredSubscribers.length === 0 ? (
                        <div
                          style={{
                            padding: "34px 24px",
                            textAlign: "center",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "15px",
                              fontWeight: 700,
                              color: COLORS.text,
                              marginBottom: "6px",
                            }}
                          >
                            ✓ Nothing needs team action
                          </div>
                          <div
                            style={{
                              fontSize: "13px",
                              color: COLORS.muted,
                            }}
                          >
                            SubscriptionSync can continue handling the normal workflow.
                          </div>
                        </div>
                      ) : (
                        <IndexTable
                          resourceName={{
                            singular: "exception",
                            plural: "exceptions",
                          }}
                          itemCount={filteredSubscribers.length}
                          selectable={false}
                          headings={[
                            { title: "Customer" },
                            { title: "Why it stopped" },
                            { title: "What the worker should do" },
                            { title: "Selection Deadline" },
                            { title: "Action" },
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
                                    {subscriber.email}
                                  </Text>
                                </BlockStack>
                              </IndexTable.Cell>

                              <IndexTable.Cell>
                                <div
                                  style={{
                                    maxWidth: "240px",
                                    fontSize: "13px",
                                    fontWeight: 650,
                                    lineHeight: 1.45,
                                    color: COLORS.dangerText,
                                  }}
                                >
                                  {subscriber.actionReason}
                                </div>
                              </IndexTable.Cell>

                              <IndexTable.Cell>
                                <div
                                  style={{
                                    maxWidth: "300px",
                                    fontSize: "13px",
                                    lineHeight: 1.5,
                                    color: COLORS.textSoft,
                                  }}
                                >
                                  {subscriber.recommendedAction}
                                </div>
                              </IndexTable.Cell>

                              <IndexTable.Cell>
                                {subscriber.selectionDeadline}
                              </IndexTable.Cell>

                              <IndexTable.Cell>
                                {subscriber.actionUrl && (
                                  <Link
                                    to={subscriber.actionUrl}
                                    style={{
                                      display: "inline-block",
                                      background: COLORS.dangerText,
                                      color: "#FFFFFF",
                                      borderRadius: "8px",
                                      padding: "8px 10px",
                                      fontSize: "12px",
                                      fontWeight: 750,
                                      textDecoration: "none",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {subscriber.actionLabel ?? "OPEN CUSTOMER"} →
                                  </Link>
                                )}
                              </IndexTable.Cell>
                            </IndexTable.Row>
                          ))}
                        </IndexTable>
                      )
                    ) : (
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
                          { title: "Workflow Status" },
                          { title: "Open" },
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
                                <Link
                                  to={`/app/subscriber-view/${subscriber.id}`}
                                  style={{
                                    color: COLORS.primaryDark,
                                    fontWeight: 700,
                                    textDecoration: "none",
                                  }}
                                >
                                  {subscriber.name} →
                                </Link>
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
                              {subscriber.actionNeeded ? (
                                <Badge tone="critical">Action Needed</Badge>
                              ) : (
                                <StatusBadge status={subscriber.status} />
                              )}
                            </IndexTable.Cell>

                            <IndexTable.Cell>
                              <Link
                                to={`/app/subscriber-view/${subscriber.id}`}
                                style={{
                                  color: COLORS.primaryDark,
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
                    )}
                  </div>
                </div>
              </BlockStack>
            </Layout.Section>

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
                      eyebrow="About this page"
                      title="What to do here"
                      description="Use the queue to monitor automation and investigate exceptions."
                    />

                    <InfoRow
                      label="Normal workflow"
                      value="Automatic"
                      dot
                    />
                    <InfoRow
                      label="Team work"
                      value="Action Needed exceptions"
                    />
                    <InfoRow
                      label="Customer details"
                      value="Open as needed"
                    />
                    <InfoRow
                      label="Activity history"
                      value="Available to review"
                    />
                  </BlockStack>
                </div>

                <SoftInfoBox title="What happens after Action Needed?">
                  Click Action Needed to see only the exceptions. Each row explains
                  why automation stopped, what the worker should do next, and gives
                  a direct Open Customer action for that subscriber.
                </SoftInfoBox>

                <SoftInfoBox title="Need to see what the system did?">
                  <Link
                    to="/app/activity-log"
                    style={{
                      color: COLORS.primaryDark,
                      fontWeight: 650,
                      textDecoration: "none",
                    }}
                  >
                    View the Activity Log →
                  </Link>
                </SoftInfoBox>
              </BlockStack>
            </Layout.Section>
          </Layout>

          <div style={{ height: "24px" }} />
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
          color: COLORS.primary,
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
  strong = false,
}: {
  label: string;
  value: string | number;
  tone?: "neutral" | "urgent" | "attention" | "positive";
  strong?: boolean;
}) {
  const background =
    tone === "urgent"
      ? COLORS.dangerSoft
      : tone === "attention"
        ? COLORS.warm
        : tone === "positive"
          ? COLORS.primarySoft
          : COLORS.white;

  const border =
    tone === "urgent"
      ? COLORS.dangerBorder
      : tone === "attention"
        ? COLORS.warmBorder
        : tone === "positive"
          ? COLORS.primarySoftStrong
          : COLORS.border;

  const accent =
    tone === "urgent"
      ? COLORS.dangerText
      : tone === "attention"
        ? COLORS.warmText
        : tone === "positive"
          ? COLORS.primaryDark
          : COLORS.muted;

  return (
    <div
      style={{
        background,
        border: `${strong ? "2px" : "1px"} solid ${border}`,
        borderRadius: "15px",
        padding: "17px 18px",
        minHeight: "112px",
        boxShadow: strong
          ? "0 8px 22px rgba(139,66,66,0.14)"
          : "0 1px 2px rgba(32,34,31,0.02)",
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
        background: emphasis ? COLORS.primarySoft : COLORS.white,
        border: `1px solid ${
          emphasis ? COLORS.primarySoftStrong : COLORS.border
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
              background: COLORS.primaryDark,
              boxShadow: "0 0 0 3px rgba(67,86,109,0.09)",
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
      <Badge tone="info">
        Shipping Today
      </Badge>
    );
  }

  if (
    status ===
    "Due Tomorrow"
  ) {
    return (
      <Badge tone="info">
        Shipping Tomorrow
      </Badge>
    );
  }

  if (
    status ===
    "Pending Selection"
  ) {
    return (
      <Badge tone="info">
        Waiting for Selection
      </Badge>
    );
  }

  if (
    status ===
    "Auto-Select Needed"
  ) {
    return (
      <Badge tone="info">
        Auto-Selection Scheduled
      </Badge>
    );
  }

  if (
    status ===
    "Order Ready"
  ) {
    return (
      <Badge tone="success">
        Ready for Shipping
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
      Action Needed
    </Badge>
  );
}

/* ============================================================
   ACTION NEEDED RULES
   ============================================================ */

type ActionNeededInfo = {
  actionNeeded: boolean;
  reason: string | null;
  recommendedAction: string | null;
  actionLabel: string | null;
  actionUrl: string | null;
};

function getActionNeededInfo({
  id,
  subscriptionStatus,
  workflowStatus,
  hasFulfillmentProfile,
  selectionDeadline,
  autoSelectionDate,
  latestShipmentStatus,
}: {
  id: string;
  subscriptionStatus: string;
  workflowStatus: string;
  hasFulfillmentProfile: boolean;
  selectionDeadline: Date;
  autoSelectionDate: Date | null;
  latestShipmentStatus: string | null;
}): ActionNeededInfo {
  const noAction: ActionNeededInfo = {
    actionNeeded: false,
    reason: null,
    recommendedAction: null,
    actionLabel: null,
    actionUrl: null,
  };

  // Cancelled / paused / otherwise inactive subscriptions should not become
  // human exceptions simply because they are not active.
  if (subscriptionStatus !== "Active") {
    return noAction;
  }

  const customerUrl = `/app/subscriber-view/${id}`;

  if (workflowStatus === "Needs Review") {
    return {
      actionNeeded: true,
      reason: "This subscription has been marked Needs Review.",
      recommendedAction:
        "Open the customer, review the subscription history and current workflow state, then correct the issue before automation continues.",
      actionLabel: "OPEN CUSTOMER",
      actionUrl: customerUrl,
    };
  }

  if (!hasFulfillmentProfile && workflowStatus !== "Fulfilled") {
    return {
      actionNeeded: true,
      reason: "No fulfillment profile is assigned.",
      recommendedAction:
        "Open the customer and confirm which fulfillment profile should control selections, timing, and fulfillment for this subscription.",
      actionLabel: "REVIEW PROFILE",
      actionUrl: customerUrl,
    };
  }

  const failedShipmentStatuses = [
    "failed",
    "error",
    "blocked",
    "exception",
  ];

  if (
    latestShipmentStatus &&
    failedShipmentStatuses.includes(
      latestShipmentStatus.toLowerCase(),
    )
  ) {
    return {
      actionNeeded: true,
      reason: `Shipment status is ${latestShipmentStatus}.`,
      recommendedAction:
        "Open the customer, review the shipment problem, and correct the fulfillment issue before the workflow continues.",
      actionLabel: "REVIEW SHIPMENT",
      actionUrl: customerUrl,
    };
  }

  const today = startOfDay(new Date());
  const deadline = startOfDay(new Date(selectionDeadline));

  if (
    workflowStatus === "Waiting for Selection" &&
    deadline < today &&
    !autoSelectionDate
  ) {
    return {
      actionNeeded: true,
      reason:
        "The selection deadline passed and no automatic fallback is scheduled.",
      recommendedAction:
        "Open the customer and decide the appropriate next step, such as correcting the automation rule, choosing a valid fallback, or contacting the customer.",
      actionLabel: "RESOLVE",
      actionUrl: customerUrl,
    };
  }

  return noAction;
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