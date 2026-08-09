import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import {
  Badge,
  BlockStack,
  InlineGrid,
  InlineStack,
  Layout,
  Page,
  Text,
} from "@shopify/polaris";

import { authenticate } from "../shopify.server";
import db from "../db.server";

type PreferenceSubmissionRow = {
  id: string;
  month: string;
  size: string | null;
  style: string | null;
  submittedAt: string | Date;
};

type ShipmentRow = {
  id: string;
  shipDate: string | Date;
  status: string;
  productName: string | null;
  trackingUrl: string | null;
  notes: string | null;
};

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  const subscriberId = params.id;

  if (!subscriberId) {
    throw new Response("Subscriber ID is required", { status: 400 });
  }

  const subscriber = await db.subscriber.findUnique({
    where: {
      id: subscriberId,
    },
    include: {
      tier: true,
      shipments: {
        orderBy: {
          shipDate: "desc",
        },
      },
      preferenceSubmissions: {
        orderBy: {
          submittedAt: "desc",
        },
      },
      selections: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!subscriber) {
    throw new Response("Subscriber not found", { status: 404 });
  }

  return json({ subscriber });
};

export default function SubscriberViewPage() {
  const { subscriber } = useLoaderData<typeof loader>();

  const autoSelectionEnabled = Boolean(
    subscriber.autoSelectionDate,
  );

  const preferenceSubmissions =
    subscriber.preferenceSubmissions as PreferenceSubmissionRow[];

  const shipments =
    subscriber.shipments as ShipmentRow[];

  const selections =
    subscriber.selections;

  const latestSelection =
    selections[0];

  const nextActionLabel =
    subscriber.autoSelectionDate
      ? "Auto-selection scheduled"
      : "Waiting for customer selection";

  return (
    <div
      style={{
        background: "#F7F7F4",
        minHeight: "100vh",
      }}
    >
      <Page
        title="Customer View"
        subtitle="Review this customer's subscription, personalization, and fulfillment history."
        backAction={{
          content: "Subscriber List",
          url: "/app/subscriber-list",
        }}
      >
        <Layout>
          <Layout.Section>
            <BlockStack gap="600">

              {/* ==================================================
                  HERO
                  ================================================== */}

              <div
                style={{
                  position: "relative",
                  overflow: "hidden",
                  border: "1px solid #E4E5DF",
                  borderRadius: "20px",
                  minHeight: "230px",
                  background: `
                    linear-gradient(
                      108deg,
                      #FCFBF7 0%,
                      #F5F4EF 48%,
                      #D8E0D6 74%,
                      #A8B9A9 100%
                    )
                  `,
                  boxShadow:
                    "0 10px 28px rgba(32,34,31,0.06)",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    width: "390px",
                    height: "390px",
                    borderRadius: "50%",
                    background:
                      "radial-gradient(circle, rgba(57,72,61,0.22) 0%, rgba(57,72,61,0.07) 45%, transparent 70%)",
                    right: "-85px",
                    top: "-180px",
                    pointerEvents: "none",
                  }}
                />

                <div
                  style={{
                    position: "absolute",
                    width: "560px",
                    height: "170px",
                    borderRadius: "50%",
                    background:
                      "linear-gradient(135deg, rgba(57,72,61,0.94), rgba(104,122,108,0.74))",
                    right: "-160px",
                    bottom: "-125px",
                    transform: "rotate(-5deg)",
                    pointerEvents: "none",
                  }}
                />

                <div
                  style={{
                    position: "absolute",
                    width: "245px",
                    height: "245px",
                    borderRadius: "50%",
                    border:
                      "1px solid rgba(255,255,255,0.28)",
                    right: "38px",
                    top: "-28px",
                    pointerEvents: "none",
                  }}
                />

                <div
                  style={{
                    position: "relative",
                    zIndex: 2,
                    padding: "36px 38px",
                  }}
                >
                  <InlineStack
                    align="space-between"
                    blockAlign="center"
                    gap="600"
                    wrap
                  >
                    <div
                      style={{
                        maxWidth: "640px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          color: "#4D5E51",
                          marginBottom: "14px",
                        }}
                      >
                        Subscriber profile
                      </div>

                      <div
                        style={{
                          fontSize: "30px",
                          lineHeight: 1.12,
                          fontWeight: 650,
                          letterSpacing: "-0.035em",
                          color: "#20221F",
                          marginBottom: "11px",
                        }}
                      >
                        {subscriber.name}
                        <br />
                        <span
                          style={{
                            color: "#4D5E51",
                          }}
                        >
                          subscription at a glance.
                        </span>
                      </div>

                      <div
                        style={{
                          maxWidth: "560px",
                          fontSize: "14px",
                          lineHeight: 1.6,
                          color: "#52574F",
                        }}
                      >
                        See the customer's subscription
                        details, selection activity,
                        upcoming schedule, and shipment
                        history in one place.
                      </div>
                    </div>

                    <div
                      style={{
                        minWidth: "235px",
                        padding: "18px 20px",
                        borderRadius: "16px",
                        background:
                          "rgba(255,255,255,0.76)",
                        border:
                          "1px solid rgba(255,255,255,0.72)",
                        backdropFilter: "blur(8px)",
                        boxShadow:
                          "0 8px 24px rgba(32,34,31,0.07)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          letterSpacing: "0.10em",
                          textTransform: "uppercase",
                          color: "#4D5E51",
                          marginBottom: "9px",
                        }}
                      >
                        Current status
                      </div>

                      <div
                        style={{
                          marginBottom: "10px",
                        }}
                      >
                        <SubscriptionStatusBadge
                          status={subscriber.subscriptionStatus}
                        />
                      </div>

                      <div
                        style={{
                          fontSize: "12px",
                          lineHeight: 1.45,
                          color: "#787D75",
                        }}
                      >
                        {nextActionLabel}
                      </div>

                      <div
                        style={{
                          height: "1px",
                          background:
                            "rgba(77,94,81,0.12)",
                          margin: "13px 0",
                        }}
                      />

                      <div
                        style={{
                          fontSize: "11px",
                          color: "#52574F",
                        }}
                      >
                        {selections.length} selection
                        {selections.length === 1 ? "" : "s"} •{" "}
                        {shipments.length} shipment
                        {shipments.length === 1 ? "" : "s"}
                      </div>
                    </div>
                  </InlineStack>
                </div>

                <div
                  style={{
                    position: "absolute",
                    top: "15px",
                    right: "15px",
                    background:
                      "rgba(255,255,255,0.76)",
                    border:
                      "1px solid rgba(77,94,81,0.16)",
                    borderRadius: "999px",
                    padding: "7px 11px",
                    backdropFilter: "blur(7px)",
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 650,
                      color: "#4D5E51",
                    }}
                  >
                    ● Development sandbox
                  </span>
                </div>
              </div>

              {/* ==================================================
                  QUICK SUMMARY
                  ================================================== */}

              <div>
                <SectionHeader
                  eyebrow="Overview"
                  title="Customer summary"
                  description="The most important subscription and fulfillment details for this customer."
                />

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(190px, 1fr))",
                    gap: "12px",
                    marginTop: "16px",
                  }}
                >
                  <SummaryCard
                    label="Subscription"
                    value={subscriber.tier?.name ?? "No tier assigned"}
                  />

                  <SummaryCard
                    label="Next ship date"
                    value={formatDate(
                      subscriber.nextShipDate,
                    )}
                  />

                  <SummaryCard
                    label="Selection deadline"
                    value={formatDate(
                      subscriber.nextSelectionDeadline,
                    )}
                  />

                  <SummaryCard
                    label="Auto-selection"
                    value={
                      autoSelectionEnabled
                        ? formatDate(
                            subscriber.autoSelectionDate,
                          )
                        : "Not scheduled"
                    }
                  />
                </div>
              </div>

              {/* ==================================================
                  PROFILE + SCHEDULE
                  ================================================== */}

              <InlineGrid
                columns={{ xs: 1, md: 2 }}
                gap="400"
              >
                <SoftSection
                  eyebrow="Customer"
                  title="Customer information"
                  description="Identity and current subscription status."
                >
                  <InfoRow
                    label="Name"
                    value={subscriber.name}
                  />

                  <InfoRow
                    label="Email"
                    value={subscriber.email}
                  />

                  <InfoRow
                    label="Subscription Tier"
                    value={
                      subscriber.tier?.name ??
                      "No tier assigned"
                    }
                  />

                  <InfoRow
                    label="Subscription Status"
                    valueNode={
                      <SubscriptionStatusBadge
                        status={subscriber.subscriptionStatus}
                      />
                    }
                  />

                  <InfoRow
                    label="Workflow Status"
                    valueNode={
                      <WorkflowStatusBadge
                        status={subscriber.workflowStatus}
                      />
                    }
                  />

                  <InfoRow
                    label="Auto Selection"
                    valueNode={
                      autoSelectionEnabled ? (
                        <Badge tone="success">
                          Scheduled
                        </Badge>
                      ) : (
                        <Badge tone="attention">
                          Not scheduled
                        </Badge>
                      )
                    }
                  />
                </SoftSection>

                <SoftSection
                  eyebrow="Schedule"
                  title="Subscription schedule"
                  description="Upcoming dates that drive this customer's workflow."
                >
                  <InfoRow
                    label="Subscription Start Date"
                    value={formatDate(
                      subscriber.subscriptionStartDate,
                    )}
                  />

                  <InfoRow
                    label="Next Ship Date"
                    value={formatDate(
                      subscriber.nextShipDate,
                    )}
                  />

                  <InfoRow
                    label="Next Selection Deadline"
                    value={formatDate(
                      subscriber.nextSelectionDeadline,
                    )}
                  />

                  <InfoRow
                    label="Auto-Selection Date"
                    value={formatDate(
                      subscriber.autoSelectionDate,
                    )}
                  />
                </SoftSection>
              </InlineGrid>

              {/* ==================================================
                  LATEST SELECTION
                  ================================================== */}

              {latestSelection ? (
                <div
                  style={{
                    background: "#39483D",
                    borderRadius: "18px",
                    padding: "22px 24px",
                    boxShadow:
                      "0 10px 24px rgba(39,51,42,0.10)",
                  }}
                >
                  <InlineStack
                    align="space-between"
                    blockAlign="center"
                    gap="400"
                    wrap
                  >
                    <div>
                      <div
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          letterSpacing: "0.11em",
                          textTransform: "uppercase",
                          color:
                            "rgba(255,255,255,0.62)",
                          marginBottom: "6px",
                        }}
                      >
                        Latest personalization
                      </div>

                      <div
                        style={{
                          fontSize: "18px",
                          fontWeight: 650,
                          color: "#FFFFFF",
                          marginBottom: "4px",
                        }}
                      >
                        {latestSelection.productName ??
                          "Selection recorded"}
                      </div>

                      <div
                        style={{
                          fontSize: "12px",
                          lineHeight: 1.5,
                          color:
                            "rgba(255,255,255,0.65)",
                        }}
                      >
                        {latestSelection.month} •{" "}
                        {latestSelection.source}
                      </div>
                    </div>

                    <Badge>
                      {latestSelection.status}
                    </Badge>
                  </InlineStack>
                </div>
              ) : null}

              {/* ==================================================
                  FORM SUBMISSION HISTORY
                  ================================================== */}

              <HistorySection
                eyebrow="Personalization"
                title="Form submission history"
                description="Customer-submitted preferences and sizing information."
              >
                <div style={{ overflowX: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                    }}
                  >
                    <thead>
                      <tr>
                        <TableHeader>Month</TableHeader>
                        <TableHeader>
                          Selection Status
                        </TableHeader>
                        <TableHeader>
                          Form Submitted
                        </TableHeader>
                        <TableHeader>Size</TableHeader>
                        <TableHeader>Style</TableHeader>
                        <TableHeader>Source</TableHeader>
                      </tr>
                    </thead>

                    <tbody>
                      {preferenceSubmissions.length >
                      0 ? (
                        preferenceSubmissions.map(
                          (submission) => (
                            <tr
                              key={
                                submission.id
                              }
                            >
                              <TableCell>
                                {
                                  submission.month
                                }
                              </TableCell>

                              <TableCell>
                                <Badge tone="success">
                                  Form Submitted
                                </Badge>
                              </TableCell>

                              <TableCell>
                                {formatDate(
                                  submission.submittedAt,
                                )}
                              </TableCell>

                              <TableCell>
                                {submission.size ??
                                  "—"}
                              </TableCell>

                              <TableCell>
                                {submission.style ??
                                  "—"}
                              </TableCell>

                              <TableCell>
                                Customer Form
                              </TableCell>
                            </tr>
                          ),
                        )
                      ) : (
                        <tr>
                          <TableCell colSpan={6}>
                            No submission history
                            available yet.
                          </TableCell>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </HistorySection>

              {/* ==================================================
                  SELECTION HISTORY
                  ================================================== */}

              <HistorySection
                eyebrow="Selections"
                title="Selection history"
                description="Products chosen by the customer or created through SubscriptionSync."
              >
                <div style={{ overflowX: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                    }}
                  >
                    <thead>
                      <tr>
                        <TableHeader>Month</TableHeader>
                        <TableHeader>Product</TableHeader>
                        <TableHeader>Status</TableHeader>
                        <TableHeader>Source</TableHeader>
                        <TableHeader>Created</TableHeader>
                      </tr>
                    </thead>

                    <tbody>
                      {selections.length > 0 ? (
                        selections.map(
                          (selection) => (
                            <tr
                              key={
                                selection.id
                              }
                            >
                              <TableCell>
                                {
                                  selection.month
                                }
                              </TableCell>

                              <TableCell>
                                {selection.productName ??
                                  "—"}
                              </TableCell>

                              <TableCell>
                                <Badge>
                                  {
                                    selection.status
                                  }
                                </Badge>
                              </TableCell>

                              <TableCell>
                                {
                                  selection.source
                                }
                              </TableCell>

                              <TableCell>
                                {formatDate(
                                  selection.createdAt,
                                )}
                              </TableCell>
                            </tr>
                          ),
                        )
                      ) : (
                        <tr>
                          <TableCell colSpan={5}>
                            No selection history
                            available yet.
                          </TableCell>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </HistorySection>

              {/* ==================================================
                  SHIPMENT HISTORY
                  ================================================== */}

              <HistorySection
                eyebrow="Fulfillment"
                title="Shipment history"
                description="Past and upcoming shipment records associated with this customer."
              >
                <div style={{ overflowX: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                    }}
                  >
                    <thead>
                      <tr>
                        <TableHeader>
                          Ship Date
                        </TableHeader>
                        <TableHeader>Status</TableHeader>
                        <TableHeader>Product</TableHeader>
                        <TableHeader>
                          Tracking
                        </TableHeader>
                        <TableHeader>Notes</TableHeader>
                      </tr>
                    </thead>

                    <tbody>
                      {shipments.length > 0 ? (
                        shipments.map(
                          (shipment) => (
                            <tr
                              key={
                                shipment.id
                              }
                            >
                              <TableCell>
                                {formatDate(
                                  shipment.shipDate,
                                )}
                              </TableCell>

                              <TableCell>
                                <Badge>
                                  {
                                    shipment.status
                                  }
                                </Badge>
                              </TableCell>

                              <TableCell>
                                {shipment.productName ??
                                  "—"}
                              </TableCell>

                              <TableCell>
                                {shipment.trackingUrl ? (
                                  <a
                                    href={
                                      shipment.trackingUrl
                                    }
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                      color: "#4D5E51",
                                      fontWeight: 600,
                                    }}
                                  >
                                    View tracking
                                  </a>
                                ) : (
                                  "—"
                                )}
                              </TableCell>

                              <TableCell>
                                {shipment.notes ??
                                  "—"}
                              </TableCell>
                            </tr>
                          ),
                        )
                      ) : (
                        <tr>
                          <TableCell colSpan={5}>
                            No shipment history
                            available yet.
                          </TableCell>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </HistorySection>

              <InlineStack align="end">
                <Link
                  to="/app/subscriber-list"
                  style={{
                    color: "#4D5E51",
                    fontWeight: 650,
                    textDecoration: "none",
                  }}
                >
                  ← Back to Subscriber List
                </Link>
              </InlineStack>

              <div style={{ height: "20px" }} />
            </BlockStack>
          </Layout.Section>
        </Layout>
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
          letterSpacing: "0.11em",
          textTransform: "uppercase",
          color: "#687A6C",
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
          color: "#20221F",
          marginBottom: "5px",
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: "13px",
          lineHeight: 1.5,
          color: "#787D75",
          maxWidth: "700px",
        }}
      >
        {description}
      </div>
    </div>
  );
}

/* ============================================================
   SUMMARY CARD
   ============================================================ */

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid #E4E5DF",
        borderRadius: "15px",
        padding: "18px 19px",
        minHeight: "105px",
        boxShadow:
          "0 1px 2px rgba(32,34,31,0.02)",
      }}
    >
      <div
        style={{
          fontSize: "10px",
          fontWeight: 700,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          color: "#787D75",
          marginBottom: "12px",
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: "14px",
          lineHeight: 1.4,
          fontWeight: 650,
          color: "#20221F",
        }}
      >
        {value}
      </div>
    </div>
  );
}

/* ============================================================
   SOFT SECTION
   ============================================================ */

function SoftSection({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid #E4E5DF",
        borderRadius: "18px",
        padding: "24px",
        boxShadow:
          "0 2px 8px rgba(32,34,31,0.025)",
      }}
    >
      <BlockStack gap="400">
        <SectionHeader
          eyebrow={eyebrow}
          title={title}
          description={description}
        />

        <div
          style={{
            background: "#EEF1ED",
            border: "1px solid #E4EAE3",
            borderRadius: "14px",
            padding: "18px",
          }}
        >
          <BlockStack gap="300">
            {children}
          </BlockStack>
        </div>
      </BlockStack>
    </div>
  );
}

/* ============================================================
   HISTORY SECTION
   ============================================================ */

function HistorySection({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid #E4E5DF",
        borderRadius: "18px",
        overflow: "hidden",
        boxShadow:
          "0 2px 8px rgba(32,34,31,0.025)",
      }}
    >
      <div
        style={{
          padding: "22px 24px 18px",
          borderBottom: "1px solid #E4E5DF",
        }}
      >
        <SectionHeader
          eyebrow={eyebrow}
          title={title}
          description={description}
        />
      </div>

      {children}
    </div>
  );
}

/* ============================================================
   SUBSCRIPTION STATUS
   ============================================================ */

function SubscriptionStatusBadge({
  status,
}: {
  status: string;
}) {
  switch (status) {
    case "Active":
      return (
        <Badge tone="success">
          Active
        </Badge>
      );

    case "Paused":
      return (
        <Badge tone="attention">
          Paused
        </Badge>
      );

    case "Cancelled":
      return (
        <Badge tone="critical">
          Cancelled
        </Badge>
      );

    case "Reactivated":
      return (
        <Badge tone="info">
          Reactivated
        </Badge>
      );

    default:
      return (
        <Badge>
          {status}
        </Badge>
      );
  }
}

/* ============================================================
   WORKFLOW STATUS
   ============================================================ */

function WorkflowStatusBadge({
  status,
}: {
  status: string;
}) {
  switch (status) {
    case "Waiting for Selection":
      return (
        <Badge tone="info">
          Waiting for Selection
        </Badge>
      );

    case "Selection Submitted":
      return (
        <Badge tone="success">
          Selection Submitted
        </Badge>
      );

    case "Auto Selected":
      return (
        <Badge tone="attention">
          Auto Selected
        </Badge>
      );

    case "Ready for Fulfillment":
      return (
        <Badge tone="success">
          Ready for Fulfillment
        </Badge>
      );

    case "Fulfilled":
      return (
        <Badge tone="success">
          Fulfilled
        </Badge>
      );

    case "Needs Review":
      return (
        <Badge tone="critical">
          Needs Review
        </Badge>
      );

    default:
      return (
        <Badge>
          {status}
        </Badge>
      );
  }
}

/* ============================================================
   INFO ROW
   ============================================================ */

function InfoRow({
  label,
  value,
  valueNode,
}: {
  label: string;
  value?: string;
  valueNode?: React.ReactNode;
}) {
  return (
    <InlineStack
      align="space-between"
      gap="300"
      blockAlign="center"
      wrap={false}
    >
      <div
        style={{
          fontSize: "12px",
          color: "#787D75",
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: "13px",
          fontWeight: 600,
          color: "#20221F",
          textAlign: "right",
        }}
      >
        {valueNode ?? value}
      </div>
    </InlineStack>
  );
}

/* ============================================================
   TABLE HEADER
   ============================================================ */

function TableHeader({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <th
      style={{
        textAlign: "left",
        padding: "12px 14px",
        borderBottom:
          "1px solid #E4E5DF",
        background: "#F7F7F4",
        color: "#52574F",
        fontSize: "11px",
        fontWeight: 700,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
      }}
    >
      {children}
    </th>
  );
}

/* ============================================================
   TABLE CELL
   ============================================================ */

function TableCell({
  children,
  colSpan,
}: {
  children: React.ReactNode;
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      style={{
        padding: "13px 14px",
        borderBottom:
          "1px solid #ECEDE8",
        color: "#20221F",
        fontSize: "13px",
        verticalAlign: "top",
      }}
    >
      {children}
    </td>
  );
}

/* ============================================================
   DATE
   ============================================================ */

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
      month: "short",
      day: "numeric",
      year: "numeric",
    },
  ).format(
    new Date(date),
  );
}