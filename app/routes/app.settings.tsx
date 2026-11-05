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
import { COLORS as DASHBOARD_COLORS } from "../styles/theme";

/* ============================================================
   SUBSCRIPTIONSYNC DESIGN SYSTEM
   ============================================================ */

const COLORS = {
  ...DASHBOARD_COLORS,

  // Legacy names mapped to the shared Dashboard theme.
  sage: DASHBOARD_COLORS.primary,
  sageDark: DASHBOARD_COLORS.primaryDark,
  sageDeep: DASHBOARD_COLORS.primaryDark,
  sageSoft: DASHBOARD_COLORS.primarySoft,
  sageSoftStrong: DASHBOARD_COLORS.primarySoftStrong,

  cream: DASHBOARD_COLORS.warm,
  creamStrong: DASHBOARD_COLORS.warmBorder,

  attentionSoft: DASHBOARD_COLORS.warm,
  attentionBorder: DASHBOARD_COLORS.warmBorder,

  successSoft: DASHBOARD_COLORS.primarySoft,
  successBorder: DASHBOARD_COLORS.primaryBorder,

  criticalSoft: DASHBOARD_COLORS.dangerSoft,
  criticalBorder: DASHBOARD_COLORS.dangerBorder,
} as const;

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
        automationEnabled: false,

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

        autoCreateOrders: false,
        requireManualReview: true,

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

  // Appstle owns subscription plans. These profiles only determine
  // which dresses/variants each plan is allowed to select.
  const dressEligibilityProfiles = await db.fulfillmentProfile.findMany({
    select: {
      id: true,
      name: true,
      appstlePlanId: true,
      appstlePlanName: true,
      isActive: true,
      _count: {
        select: { products: true, subscribers: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return json({
    settings,
    dressEligibilityProfiles,
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
     INTEGRATION ACTIONS — NOT IMPLEMENTED YET
     ========================================================== */

  if (
    intent === "sync-now" ||
    intent === "test-reminder" ||
    intent === "generate-test-order"
  ) {
    const message =
      intent === "sync-now"
        ? "Appstle synchronization is not implemented yet. No sync was performed."
        : intent === "test-reminder"
          ? "Test reminder delivery is not implemented yet. No email was sent."
          : "Test order generation is not implemented yet. No Shopify order was created.";

    return json<ActionResponse>({
      success: false,
      message,
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

    // Appstle owns recurring order creation.
    // Keep SubscriptionSync order creation disabled.
    autoCreateOrders: false,

    requireManualReview:
      formData.get(
        "requireManualReview",
      ) === "true",

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
    dressEligibilityProfiles,
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
    requireManualReview,
    setRequireManualReview,
  ] =
    useState(
      settings.requireManualReview,
    );




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
            marginBottom: "20px",
          }}
        >
          <style>{`
            .ss-settings-nav-link {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              min-height: 40px;
              padding: 10px 16px;
              border: 1px solid ${COLORS.border};
              border-radius: 10px;
              background: ${COLORS.white};
              color: ${COLORS.sageDark};
              text-decoration: none;
              font-size: 13px;
              font-weight: 700;
              transition: background-color 0.15s ease,
                          border-color 0.15s ease;
            }
            .ss-settings-nav-link:hover {
              background: ${COLORS.sageSoftStrong};
              border-color: ${COLORS.sageDark};
            }
            .ss-settings-nav-link:focus-visible {
              outline: 2px solid ${COLORS.primaryDark};
              outline-offset: 3px;
            }

            /* Match primary Save button to Dashboard theme */
            .ss-settings-save button[type="submit"] {
              background: ${COLORS.primaryDark} !important;
              background-color: ${COLORS.primaryDark} !important;
              border-color: ${COLORS.primaryDark} !important;
              color: #FFFFFF !important;
            }

            .ss-settings-save button[type="submit"]:hover {
              background: ${COLORS.primary} !important;
              background-color: ${COLORS.primary} !important;
              border-color: ${COLORS.primary} !important;
            }

            .ss-settings-save button[type="submit"]:focus-visible {
              outline: 2px solid ${COLORS.primaryDark};
              outline-offset: 3px;
            }
          `}</style>

          <Link className="ss-settings-nav-link" to="/app">
            Home →
          </Link>

          <Link
            className="ss-settings-nav-link"
            to="/app/subscriber-list"
          >
            Subscribers →
          </Link>

          <Link
            className="ss-settings-nav-link"
            to="/app/activity-log"
          >
            Activity →
          </Link>

          <span
            aria-current="page"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "40px",
              padding: "10px 16px",
              borderRadius: "10px",
              background: COLORS.sageSoftStrong,
              border: `1px solid ${COLORS.sageDark}`,
              color: COLORS.sageDark,
              fontSize: "13px",
              fontWeight: 750,
            }}
          >
            Settings
          </span>
        </nav>

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
            name="requireManualReview"
            value={String(
              requireManualReview,
            )}
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

            {/* DEVELOPMENT INFORMATION */}
            <div
              style={{
                padding: "18px 22px",
                background: `linear-gradient(
                  105deg,
                  #FCFBF7 0%,
                  #F7F6F1 58%,
                  ${COLORS.sageSoftStrong} 100%
                )`,
                border: `1px solid ${COLORS.border}`,
                borderRadius: "18px",
                boxShadow:
                  "0 1px 2px rgba(32,36,42,0.03), 0 10px 24px rgba(32,36,42,0.05)",
              }}
            >
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: 650,
                  color: COLORS.text,
                  marginBottom: "6px",
                }}
              >
                Development configuration
              </div>
              <div
                style={{
                  fontSize: "13px",
                  lineHeight: 1.6,
                  color: COLORS.textSoft,
                }}
              >
                Configure subscription rules below.
                Automated processing, email delivery,
                and integration health have not yet
                been verified. Live automation must
                remain disabled until testing is complete.
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
                  title="Subscriber selection"
                  description="Selection deadline"
                >
                  <Select
                    label="Subscriber selection deadline"
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
                  description="If the subscriber has not selected"
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


              </div>
            </SettingsSection>

            {/* ==================================================
                REMINDERS
                ================================================== */}

            <SettingsSection
              eyebrow="Communication"
              title="Subscriber reminders"
              description="Choose which reminders subscribers receive before their selection deadline."
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
              description="Control which products and size variants subscribers can see and select."
            >
              <ToggleSetting
                label="Hide out-of-stock products"
                description="Products and sizes with no available inventory will not appear on subscriber selection forms."
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
                description="Keep discontinued products out of subscriber selection options."
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
                DRESS ELIGIBILITY (APPSTLE PLAN MAPPING)
                ================================================== */}

            <SettingsSection
              eyebrow="Subscriptions"
              title="Dress eligibility"
              description="Appstle owns plans and billing. Assign each Appstle plan to the dress collection and sizes that SubscriptionSync may offer. These settings are configured once per plan, not once per customer."
            >
              <div style={{ fontSize: 13, color: COLORS.textSoft }}>
                Appstle synchronization is not connected yet. Plan names below are existing manual mappings and have not been verified against Appstle.
              </div>
              {dressEligibilityProfiles.length === 0 ? (
                <div style={{ padding: 16, border: `1px solid ${COLORS.border}`, borderRadius: 12 }}>
                  No dress-eligibility profiles are configured. We will map Appstle plans after API access is available.
                </div>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  {dressEligibilityProfiles.map((profile) => (
                    <div
                      key={profile.id}
                      style={{
                        padding: "16px",
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: 12,
                        background: COLORS.white,
                      }}
                    >
                      <div style={{ fontWeight: 700, color: COLORS.text }}>
                        {profile.name} {profile.isActive ? "" : "(Inactive)"}
                      </div>
                      <div style={{ fontSize: 13, color: COLORS.textSoft, marginTop: 5 }}>
                        Appstle plan: {profile.appstlePlanName || profile.appstlePlanId || "Not mapped"}
                        {" • "}{profile._count.products} eligible products
                        {" • "}{profile._count.subscribers} subscribers
                      </div>
                      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 12 }}>
                        <Link to={`/app/tiers/${profile.id}`}>Edit selection rules</Link>
                        <Link to={`/app/tiers/${profile.id}/products`}>Manage eligible dresses & sizes</Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ fontSize: 13, color: COLORS.textSoft }}>
                Existing editor routes are retained for now; after consolidating and testing their features, we can remove unused pages safely.
              </div>
            </SettingsSection>

            {/* ==================================================
                FULFILLMENT REVIEW
                ================================================== */}

            <SettingsSection
              eyebrow="Fulfillment"
              title="Fulfillment review"
              description="Appstle creates recurring subscription orders. SubscriptionSync manages dress selections and prepares the correct variants before renewal."
            >
              <ToggleSetting
                label="Require manual review"
                description="Save the manual-review preference during testing. Enforcement in the fulfillment workflow still needs verification."
                enabled={requireManualReview}
                onToggle={() =>
                  setRequireManualReview(
                    (current) => !current
                  )
                }
              />
            </SettingsSection>

            {/* ==================================================
                EMAIL
                ================================================== */}

            <SettingsSection
              eyebrow="Communication"
              title="Email settings"
              description="Configure the default sender used for SubscriptionSync subscriber communication."
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
                Subscriber selection templates are
                configured within each Fulfillment
                Profile. This setting controls the
                default sender address.
              </InfoBox>
            </SettingsSection>

            {/* ==================================================
                INTEGRATION READINESS
                ================================================== */}

            <SettingsSection
              eyebrow="Integrations"
              title="Integration readiness"
              description="Connection health checks have not yet been implemented. These statuses do not confirm live connectivity."
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "14px",
                }}
              >
                <IntegrationCard
                  title="Shopify"
                  detail={settings.storeUrl}
                  connected={false}
                  disconnectedLabel="Not verified"
                />

                <IntegrationCard
                  title="Appstle"
                  detail="Subscription synchronization pending"
                  connected={false}
                  disconnectedLabel="Not verified"
                />

                <IntegrationCard
                  title="Database"
                  detail="Neon PostgreSQL"
                  connected={false}
                  disconnectedLabel="Not verified"
                />

                <IntegrationCard
                  title="Email"
                  detail={
                    emailSender
                      ? "Sender configured; delivery not tested"
                      : "Sender not configured"
                  }
                  connected={false}
                  disconnectedLabel="Not verified"
                />
              </div>

              <InfoBox>
                Integration testing and automated processing
                must be completed before enabling live
                subscription operations.
              </InfoBox>
            </SettingsSection>

            {/* ==================================================
                SAVE
                ================================================== */}

            <div className="ss-settings-save"
              style={{
                background:
                  COLORS.sageDeep,

                borderRadius:
                  "18px",

                padding:
                  "22px 24px",

                boxShadow:
                  "0 10px 24px rgba(32,36,42,0.10)",
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
          "0 2px 8px rgba(32,36,42,0.025)",
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
          "0 1px 2px rgba(32,36,42,0.02)",
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