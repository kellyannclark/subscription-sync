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

  // SAFETY: Unfinished Daily Queue actions are disabled
  // in production and disabled by default in development.
  if (
    process.env.NODE_ENV === "production" ||
    process.env.ENABLE_DAILY_QUEUE_ACTIONS !== "true"
  ) {
    return json(
      {
        success: false,
        message: "Daily Queue actions are disabled pending integration testing.",
      },
      { status: 403 },
    );
  }

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

export default function SubscriptionSyncHomePage() {
  const { stats, queueSubscribers } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();

  const filter = searchParams.get("filter") || "action-needed";

  const setFilter = (value: string) => {
    const nextParams = new URLSearchParams(searchParams.toString());

    nextParams.set("filter", value);

    setSearchParams(nextParams);
  };

  const filteredSubscribers = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const sevenDayEnd = new Date(today);
    sevenDayEnd.setDate(sevenDayEnd.getDate() + 7);

    const parseDay = (value: string) => {
      const date = new Date(value);

      if (Number.isNaN(date.getTime())) {
        return null;
      }

      return new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      );
    };

    return queueSubscribers.filter((subscriber) => {
      const waiting =
        subscriber.workflowStatus === "Waiting for Selection";

      const deadline = parseDay(subscriber.selectionDeadline);
      const autoDate = parseDay(subscriber.autoSelectDate);
      const shipDate = parseDay(subscriber.nextShipDate);

      const selectionDue =
        waiting &&
        (
          (deadline !== null && deadline <= today) ||
          (autoDate !== null && autoDate <= today)
        );

      let matchesWorkflow = false;

      switch (filter) {
        case "action-needed":
          matchesWorkflow = subscriber.actionNeeded;
          break;

        case "all":
          matchesWorkflow = true;
          break;

        case "pending-selection":
          matchesWorkflow = waiting && !selectionDue;
          break;

        case "auto-select-needed":
          matchesWorkflow = selectionDue;
          break;

        case "order-ready":
          matchesWorkflow = subscriber.status === "Order Ready";
          break;

        case "fulfilled":
          matchesWorkflow = subscriber.status === "Fulfilled";
          break;

        // Preserve existing Dashboard links.
        case "selections-in-progress":
          matchesWorkflow = waiting;
          break;

        case "shipments-pending":
          matchesWorkflow =
            subscriber.shipmentStatus?.toLowerCase() === "pending";
          break;

        case "due-today":
          matchesWorkflow =
            shipDate !== null &&
            shipDate.getTime() === today.getTime();
          break;

        case "due-tomorrow":
          matchesWorkflow =
            shipDate !== null &&
            shipDate.getTime() === tomorrow.getTime();
          break;

        default:
          matchesWorkflow = true;
      }

      return matchesWorkflow;
    });
  }, [filter, queueSubscribers]);

  // Keep older Dashboard links recognizable in the dropdown.
  const legacyFilterLabels: Record<string, string> = {
    "selections-in-progress": "Selections In Progress (Dashboard)",
    "shipments-pending": "Pending Shipments (Dashboard)",
    "due-today": "Shipping Today (Dashboard)",
    "due-tomorrow": "Shipping Tomorrow (Dashboard)",
  };


  return (
    <div
      style={{
        background: COLORS.page,
        minHeight: "100vh",
      }}
    >
      <Page>
        <BlockStack gap="500">
          <nav
            aria-label="SubscriptionSync quick navigation"
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "10px",
              background: COLORS.white,
              border: `1px solid ${COLORS.border}`,
              borderRadius: "18px",
              padding: "14px 18px",
            }}
          >
            <style>{`
              .ss-home-nav-link {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-height: 40px;
                padding: 10px 16px;
                border: 1px solid ${COLORS.border};
                border-radius: 10px;
                background: ${COLORS.white};
                color: ${COLORS.primaryDark};
                text-decoration: none;
                font-size: 13px;
                font-weight: 700;
                transition: background-color 0.15s ease,
                            border-color 0.15s ease,
                            box-shadow 0.15s ease;
              }

              .ss-home-nav-link:hover {
                background: ${COLORS.primarySoftStrong};
                border-color: ${COLORS.primaryDark};
                box-shadow: 0 2px 6px rgba(32,34,31,0.09);
              }

              .ss-home-nav-link:focus-visible {
                outline: 2px solid ${COLORS.primaryDark};
                outline-offset: 3px;
              }
            `}</style>

            <span
              aria-current="page"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "40px",
                padding: "10px 16px",
                borderRadius: "10px",
                background: COLORS.primarySoftStrong,
                border: `1px solid ${COLORS.primaryDark}`,
                color: COLORS.primaryDark,
                fontSize: "13px",
                fontWeight: 750,
              }}
            >
              Home
            </span>

            <Link
              className="ss-home-nav-link"
              to="/app/subscriber-list"
            >
              Subscribers →
            </Link>

            <Link
              className="ss-home-nav-link"
              to="/app/activity-log"
            >
              Activity →
            </Link>

            <Link
              className="ss-home-nav-link"
              to="/app/settings"
            >
              Settings →
            </Link>
          </nav>
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
                Needs Attention
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
                Review subscriptions requiring attention, or use the workflow
                filter to inspect other subscription activity. Automated
                processing remains disabled until testing is complete.
              </div>
            </div>
          </div>



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

                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "12px",
                          minWidth: 0,
                        }}
                      >
                        <div
                          style={{
                            minWidth: "220px",
                            flex: "1 1 220px",
                          }}
                        >
                          <Select
                            label="Workflow status"
                            value={filter}
                            onChange={setFilter}
                            options={[
                              ...(legacyFilterLabels[filter]
                                ? [{
                                    label: legacyFilterLabels[filter],
                                    value: filter,
                                  }]
                                : []),
                              {
                                label: "Action Needed",
                                value: "action-needed",
                              },
                              {
                                label: "All Workflow Activity",
                                value: "all",
                              },
                              {
                                label: "Waiting for Selection",
                                value: "pending-selection",
                              },
                              {
                                label: "Auto-Selection Due",
                                value: "auto-select-needed",
                              },
                              {
                                label: "Ready for Fulfillment",
                                value: "order-ready",
                              },
                              {
                                label: "Fulfilled",
                                value: "fulfilled",
                              },
                            ]}
                          />
                        </div>

                      </div>
                    </InlineStack>
                  </div>

                  <Divider />

                  <div style={{ overflow: "hidden" }}>
                    {queueSubscribers.length === 0 ? (
                      <Box padding="600">
                        <BlockStack gap="200">
                          <Text as="h3" variant="headingSm">
                            No subscriber data available
                          </Text>
                          <Text as="p" tone="subdued">
                            The connected database contains no subscriber records.
                            Verify synchronization or add test subscribers
                            before evaluating workflow activity.
                          </Text>
                        </BlockStack>
                      </Box>
                    ) : filter === "action-needed" ? (
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
                            No matching exceptions in the current data. Automation has not yet been verified.
                          </div>
                        </div>
                      ) : (
                        <div
                          style={{
                            display: "grid",
                            gap: "12px",
                            padding: "16px",
                          }}
                        >
                          {filteredSubscribers.map((subscriber) => (
                            <div
                              key={subscriber.id}
                              style={{
                                border: `1px solid ${COLORS.border}`,
                                borderRadius: "12px",
                                padding: "18px",
                                background: COLORS.white,
                                minWidth: 0,
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "flex-start",
                                  flexWrap: "wrap",
                                  gap: "12px",
                                }}
                              >
                                <div style={{ minWidth: 0 }}>
                                  <div
                                    style={{
                                      fontSize: "15px",
                                      fontWeight: 700,
                                      color: COLORS.text,
                                    }}
                                  >
                                    {subscriber.name}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: "12px",
                                      color: COLORS.muted,
                                      overflowWrap: "anywhere",
                                    }}
                                  >
                                    {subscriber.email}
                                  </div>
                                </div>
                                <Badge tone="critical">
                                  Action needed
                                </Badge>
                              </div>

                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns:
                                    "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
                                  gap: "18px",
                                  marginTop: "18px",
                                }}
                              >
                                <div style={{ minWidth: 0 }}>
                                  <div
                                    style={{
                                      fontSize: "11px",
                                      fontWeight: 700,
                                      color: COLORS.muted,
                                      marginBottom: "6px",
                                    }}
                                  >
                                    WHY IT NEEDS ATTENTION
                                  </div>
                                  <div
                                    style={{
                                      fontSize: "13px",
                                      lineHeight: 1.6,
                                      color: COLORS.dangerText,
                                      whiteSpace: "normal",
                                      overflowWrap: "anywhere",
                                    }}
                                  >
                                    {subscriber.actionReason}
                                  </div>
                                </div>

                                <div style={{ minWidth: 0 }}>
                                  <div
                                    style={{
                                      fontSize: "11px",
                                      fontWeight: 700,
                                      color: COLORS.muted,
                                      marginBottom: "6px",
                                    }}
                                  >
                                    RECOMMENDED NEXT STEP
                                  </div>
                                  <div
                                    style={{
                                      fontSize: "13px",
                                      lineHeight: 1.6,
                                      color: COLORS.textSoft,
                                      whiteSpace: "normal",
                                      overflowWrap: "anywhere",
                                    }}
                                  >
                                    {subscriber.recommendedAction}
                                  </div>
                                </div>
                              </div>

                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  gap: "12px",
                                  flexWrap: "wrap",
                                  marginTop: "18px",
                                  paddingTop: "14px",
                                  borderTop: `1px solid ${COLORS.border}`,
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: "12px",
                                    color: COLORS.muted,
                                  }}
                                >
                                  Selection deadline:{" "}
                                  <strong>
                                    {subscriber.selectionDeadline}
                                  </strong>
                                </div>
                                {subscriber.actionUrl && (
                                  <Link
                                    to={subscriber.actionUrl}
                                    style={{
                                      color: COLORS.primaryDark,
                                      fontSize: "13px",
                                      fontWeight: 650,
                                      textDecoration: "none",
                                    }}
                                  >
                                    View subscriber →
                                  </Link>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
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
                          { title: "Subscriber" },
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
        Auto-Selection Due
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
      actionLabel: "OPEN SUBSCRIBER",
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