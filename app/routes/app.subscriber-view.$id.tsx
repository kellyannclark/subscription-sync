import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import {
  Badge,
  BlockStack,
  InlineStack,
  Layout,
  Page,
  Text,
} from "@shopify/polaris";

import { authenticate } from "../shopify.server";
import db from "../db.server";
import { COLORS } from "../styles/theme";

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
      fulfillmentProfile: true,
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


  const preferenceSubmissions =
    subscriber.preferenceSubmissions as PreferenceSubmissionRow[];

  const shipments =
    subscriber.shipments as ShipmentRow[];

  const selections =
    subscriber.selections;

  const latestSelection =
    selections[0];


  return (
    <div
      style={{
        background: "#F7F7F4",
        minHeight: "100vh",
      }}
    >
      <Page
        title={subscriber.name}
        subtitle={subscriber.email}
        backAction={{
          content: "Back to Subscribers",
          url: "/app/subscriber-list",
        }}
      >
        <Layout>
          <Layout.Section>
            <BlockStack gap="600">

              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
                <Link
                  to={`/app/quick-submit?subscriberId=${encodeURIComponent(subscriber.id)}`}
                  style={{
                    display: "inline-block",
                    borderRadius: 10,
                    background: COLORS.primaryDark,
                    padding: "11px 18px",
                    color: "white",
                    textDecoration: "none",
                    fontWeight: 700,
                  }}
                >
                  Enter Selection
                </Link>
                <span style={{ fontSize: 13, color: COLORS.textSoft }}>
                  Preview only: saving remains disabled until SKU tracking is ready.
                </span>
              </div>

              {/* Main navigation */}
              <nav
                aria-label="SubscriptionSync navigation"
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "10px",
                  alignItems: "center",
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
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "9px 14px",
                      borderRadius: "10px",
                      border: `1px solid ${
                        item.label === "Subscribers"
                          ? COLORS.primaryDark
                          : COLORS.border
                      }`,
                      background:
                        item.label === "Subscribers"
                          ? COLORS.primarySoftStrong
                          : COLORS.white,
                      color: COLORS.primaryDark,
                      fontSize: "13px",
                      fontWeight: 650,
                      textDecoration: "none",
                    }}
                  >
                    {item.label} →
                  </Link>
                ))}
              </nav>

              {/* Compact subscriber status card */}
              <div
                style={{
                  borderRadius: "18px",
                  border: `1px solid ${COLORS.border}`,
                  background: `linear-gradient(
                    105deg,
                    #FCFBF7 0%,
                    #F7F6F1 58%,
                    ${COLORS.primarySoftStrong} 100%
                  )`,
                  padding: "20px 22px",
                  boxShadow: "0 2px 8px rgba(32,34,31,0.04)",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "20px",
                    alignItems: "start",
                  }}
                >
                  <div>
                    <div style={{
                      color: COLORS.textSoft,
                      fontSize: "12px",
                      marginBottom: "8px",
                    }}>
                      Subscription status
                    </div>
                    <SubscriptionStatusBadge
                      status={subscriber.subscriptionStatus}
                    />
                  </div>

                  <div>
                    <div style={{
                      color: COLORS.textSoft,
                      fontSize: "12px",
                      marginBottom: "8px",
                    }}>
                      Workflow status
                    </div>
                    <WorkflowStatusBadge
                      status={subscriber.workflowStatus}
                    />
                  </div>

                  <div>
                    <div style={{
                      color: COLORS.textSoft,
                      fontSize: "12px",
                      marginBottom: "8px",
                    }}>
                      Fulfillment profile
                    </div>
                    <div style={{
                      color: COLORS.text,
                      fontSize: "14px",
                      fontWeight: 650,
                    }}>
                      {subscriber.fulfillmentProfile?.name
                        ?? subscriber.tier?.name
                        ?? "Not assigned"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Essential schedule information */}
              <SoftSection
                eyebrow="Schedule"
                title="Key dates"
                description="Selection and shipping dates recorded for this subscription."
              >
                <InfoRow
                  label="Selection deadline"
                  value={formatDate(
                    subscriber.nextSelectionDeadline
                  )}
                />
                <InfoRow
                  label="Next ship date"
                  value={formatDate(
                    subscriber.nextShipDate
                  )}
                />
                <InfoRow
                  label="Auto-selection date (configured)"
                  value={formatDate(
                    subscriber.autoSelectionDate
                  )}
                />
              </SoftSection>

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
                description="Subscriber-submitted preferences and sizing information."
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
                                Subscriber Form
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
                description="Products chosen by the subscriber or created through SubscriptionSync."
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
                description="Past and upcoming shipment records associated with this subscriber."
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