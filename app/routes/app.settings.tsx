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
  Card,
  Divider,
  InlineStack,
  Page,
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
  } =
    useLoaderData<typeof loader>();

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
        title="Settings"
        subtitle="Manage the default automation, customer reminders, product availability, and order processing used across SubscriptionSync."
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

          <BlockStack gap="500">

            {/* ==================================================
                RESULT
                ================================================== */}

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
                HERO
                ================================================== */}

            <div
              style={{
                background: `linear-gradient(
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
                  "0 8px 26px rgba(23,35,62,0.14)",

                color:
                  COLORS.white,
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
                        "28px",

                      fontWeight:
                        700,

                      lineHeight:
                        1.2,

                      marginBottom:
                        "8px",
                    }}
                  >
                    System Settings
                  </div>

                  <div
                    style={{
                      color:
                        "#E8EEF7",

                      fontSize:
                        "14px",

                      lineHeight:
                        1.55,

                      maxWidth:
                        "720px",
                    }}
                  >
                    Manage the default
                    automation, reminders,
                    product availability,
                    integrations, and order
                    processing used across
                    Little Adventures
                    subscription programs.
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
                      color:
                        COLORS.white,

                      fontSize:
                        "13px",

                      fontWeight:
                        700,
                    }}
                  >
                    {automationEnabled
                      ? "● Automation Enabled"
                      : "○ Automation Paused"}
                  </span>
                </div>
              </InlineStack>
            </div>

            {/* ==================================================
                AUTOMATION TIMELINE
                ================================================== */}

            <Card>
              <BlockStack gap="400">

                <SectionHeading
                  title="Automation Timeline"
                  description="These default settings calculate actions from each subscriber's individual next ship date."
                />

                <ToggleSetting
                  label="Automatic Daily Processing"
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
                    display:
                      "grid",

                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(220px, 1fr))",

                    gap:
                      "14px",
                  }}
                >
                  <TimelineCard
                    title="Customer Selection"
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
                    title="Automatic Selection"
                    description="If customer has not selected"
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
                    title="Create Shopify Order"
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

              </BlockStack>
            </Card>

            {/* ==================================================
                REMINDERS
                ================================================== */}

            <Card>
              <BlockStack gap="400">

                <SectionHeading
                  title="Customer Reminders"
                  description="Choose which reminders customers should receive before their selection deadline."
                />

                <div
                  style={{
                    display:
                      "grid",

                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(180px, 1fr))",

                    gap:
                      "12px",
                  }}
                >
                  <CompactToggle
                    title="14 Days"
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
                    title="7 Days"
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
                    title="3 Days"
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
                    title="1 Day"
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

              </BlockStack>
            </Card>

            {/* ==================================================
                PRODUCT AVAILABILITY
                ================================================== */}

            <Card>
              <BlockStack gap="400">

                <SectionHeading
                  title="Product Availability"
                  description="Control which products and individual size variants customers can see and select."
                />

                <ToggleSetting
                  label="Hide Out-of-Stock Products"
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
                  label="Hide Discontinued Products"
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
                  label="Allow Backorders"
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

              </BlockStack>
            </Card>

            {/* ==================================================
                ORDER PROCESSING
                ================================================== */}

            <Card>
              <BlockStack gap="400">

                <SectionHeading
                  title="Order Processing"
                  description="Control how SubscriptionSync prepares Shopify orders after customer selections are complete."
                />

                <ToggleSetting
                  label="Automatically Create Orders"
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
                  label="Require Manual Review"
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

                <BlockStack gap="300">

                  <Text
                    as="h3"
                    variant="headingSm"
                  >
                    Shopify Order Tags
                  </Text>

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

                </BlockStack>

              </BlockStack>
            </Card>

            {/* ==================================================
                EMAIL
                ================================================== */}

            <Card>
              <BlockStack gap="400">

                <SectionHeading
                  title="Email Settings"
                  description="Configure the default sender used for SubscriptionSync customer communication."
                />

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

                <div
                  style={{
                    background:
                      COLORS.softBlue,

                    border:
                      `1px solid ${COLORS.borderBlue}`,

                    borderRadius:
                      "12px",

                    padding:
                      "14px 16px",
                  }}
                >
                  <Text
                    as="p"
                    variant="bodySm"
                    tone="subdued"
                  >
                    Customer selection
                    templates are configured
                    within each Fulfillment
                    Profile. This setting
                    controls the default
                    sender address.
                  </Text>
                </div>

              </BlockStack>
            </Card>

            {/* ==================================================
                CONNECTED SERVICES
                ================================================== */}

            <BlockStack gap="300">

              <SectionHeading
                title="Connected Services"
                description="Current connection status for the services used by SubscriptionSync."
              />

              <div
                style={{
                  display:
                    "grid",

                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(220px, 1fr))",

                  gap:
                    "14px",
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
                  disconnectedLabel="Needs Connection"
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
                  disconnectedLabel="Needs Setup"
                />
              </div>

              <div
                style={{
                  background:
                    COLORS.white,

                  border:
                    `1px solid ${COLORS.border}`,

                  borderRadius:
                    "12px",

                  padding:
                    "14px 16px",
                }}
              >
                <InlineStack
                  align="space-between"
                  blockAlign="center"
                  gap="300"
                  wrap
                >
                  <div>
                    <Text
                      as="p"
                      variant="bodySm"
                      tone="subdued"
                    >
                      Last settings activity
                    </Text>

                    <Text
                      as="p"
                      variant="bodyMd"
                      fontWeight="semibold"
                    >
                      {
                        settings.lastSync
                      }
                    </Text>
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
                    Sync Now
                  </Button>
                </InlineStack>
              </div>

            </BlockStack>

            {/* ==================================================
                ADMIN TOOLS
                ================================================== */}

            <Card>
              <BlockStack gap="400">

                <SectionHeading
                  title="Admin Tools"
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
                    Send Test Reminder
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
                    Generate Test Order
                  </Button>
                </InlineStack>

                <div
                  style={{
                    background:
                      COLORS.softBlue,

                    border:
                      `1px solid ${COLORS.borderBlue}`,

                    borderRadius:
                      "12px",

                    padding:
                      "14px 16px",
                  }}
                >
                  <Text
                    as="p"
                    variant="bodySm"
                    tone="subdued"
                  >
                    Additional tools such as
                    subscriber sync, product
                    sync, inventory refresh,
                    and daily automation can
                    be connected here as those
                    integrations are built.
                  </Text>
                </div>

              </BlockStack>
            </Card>

            {/* ==================================================
                SAVE
                ================================================== */}

            <div
              style={{
                background:
                  COLORS.softBlue,

                border:
                  `1px solid ${COLORS.borderBlue}`,

                borderRadius:
                  "16px",

                padding:
                  "18px 20px",
              }}
            >
              <InlineStack
                align="space-between"
                blockAlign="center"
                gap="300"
                wrap
              >
                <div>
                  <Text
                    as="p"
                    variant="headingMd"
                  >
                    Save SubscriptionSync Settings
                  </Text>

                  <div
                    style={{
                      marginTop:
                        "4px",
                    }}
                  >
                    <Text
                      as="p"
                      variant="bodySm"
                      tone="subdued"
                    >
                      These become the
                      default system settings
                      used across subscriber
                      workflows.
                    </Text>
                  </div>
                </div>

                <InlineStack
                  gap="300"
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
                    Save Settings
                  </Button>
                </InlineStack>
              </InlineStack>
            </div>

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
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <InlineStack
      gap="200"
      blockAlign="start"
      wrap={false}
    >
      <div
        style={{
          width:
            "4px",

          height:
            "22px",

          background:
            COLORS.tealBlue,

          borderRadius:
            "999px",

          flexShrink:
            0,

          marginTop:
            "2px",
        }}
      />

      <BlockStack gap="050">
        <Text
          as="h2"
          variant="headingLg"
        >
          {title}
        </Text>

        <Text
          as="p"
          variant="bodyMd"
          tone="subdued"
        >
          {description}
        </Text>
      </BlockStack>
    </InlineStack>
  );
}

/* ============================================================
   TIMELINE CARD
   ============================================================ */

function TimelineCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children:
    React.ReactNode;
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
          "15px",
      }}
    >
      <BlockStack gap="300">

        <BlockStack gap="050">
          <Text
            as="p"
            variant="headingSm"
          >
            {title}
          </Text>

          <Text
            as="p"
            variant="bodySm"
            tone="subdued"
          >
            {description}
          </Text>
        </BlockStack>

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
    <InlineStack
      align="space-between"
      blockAlign="center"
      gap="400"
      wrap={false}
    >
      <BlockStack gap="050">
        <Text
          as="span"
          variant="bodyMd"
          fontWeight="semibold"
        >
          {label}
        </Text>

        <Text
          as="span"
          variant="bodySm"
          tone="subdued"
        >
          {description}
        </Text>
      </BlockStack>

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
            ? COLORS.softBlueStrong
            : COLORS.white,

        border:
          `1px solid ${
            enabled
              ? COLORS.borderBlue
              : COLORS.border
          }`,

        borderRadius:
          "12px",

        padding:
          "14px",
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
            color:
              enabled
                ? COLORS.numberBlue
                : COLORS.muted,

            fontSize:
              "12px",

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
          COLORS.white,

        border:
          `1px solid ${COLORS.border}`,

        borderRadius:
          "14px",

        padding:
          "17px",

        minHeight:
          "115px",
      }}
    >
      <BlockStack gap="200">

        <InlineStack
          align="space-between"
          blockAlign="center"
          gap="200"
        >
          <Text
            as="h3"
            variant="headingMd"
          >
            {title}
          </Text>

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

        <Text
          as="p"
          variant="bodySm"
          tone="subdued"
        >
          {detail}
        </Text>

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