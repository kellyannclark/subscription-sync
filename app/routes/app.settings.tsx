import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
} from "@remix-run/node";

import { json } from "@remix-run/node";

import {
  Form,
  useActionData,
  useLoaderData,
  useNavigation,
} from "@remix-run/react";

import { useState } from "react";

import {
  Badge,
  Banner,
  BlockStack,
  Button,
  Divider,
  InlineStack,
  Page,
  Select,
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

type SettingsData = {
  automationEnabled: boolean;

  selectionDeadlineOffset: string;
  autoSelectionOffset: string;
  orderCreationOffset: string;

  autoOrderTag: string;
  customerSelectedTag: string;
  modifiedOrderTag: string;

  hideOutOfStock: boolean;
  hideDiscontinued: boolean;
  allowBackorders: boolean;

  autoCreateOrders: boolean;
  requireManualReview: boolean;

  reminder14Days: boolean;
  reminder7Days: boolean;
  reminder3Days: boolean;
  reminder1Day: boolean;

  emailSender: string;
  testSubscriberEmail: string;

  storeUrl: string;

  shopifyConnected: boolean;
  appstleConnected: boolean;
  databaseConnected: boolean;

  lastSync: string;
};

type ActionResponse = {
  success: boolean;
  message: string;
};

/* ============================================================
   LOADER
   ============================================================ */

export const loader = async ({
  request,
}: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  const existingSettings =
    await db.settings.findFirst();

  const savedSettings =
    existingSettings ??
    (await db.settings.create({
      data: {
        automationEnabled: true,

        selectionDeadlineOffset: 7,
        autoSelectionOffset: 2,
        orderCreationOffset: 1,

        reminder14Days: true,
        reminder7Days: true,
        reminder3Days: true,
        reminder1Day: true,

        senderEmail:
          "support@littleadventures.com",

        hideOutOfStock: true,
        hideDiscontinued: true,
        allowBackorders: false,

        autoCreateOrders: true,
        requireManualReview: false,

        autoOrderTag:
          "SubscriptionSync-Auto",

        customerSelectedTag:
          "MonthlySelection",

        modifiedOrderTag:
          "AppstleSync",
      },
    }));

  const settings: SettingsData = {
    automationEnabled:
      savedSettings.automationEnabled,

    selectionDeadlineOffset:
      String(
        savedSettings.selectionDeadlineOffset,
      ),

    autoSelectionOffset:
      String(
        savedSettings.autoSelectionOffset,
      ),

    orderCreationOffset:
      String(
        savedSettings.orderCreationOffset,
      ),

    autoOrderTag:
      savedSettings.autoOrderTag ??
      "SubscriptionSync-Auto",

    customerSelectedTag:
      savedSettings.customerSelectedTag ??
      "MonthlySelection",

    modifiedOrderTag:
      savedSettings.modifiedOrderTag ??
      "AppstleSync",

    hideOutOfStock:
      savedSettings.hideOutOfStock,

    hideDiscontinued:
      savedSettings.hideDiscontinued,

    allowBackorders:
      savedSettings.allowBackorders,

    autoCreateOrders:
      savedSettings.autoCreateOrders,

    requireManualReview:
      savedSettings.requireManualReview,

    reminder14Days:
      savedSettings.reminder14Days,

    reminder7Days:
      savedSettings.reminder7Days,

    reminder3Days:
      savedSettings.reminder3Days,

    reminder1Day:
      savedSettings.reminder1Day,

    emailSender:
      savedSettings.senderEmail ?? "",

    testSubscriberEmail: "",

    storeUrl:
      "https://littleadventures.com",

    /*
     * Sandbox integration status.
     *
     * These can later be replaced with
     * real integration health checks.
     */
    shopifyConnected: true,
    appstleConnected: false,
    databaseConnected: true,

    lastSync:
      formatDateTime(
        savedSettings.updatedAt,
      ),
  };

  return json({
    settings,
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
     SYNC
     ========================================================== */

  if (
    intent ===
    "sync-now"
  ) {
    await db.activityLog.create({
      data: {
        eventType: "Sync",

        description:
          "Manual settings sync check started.",

        status: "Success",

        user: "Admin",

        source: "Settings",
      },
    });

    return json<ActionResponse>({
      success: true,

      message:
        "Sync check completed successfully.",
    });
  }

  /* ==========================================================
     TEST REMINDER
     ========================================================== */

  if (
    intent ===
    "test-reminder"
  ) {
    const testSubscriberEmail =
      formData.get(
        "testSubscriberEmail",
      );

    if (
      !testSubscriberEmail ||
      typeof testSubscriberEmail !==
        "string"
    ) {
      return json<ActionResponse>({
        success: false,

        message:
          "Enter a test subscriber email before sending a reminder.",
      });
    }

    await db.activityLog.create({
      data: {
        eventType:
          "Reminder",

        description:
          `Test reminder prepared for ${testSubscriberEmail}.`,

        status:
          "Success",

        user:
          "Admin",

        source:
          "Settings",
      },
    });

    return json<ActionResponse>({
      success: true,

      message:
        `Test reminder prepared for ${testSubscriberEmail}.`,
    });
  }

  /* ==========================================================
     TEST ORDER
     ========================================================== */

  if (
    intent ===
    "generate-test-order"
  ) {
    await db.activityLog.create({
      data: {
        eventType:
          "Order",

        description:
          "Sandbox test order generation started.",

        status:
          "Success",

        user:
          "Admin",

        source:
          "Settings",
      },
    });

    return json<ActionResponse>({
      success: true,

      message:
        "Sandbox test order generation started.",
    });
  }

  /* ==========================================================
     SAVE SETTINGS
     ========================================================== */

  const existingSettings =
    await db.settings.findFirst();

  const settingsData = {
    automationEnabled:
      formData.get(
        "automationEnabled",
      ) === "true",

    selectionDeadlineOffset:
      Number(
        formData.get(
          "selectionDeadlineOffset",
        ) ?? 7,
      ),

    autoSelectionOffset:
      Number(
        formData.get(
          "autoSelectionOffset",
        ) ?? 2,
      ),

    orderCreationOffset:
      Number(
        formData.get(
          "orderCreationOffset",
        ) ?? 1,
      ),

    reminder14Days:
      formData.get(
        "reminder14Days",
      ) === "true",

    reminder7Days:
      formData.get(
        "reminder7Days",
      ) === "true",

    reminder3Days:
      formData.get(
        "reminder3Days",
      ) === "true",

    reminder1Day:
      formData.get(
        "reminder1Day",
      ) === "true",

    senderEmail:
      String(
        formData.get(
          "emailSender",
        ) ?? "",
      ),

    hideOutOfStock:
      formData.get(
        "hideOutOfStock",
      ) === "true",

    hideDiscontinued:
      formData.get(
        "hideDiscontinued",
      ) === "true",

    allowBackorders:
      formData.get(
        "allowBackorders",
      ) === "true",

    autoCreateOrders:
      formData.get(
        "autoCreateOrders",
      ) === "true",

    requireManualReview:
      formData.get(
        "requireManualReview",
      ) === "true",

    autoOrderTag:
      String(
        formData.get(
          "autoOrderTag",
        ) ?? "",
      ),

    customerSelectedTag:
      String(
        formData.get(
          "customerSelectedTag",
        ) ?? "",
      ),

    modifiedOrderTag:
      String(
        formData.get(
          "modifiedOrderTag",
        ) ?? "",
      ),
  };

  if (
    existingSettings
  ) {
    await db.settings.update({
      where: {
        id:
          existingSettings.id,
      },

      data:
        settingsData,
    });
  } else {
    await db.settings.create({
      data:
        settingsData,
    });
  }

  await db.activityLog.create({
    data: {
      eventType:
        "Settings",

      description:
        "SubscriptionSync settings were updated.",

      status:
        "Success",

      user:
        "Admin",

      source:
        "Settings",
    },
  });

  return json<ActionResponse>({
    success: true,

    message:
      "Settings saved successfully.",
  });
};

/* ============================================================
   PAGE
   ============================================================ */

export default function SettingsPage() {
  const {
    settings,
  } = useLoaderData<typeof loader>();

  const actionData =
    useActionData<typeof action>();

  const navigation =
    useNavigation();

  const isSubmitting =
    navigation.state ===
    "submitting";

  const [
    intent,
    setIntent,
  ] = useState("save");

  /* ==========================================================
     AUTOMATION
     ========================================================== */

  const [
    automationEnabled,
    setAutomationEnabled,
  ] =
    useState(
      settings.automationEnabled,
    );

  const [
    selectionDeadlineOffset,
    setSelectionDeadlineOffset,
  ] =
    useState(
      settings.selectionDeadlineOffset,
    );

  const [
    autoSelectionOffset,
    setAutoSelectionOffset,
  ] =
    useState(
      settings.autoSelectionOffset,
    );

  const [
    orderCreationOffset,
    setOrderCreationOffset,
  ] =
    useState(
      settings.orderCreationOffset,
    );

  /* ==========================================================
     REMINDERS
     ========================================================== */

  const [
    reminder14Days,
    setReminder14Days,
  ] =
    useState(
      settings.reminder14Days,
    );

  const [
    reminder7Days,
    setReminder7Days,
  ] =
    useState(
      settings.reminder7Days,
    );

  const [
    reminder3Days,
    setReminder3Days,
  ] =
    useState(
      settings.reminder3Days,
    );

  const [
    reminder1Day,
    setReminder1Day,
  ] =
    useState(
      settings.reminder1Day,
    );

  /* ==========================================================
     EMAIL
     ========================================================== */

  const [
    emailSender,
    setEmailSender,
  ] =
    useState(
      settings.emailSender,
    );

  const [
    testSubscriberEmail,
    setTestSubscriberEmail,
  ] =
    useState(
      settings.testSubscriberEmail,
    );

  /* ==========================================================
     INVENTORY
     ========================================================== */

  const [
    hideOutOfStock,
    setHideOutOfStock,
  ] =
    useState(
      settings.hideOutOfStock,
    );

  const [
    hideDiscontinued,
    setHideDiscontinued,
  ] =
    useState(
      settings.hideDiscontinued,
    );

  const [
    allowBackorders,
    setAllowBackorders,
  ] =
    useState(
      settings.allowBackorders,
    );

  /* ==========================================================
     ORDERS
     ========================================================== */

  const [
    autoCreateOrders,
    setAutoCreateOrders,
  ] =
    useState(
      settings.autoCreateOrders,
    );

  const [
    requireManualReview,
    setRequireManualReview,
  ] =
    useState(
      settings.requireManualReview,
    );

  const [
    autoOrderTag,
    setAutoOrderTag,
  ] =
    useState(
      settings.autoOrderTag,
    );

  const [
    customerSelectedTag,
    setCustomerSelectedTag,
  ] =
    useState(
      settings.customerSelectedTag,
    );

  const [
    modifiedOrderTag,
    setModifiedOrderTag,
  ] =
    useState(
      settings.modifiedOrderTag,
    );

  const enabledReminderCount = [
    reminder14Days,
    reminder7Days,
    reminder3Days,
    reminder1Day,
  ].filter(Boolean).length;

  const connectedServiceCount = [
    settings.shopifyConnected,
    settings.appstleConnected,
    settings.databaseConnected,
    Boolean(emailSender),
  ].filter(Boolean).length;

  return (
    <div
      style={{
        background: COLORS.page,
        minHeight: "100vh",
      }}
    >
      <Page
        title="Settings"
        subtitle="Manage system-wide automation, reminders, product rules, integrations, and order processing."
        backAction={{
          content:
            "Dashboard",

          url:
            "/app",
        }}
      >
        <Form method="post">

          {/* ==================================================
              HIDDEN VALUES
              ================================================== */}

          <input
            type="hidden"
            name="intent"
            value={intent}
          />

          <input
            type="hidden"
            name="automationEnabled"
            value={String(
              automationEnabled,
            )}
          />

          <input
            type="hidden"
            name="selectionDeadlineOffset"
            value={
              selectionDeadlineOffset
            }
          />

          <input
            type="hidden"
            name="autoSelectionOffset"
            value={
              autoSelectionOffset
            }
          />

          <input
            type="hidden"
            name="orderCreationOffset"
            value={
              orderCreationOffset
            }
          />

          <input
            type="hidden"
            name="reminder14Days"
            value={String(
              reminder14Days,
            )}
          />

          <input
            type="hidden"
            name="reminder7Days"
            value={String(
              reminder7Days,
            )}
          />

          <input
            type="hidden"
            name="reminder3Days"
            value={String(
              reminder3Days,
            )}
          />

          <input
            type="hidden"
            name="reminder1Day"
            value={String(
              reminder1Day,
            )}
          />

          <input
            type="hidden"
            name="emailSender"
            value={
              emailSender
            }
          />

          <input
            type="hidden"
            name="hideOutOfStock"
            value={String(
              hideOutOfStock,
            )}
          />

          <input
            type="hidden"
            name="hideDiscontinued"
            value={String(
              hideDiscontinued,
            )}
          />

          <input
            type="hidden"
            name="allowBackorders"
            value={String(
              allowBackorders,
            )}
          />

          <input
            type="hidden"
            name="autoCreateOrders"
            value={String(
              autoCreateOrders,
            )}
          />

          <input
            type="hidden"
            name="requireManualReview"
            value={String(
              requireManualReview,
            )}
          />

          <input
            type="hidden"
            name="autoOrderTag"
            value={
              autoOrderTag
            }
          />

          <input
            type="hidden"
            name="customerSelectedTag"
            value={
              customerSelectedTag
            }
          />

          <input
            type="hidden"
            name="modifiedOrderTag"
            value={
              modifiedOrderTag
            }
          />

          <input
            type="hidden"
            name="testSubscriberEmail"
            value={
              testSubscriberEmail
            }
          />

          <BlockStack gap="600">

            {/* ==================================================
                RESULT
                ================================================== */}

            {actionData?.message && (
              <Banner
                title={
                  actionData.success
                    ? "Action completed"
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
                HERO
                ================================================== */}

            <div
              style={{
                position: "relative",
                overflow: "hidden",

                border:
                  `1px solid ${COLORS.border}`,

                borderRadius: "20px",

                minHeight: "225px",

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

                  transform:
                    "rotate(-5deg)",

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

                  padding:
                    "36px 38px",
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
                      maxWidth: "650px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "11px",

                        fontWeight: 700,

                        letterSpacing:
                          "0.12em",

                        textTransform:
                          "uppercase",

                        color:
                          COLORS.sageDark,

                        marginBottom:
                          "14px",
                      }}
                    >
                      System controls
                    </div>

                    <div
                      style={{
                        fontSize: "30px",

                        lineHeight: 1.12,

                        fontWeight: 650,

                        letterSpacing:
                          "-0.035em",

                        color:
                          COLORS.text,

                        marginBottom:
                          "11px",
                      }}
                    >
                      Set the rules once.
                      <br />

                      <span
                        style={{
                          color:
                            COLORS.sageDark,
                        }}
                      >
                        Let the workflow follow them.
                      </span>
                    </div>

                    <div
                      style={{
                        maxWidth: "580px",

                        fontSize: "14px",

                        lineHeight: 1.6,

                        color:
                          COLORS.textSoft,
                      }}
                    >
                      Configure the default behavior
                      SubscriptionSync uses across
                      reminders, customer choices,
                      product availability, and
                      fulfillment.
                    </div>
                  </div>

                  <div
                    style={{
                      minWidth: "230px",

                      padding:
                        "18px 20px",

                      borderRadius: "16px",

                      background:
                        "rgba(255,255,255,0.76)",

                      border:
                        "1px solid rgba(255,255,255,0.72)",

                      backdropFilter:
                        "blur(8px)",

                      boxShadow:
                        "0 8px 24px rgba(32,34,31,0.07)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "10px",

                        fontWeight: 700,

                        letterSpacing:
                          "0.10em",

                        textTransform:
                          "uppercase",

                        color:
                          COLORS.sageDark,

                        marginBottom:
                          "9px",
                      }}
                    >
                      Automation
                    </div>

                    <div
                      style={{
                        fontSize: "22px",

                        lineHeight: 1.1,

                        fontWeight: 650,

                        color:
                          automationEnabled
                            ? COLORS.sageDark
                            : COLORS.warmText,

                        marginBottom:
                          "8px",
                      }}
                    >
                      {automationEnabled
                        ? "Enabled"
                        : "Paused"}
                    </div>

                    <div
                      style={{
                        fontSize: "12px",
                        lineHeight: 1.45,
                        color: COLORS.muted,
                      }}
                    >
                      {enabledReminderCount} reminder
                      {enabledReminderCount === 1
                        ? ""
                        : "s"}{" "}
                      active
                    </div>

                    <div
                      style={{
                        height: "1px",
                        background:
                          "rgba(77,94,81,0.12)",
                        margin:
                          "13px 0",
                      }}
                    />

                    <div
                      style={{
                        fontSize: "11px",
                        color:
                          COLORS.textSoft,
                      }}
                    >
                      {connectedServiceCount} of 4
                      services connected
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

                  backdropFilter:
                    "blur(7px)",
                }}
              >
                <span
                  style={{
                    fontSize: "11px",

                    fontWeight: 650,

                    color:
                      COLORS.sageDark,
                  }}
                >
                  ● Development settings
                </span>
              </div>
            </div>

            {/* ==================================================
                AUTOMATION TIMELINE
                ================================================== */}

            <SettingsSection
              eyebrow="Automation"
              title="Automation timeline"
              description="Set the default timing SubscriptionSync uses relative to each subscriber's next ship date."
            >
              <ToggleSetting
                label="Automatic daily processing"
                description="Allow SubscriptionSync to check each day for reminders, automatic selection, and orders that are ready to be created."
                enabled={
                  automationEnabled
                }
                onToggle={() =>
                  setAutomationEnabled(
                    (current) =>
                      !current,
                  )
                }
              />

              <Divider />

              <div
                style={{
                  display: "grid",

                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(220px, 1fr))",

                  gap:
                    "14px",
                }}
              >
                <TimelineCard
                  step="01"
                  title="Customer selection"
                  description="Selection deadline"
                >
                  <Select
                    label="Customer selection deadline"
                    labelHidden
                    value={
                      selectionDeadlineOffset
                    }
                    onChange={
                      setSelectionDeadlineOffset
                    }
                    options={[
                      {
                        label:
                          "3 days before shipment",
                        value:
                          "3",
                      },
                      {
                        label:
                          "5 days before shipment",
                        value:
                          "5",
                      },
                      {
                        label:
                          "7 days before shipment",
                        value:
                          "7",
                      },
                      {
                        label:
                          "10 days before shipment",
                        value:
                          "10",
                      },
                      {
                        label:
                          "14 days before shipment",
                        value:
                          "14",
                      },
                    ]}
                  />
                </TimelineCard>

                <TimelineCard
                  step="02"
                  title="Automatic selection"
                  description="If the customer has not selected"
                >
                  <Select
                    label="Automatic selection timing"
                    labelHidden
                    value={
                      autoSelectionOffset
                    }
                    onChange={
                      setAutoSelectionOffset
                    }
                    options={[
                      {
                        label:
                          "1 day before shipment",
                        value:
                          "1",
                      },
                      {
                        label:
                          "2 days before shipment",
                        value:
                          "2",
                      },
                      {
                        label:
                          "3 days before shipment",
                        value:
                          "3",
                      },
                      {
                        label:
                          "5 days before shipment",
                        value:
                          "5",
                      },
                    ]}
                  />
                </TimelineCard>

                <TimelineCard
                  step="03"
                  title="Create Shopify order"
                  description="Order preparation timing"
                >
                  <Select
                    label="Order creation timing"
                    labelHidden
                    value={
                      orderCreationOffset
                    }
                    onChange={
                      setOrderCreationOffset
                    }
                    options={[
                      {
                        label:
                          "Same day as shipment",
                        value:
                          "0",
                      },
                      {
                        label:
                          "1 day before shipment",
                        value:
                          "1",
                      },
                      {
                        label:
                          "2 days before shipment",
                        value:
                          "2",
                      },
                      {
                        label:
                          "3 days before shipment",
                        value:
                          "3",
                      },
                    ]}
                  />
                </TimelineCard>
              </div>
            </SettingsSection>

            {/* ==================================================
                REMINDERS
                ================================================== */}

            <SettingsSection
              eyebrow="Communication"
              title="Customer reminders"
              description="Choose which reminders customers receive before their selection deadline."
            >
              <div
                style={{
                  display: "grid",

                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(180px, 1fr))",

                  gap:
                    "12px",
                }}
              >
                <CompactToggle
                  title="14 days"
                  description="Early reminder"
                  enabled={
                    reminder14Days
                  }
                  onToggle={() =>
                    setReminder14Days(
                      (current) =>
                        !current,
                    )
                  }
                />

                <CompactToggle
                  title="7 days"
                  description="One week reminder"
                  enabled={
                    reminder7Days
                  }
                  onToggle={() =>
                    setReminder7Days(
                      (current) =>
                        !current,
                    )
                  }
                />

                <CompactToggle
                  title="3 days"
                  description="Deadline approaching"
                  enabled={
                    reminder3Days
                  }
                  onToggle={() =>
                    setReminder3Days(
                      (current) =>
                        !current,
                    )
                  }
                />

                <CompactToggle
                  title="1 day"
                  description="Final reminder"
                  enabled={
                    reminder1Day
                  }
                  onToggle={() =>
                    setReminder1Day(
                      (current) =>
                        !current,
                    )
                  }
                />
              </div>
            </SettingsSection>

            {/* ==================================================
                PRODUCT AVAILABILITY
                ================================================== */}

            <SettingsSection
              eyebrow="Products"
              title="Product availability"
              description="Control which products and size variants customers can see and select."
            >
              <ToggleSetting
                label="Hide out-of-stock products"
                description="Products and sizes with no available inventory will not appear on customer selection forms."
                enabled={
                  hideOutOfStock
                }
                onToggle={() =>
                  setHideOutOfStock(
                    (current) =>
                      !current,
                  )
                }
              />

              <Divider />

              <ToggleSetting
                label="Hide discontinued products"
                description="Keep discontinued products out of customer selection options."
                enabled={
                  hideDiscontinued
                }
                onToggle={() =>
                  setHideDiscontinued(
                    (current) =>
                      !current,
                  )
                }
              />

              <Divider />

              <ToggleSetting
                label="Allow backorders"
                description="Allow products to remain selectable even when current inventory is unavailable."
                enabled={
                  allowBackorders
                }
                onToggle={() =>
                  setAllowBackorders(
                    (current) =>
                      !current,
                  )
                }
              />
            </SettingsSection>

            {/* ==================================================
                ORDER PROCESSING
                ================================================== */}

            <SettingsSection
              eyebrow="Fulfillment"
              title="Order processing"
              description="Control how SubscriptionSync prepares Shopify orders after customer selections are complete."
            >
              <ToggleSetting
                label="Automatically create orders"
                description="Allow SubscriptionSync to prepare orders when each subscriber reaches their order creation date."
                enabled={
                  autoCreateOrders
                }
                onToggle={() =>
                  setAutoCreateOrders(
                    (current) =>
                      !current,
                  )
                }
              />

              <Divider />

              <ToggleSetting
                label="Require manual review"
                description="Hold orders for review before allowing them to continue through the fulfillment workflow."
                enabled={
                  requireManualReview
                }
                onToggle={() =>
                  setRequireManualReview(
                    (current) =>
                      !current,
                  )
                }
              />

              <Divider />

              <div>
                <div
                  style={{
                    fontSize:
                      "13px",

                    fontWeight:
                      650,

                    color:
                      COLORS.text,

                    marginBottom:
                      "12px",
                  }}
                >
                  Shopify order tags
                </div>

                <div
                  style={{
                    display:
                      "grid",

                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(230px, 1fr))",

                    gap:
                      "14px",
                  }}
                >
                  <TextField
                    label="Automatic Order"
                    value={
                      autoOrderTag
                    }
                    onChange={
                      setAutoOrderTag
                    }
                    autoComplete="off"
                  />

                  <TextField
                    label="Customer Selected"
                    value={
                      customerSelectedTag
                    }
                    onChange={
                      setCustomerSelectedTag
                    }
                    autoComplete="off"
                  />

                  <TextField
                    label="Modified Appstle Order"
                    value={
                      modifiedOrderTag
                    }
                    onChange={
                      setModifiedOrderTag
                    }
                    autoComplete="off"
                  />
                </div>
              </div>
            </SettingsSection>

            {/* ==================================================
                EMAIL
                ================================================== */}

            <SettingsSection
              eyebrow="Communication"
              title="Email settings"
              description="Configure the default sender used for SubscriptionSync customer communication."
            >
              <TextField
                label="Sender Email"
                value={
                  emailSender
                }
                onChange={
                  setEmailSender
                }
                autoComplete="email"
                placeholder="support@littleadventures.com"
              />

              <InfoBox>
                Customer selection templates are
                configured within each Fulfillment
                Profile. This setting controls the
                default sender address.
              </InfoBox>
            </SettingsSection>

            {/* ==================================================
                CONNECTED SERVICES
                ================================================== */}

            <div>
              <SectionHeader
                eyebrow="Integrations"
                title="Connected services"
                description="Current connection status for the services SubscriptionSync depends on."
              />

              <div
                style={{
                  display:
                    "grid",

                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(220px, 1fr))",

                  gap:
                    "14px",

                  marginTop:
                    "16px",
                }}
              >
                <IntegrationCard
                  title="Shopify"
                  detail={
                    settings.storeUrl
                  }
                  connected={
                    settings.shopifyConnected
                  }
                />

                <IntegrationCard
                  title="Appstle"
                  detail="Subscription data"
                  connected={
                    settings.appstleConnected
                  }
                  disconnectedLabel="Needs connection"
                />

                <IntegrationCard
                  title="Database"
                  detail="Neon PostgreSQL"
                  connected={
                    settings.databaseConnected
                  }
                />

                <IntegrationCard
                  title="Email"
                  detail={
                    emailSender ||
                    "No sender configured"
                  }
                  connected={
                    Boolean(
                      emailSender,
                    )
                  }
                  disconnectedLabel="Needs setup"
                />
              </div>

              <div
                style={{
                  marginTop:
                    "14px",

                  background:
                    COLORS.white,

                  border:
                    `1px solid ${COLORS.border}`,

                  borderRadius:
                    "14px",

                  padding:
                    "16px 18px",

                  boxShadow:
                    "0 1px 2px rgba(32,34,31,0.02)",
                }}
              >
                <InlineStack
                  align="space-between"
                  blockAlign="center"
                  gap="300"
                  wrap
                >
                  <div>
                    <div
                      style={{
                        fontSize:
                          "10px",

                        fontWeight:
                          700,

                        letterSpacing:
                          "0.08em",

                        textTransform:
                          "uppercase",

                        color:
                          COLORS.muted,

                        marginBottom:
                          "4px",
                      }}
                    >
                      Last settings activity
                    </div>

                    <div
                      style={{
                        fontSize:
                          "13px",

                        fontWeight:
                          600,

                        color:
                          COLORS.text,
                      }}
                    >
                      {
                        settings.lastSync
                      }
                    </div>
                  </div>

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
                    Sync now
                  </Button>
                </InlineStack>
              </div>
            </div>

            {/* ==================================================
                ADMIN TOOLS
                ================================================== */}

            <div
              style={{
                background:
                  COLORS.cream,

                border:
                  `1px solid ${COLORS.creamStrong}`,

                borderRadius:
                  "18px",

                padding:
                  "24px",
              }}
            >
              <BlockStack gap="400">
                <SectionHeader
                  eyebrow="Development"
                  title="Admin tools"
                  description="Sandbox tools for testing SubscriptionSync workflows before live automation is enabled."
                />

                <TextField
                  label="Test Customer Email"
                  value={
                    testSubscriberEmail
                  }
                  onChange={
                    setTestSubscriberEmail
                  }
                  autoComplete="email"
                  placeholder="customer@example.com"
                />

                <InlineStack
                  gap="300"
                  wrap
                >
                  <Button
                    submit
                    loading={
                      isSubmitting &&
                      intent ===
                        "test-reminder"
                    }
                    onClick={() =>
                      setIntent(
                        "test-reminder",
                      )
                    }
                  >
                    Send test reminder
                  </Button>

                  <Button
                    submit
                    loading={
                      isSubmitting &&
                      intent ===
                        "generate-test-order"
                    }
                    onClick={() =>
                      setIntent(
                        "generate-test-order",
                      )
                    }
                  >
                    Generate test order
                  </Button>
                </InlineStack>

                <InfoBox warm>
                  Additional tools such as
                  subscriber sync, product sync,
                  inventory refresh, and daily
                  automation can be connected here
                  as those integrations are built.
                </InfoBox>
              </BlockStack>
            </div>

            {/* ==================================================
                SAVE
                ================================================== */}

            <div
              style={{
                background:
                  COLORS.sageDeep,

                borderRadius:
                  "18px",

                padding:
                  "22px 24px",

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
                      fontSize:
                        "10px",

                      fontWeight:
                        700,

                      letterSpacing:
                        "0.11em",

                      textTransform:
                        "uppercase",

                      color:
                        "rgba(255,255,255,0.62)",

                      marginBottom:
                        "6px",
                    }}
                  >
                    System defaults
                  </div>

                  <div
                    style={{
                      fontSize:
                        "18px",

                      fontWeight:
                        650,

                      color:
                        "#FFFFFF",

                      marginBottom:
                        "4px",
                    }}
                  >
                    Save SubscriptionSync settings
                  </div>

                  <div
                    style={{
                      fontSize:
                        "12px",

                      lineHeight:
                        1.5,

                      color:
                        "rgba(255,255,255,0.65)",
                    }}
                  >
                    These settings become the
                    defaults used across subscriber
                    workflows.
                  </div>
                </div>

                <InlineStack
                  gap="300"
                  wrap
                >
                  <Button
                    url="/app"
                  >
                    Cancel
                  </Button>

                  <Button
                    submit
                    variant="primary"
                    loading={
                      isSubmitting &&
                      intent ===
                        "save"
                    }
                    onClick={() =>
                      setIntent(
                        "save",
                      )
                    }
                  >
                    Save settings
                  </Button>
                </InlineStack>
              </InlineStack>
            </div>

            <div style={{ height: "20px" }} />
          </BlockStack>
        </Form>
      </Page>
    </div>
  );
}

/* ============================================================
   SETTINGS SECTION
   ============================================================ */

function SettingsSection({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children:
    React.ReactNode;
}) {
  return (
    <div
      style={{
        background:
          COLORS.white,

        border:
          `1px solid ${COLORS.border}`,

        borderRadius:
          "18px",

        padding:
          "24px",

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

        {children}
      </BlockStack>
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
          fontSize:
            "10px",

          fontWeight:
            700,

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
          fontSize:
            "20px",

          fontWeight:
            650,

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
          fontSize:
            "13px",

          lineHeight:
            1.5,

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
   TIMELINE CARD
   ============================================================ */

function TimelineCard({
  step,
  title,
  description,
  children,
}: {
  step: string;
  title: string;
  description: string;
  children:
    React.ReactNode;
}) {
  return (
    <div
      style={{
        background:
          COLORS.page,

        border:
          `1px solid ${COLORS.border}`,

        borderRadius:
          "14px",

        padding:
          "16px",
      }}
    >
      <BlockStack gap="300">

        <InlineStack
          gap="300"
          blockAlign="start"
          wrap={false}
        >
          <div
            style={{
              width: "30px",
              height: "30px",

              borderRadius:
                "999px",

              display:
                "flex",

              alignItems:
                "center",

              justifyContent:
                "center",

              background:
                COLORS.sageSoft,

              border:
                `1px solid ${COLORS.sageSoftStrong}`,

              color:
                COLORS.sageDark,

              fontSize:
                "10px",

              fontWeight:
                800,

              flexShrink:
                0,
            }}
          >
            {step}
          </div>

          <div>
            <div
              style={{
                fontSize:
                  "13px",

                fontWeight:
                  650,

                color:
                  COLORS.text,

                marginBottom:
                  "3px",
              }}
            >
              {title}
            </div>

            <div
              style={{
                fontSize:
                  "11px",

                color:
                  COLORS.muted,
              }}
            >
              {description}
            </div>
          </div>
        </InlineStack>

        {children}

      </BlockStack>
    </div>
  );
}

/* ============================================================
   TOGGLE SETTING
   ============================================================ */

function ToggleSetting({
  label,
  description,
  enabled,
  onToggle,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      style={{
        padding:
          "2px 0",
      }}
    >
      <InlineStack
        align="space-between"
        blockAlign="center"
        gap="400"
        wrap={false}
      >
        <div
          style={{
            maxWidth:
              "760px",
          }}
        >
          <div
            style={{
              fontSize:
                "13px",

              fontWeight:
                650,

              color:
                COLORS.text,

              marginBottom:
                "4px",
            }}
          >
            {label}
          </div>

          <div
            style={{
              fontSize:
                "12px",

              lineHeight:
                1.5,

              color:
                COLORS.muted,
            }}
          >
            {description}
          </div>
        </div>

        <Button
          size="slim"
          variant={
            enabled
              ? "primary"
              : "secondary"
          }
          onClick={
            onToggle
          }
        >
          {enabled
            ? "On"
            : "Off"}
        </Button>
      </InlineStack>
    </div>
  );
}

/* ============================================================
   COMPACT TOGGLE
   ============================================================ */

function CompactToggle({
  title,
  description,
  enabled,
  onToggle,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"

      onClick={
        onToggle
      }

      style={{
        width:
          "100%",

        cursor:
          "pointer",

        textAlign:
          "left",

        background:
          enabled
            ? COLORS.sageSoft
            : COLORS.page,

        border:
          `1px solid ${
            enabled
              ? COLORS.sageSoftStrong
              : COLORS.border
          }`,

        borderRadius:
          "14px",

        padding:
          "15px",

        transition:
          "background 150ms ease, border-color 150ms ease",
      }}
    >
      <InlineStack
        align="space-between"
        blockAlign="center"
        gap="200"
        wrap={false}
      >
        <div>
          <div
            style={{
              color:
                COLORS.text,

              fontSize:
                "14px",

              fontWeight:
                700,
            }}
          >
            {title}
          </div>

          <div
            style={{
              color:
                COLORS.muted,

              fontSize:
                "12px",

              marginTop:
                "3px",
            }}
          >
            {description}
          </div>
        </div>

        <div
          style={{
            minWidth:
              "38px",

            padding:
              "5px 7px",

            borderRadius:
              "999px",

            textAlign:
              "center",

            background:
              enabled
                ? COLORS.sageDark
                : COLORS.white,

            border:
              `1px solid ${
                enabled
                  ? COLORS.sageDark
                  : COLORS.borderStrong
              }`,

            color:
              enabled
                ? "#FFFFFF"
                : COLORS.muted,

            fontSize:
              "10px",

            fontWeight:
              800,
          }}
        >
          {enabled
            ? "ON"
            : "OFF"}
        </div>
      </InlineStack>
    </button>
  );
}

/* ============================================================
   INFO BOX
   ============================================================ */

function InfoBox({
  children,
  warm = false,
}: {
  children:
    React.ReactNode;
  warm?: boolean;
}) {
  return (
    <div
      style={{
        background:
          warm
            ? "rgba(255,255,255,0.52)"
            : COLORS.sageSoft,

        border:
          `1px solid ${
            warm
              ? COLORS.creamStrong
              : COLORS.sageSoftStrong
          }`,

        borderRadius:
          "13px",

        padding:
          "14px 16px",

        color:
          COLORS.muted,

        fontSize:
          "12px",

        lineHeight:
          1.55,
      }}
    >
      {children}
    </div>
  );
}

/* ============================================================
   INTEGRATION CARD
   ============================================================ */

function IntegrationCard({
  title,
  detail,
  connected,
  disconnectedLabel =
    "Disconnected",
}: {
  title: string;
  detail: string;
  connected: boolean;
  disconnectedLabel?: string;
}) {
  return (
    <div
      style={{
        background:
          connected
            ? COLORS.white
            : COLORS.attentionSoft,

        border:
          `1px solid ${
            connected
              ? COLORS.border
              : COLORS.attentionBorder
          }`,

        borderRadius:
          "15px",

        padding:
          "18px",

        minHeight:
          "118px",

        boxShadow:
          "0 1px 2px rgba(32,34,31,0.02)",
      }}
    >
      <BlockStack gap="300">

        <InlineStack
          align="space-between"
          blockAlign="center"
          gap="200"
        >
          <div
            style={{
              fontSize:
                "14px",

              fontWeight:
                650,

              color:
                COLORS.text,
            }}
          >
            {title}
          </div>

          <Badge
            tone={
              connected
                ? "success"
                : "attention"
            }
          >
            {connected
              ? "Connected"
              : disconnectedLabel}
          </Badge>
        </InlineStack>

        <div
          style={{
            fontSize:
              "12px",

            lineHeight:
              1.45,

            color:
              COLORS.muted,
          }}
        >
          {detail}
        </div>

      </BlockStack>
    </div>
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
    return "Not synced yet";
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