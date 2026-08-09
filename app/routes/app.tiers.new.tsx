import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
} from "@remix-run/node";

import { redirect } from "@remix-run/node";

import { useSubmit } from "@remix-run/react";

import { useState } from "react";

import {
  Badge,
  BlockStack,
  Button,
  Divider,
  InlineStack,
  Page,
  Select,
  TextField,
} from "@shopify/polaris";

import { TitleBar } from "@shopify/app-bridge-react";

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

  // Status
  successSoft: "#EDF3ED",
  successBorder: "#CDDCCF",
  attentionSoft: "#F7F0E2",
  attentionBorder: "#E9D6AE",
};

/* ============================================================
   LOADER
   ============================================================ */

export const loader = async ({
  request,
}: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  return null;
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

  const name = String(
    formData.get("name") ?? "",
  ).trim();

  const description = String(
    formData.get("description") ?? "",
  ).trim();

  const appstlePlanName = String(
    formData.get("appstlePlanName") ?? "",
  ).trim();

  const status = String(
    formData.get("status") ?? "active",
  );

  const selectionOpenOffset = Number(
    formData.get("selectionOpenOffset") ?? 14,
  );

  const selectionDeadlineOffset = Number(
    formData.get(
      "selectionDeadlineOffset",
    ) ?? 7,
  );

  const autoSelectOffset = Number(
    formData.get("autoSelectOffset") ?? 2,
  );

  const reminder14Days =
    formData.get("reminder14Days") ===
    "true";

  const reminder7Days =
    formData.get("reminder7Days") ===
    "true";

  const reminder3Days =
    formData.get("reminder3Days") ===
    "true";

  const reminder1Day =
    formData.get("reminder1Day") ===
    "true";

  const autoSelectEnabled =
    formData.get("autoSelectEnabled") ===
    "true";

  const hideOutOfStock =
    formData.get("hideOutOfStock") ===
    "true";

  const allowBackorders =
    formData.get("allowBackorders") ===
    "true";

  const requireInventoryCheck =
    formData.get(
      "requireInventoryCheck",
    ) === "true";

  const emailSubject = String(
    formData.get("emailSubject") ?? "",
  ).trim();

  const emailTemplate = String(
    formData.get("emailTemplate") ?? "",
  ).trim();

  /* ==========================================================
     BASIC VALIDATION
     ========================================================== */

  if (!name) {
    throw new Response(
      "Profile name is required.",
      {
        status: 400,
      },
    );
  }

  /* ==========================================================
     CREATE PROFILE
     ========================================================== */

  const profile =
    await db.fulfillmentProfile.create({
      data: {
        name,

        description:
          description || null,

        isActive:
          status === "active",

        appstlePlanName:
          appstlePlanName || null,

        selectionOpenOffset,

        selectionDeadlineOffset,

        reminder14Days,
        reminder7Days,
        reminder3Days,
        reminder1Day,

        autoSelectEnabled,
        autoSelectOffset,

        hideOutOfStock,
        allowBackorders,
        requireInventoryCheck,

        emailSubject:
          emailSubject || null,

        emailTemplate:
          emailTemplate || null,
      },
    });

  /*
   * Products and individual SKUs are intentionally
   * configured on the next page.
   */
  return redirect(
    `/app/tiers/${profile.id}/products`,
  );
};

/* ============================================================
   PAGE
   ============================================================ */

export default function CreateFulfillmentProfilePage() {
  const submit = useSubmit();

  /* ==========================================================
     BASIC INFORMATION
     ========================================================== */

  const [
    name,
    setName,
  ] = useState("");

  const [
    description,
    setDescription,
  ] = useState("");

  const [
    appstlePlanName,
    setAppstlePlanName,
  ] = useState("");

  const [
    status,
    setStatus,
  ] = useState("active");

  /* ==========================================================
     CUSTOMER TIMELINE
     ========================================================== */

  const [
    selectionOpenOffset,
    setSelectionOpenOffset,
  ] = useState("14");

  const [
    selectionDeadlineOffset,
    setSelectionDeadlineOffset,
  ] = useState("7");

  const [
    autoSelectEnabled,
    setAutoSelectEnabled,
  ] = useState(true);

  const [
    autoSelectOffset,
    setAutoSelectOffset,
  ] = useState("2");

  /* ==========================================================
     REMINDERS
     ========================================================== */

  const [
    reminder14Days,
    setReminder14Days,
  ] = useState(true);

  const [
    reminder7Days,
    setReminder7Days,
  ] = useState(true);

  const [
    reminder3Days,
    setReminder3Days,
  ] = useState(true);

  const [
    reminder1Day,
    setReminder1Day,
  ] = useState(true);

  /* ==========================================================
     INVENTORY
     ========================================================== */

  const [
    hideOutOfStock,
    setHideOutOfStock,
  ] = useState(true);

  const [
    requireInventoryCheck,
    setRequireInventoryCheck,
  ] = useState(true);

  const [
    allowBackorders,
    setAllowBackorders,
  ] = useState(false);

  /* ==========================================================
     EMAIL
     ========================================================== */

  const [
    emailSubject,
    setEmailSubject,
  ] = useState(
    "It's time to make your monthly selection!",
  );

  const [
    emailTemplate,
    setEmailTemplate,
  ] = useState(
    `Hi {{customer_name}},

It's time to make your monthly Little Adventures selection.

Use the link below to choose from the products and sizes currently available for your subscription.

{{selection_link}}

Thank you!

Little Adventures`,
  );

  /* ==========================================================
     OPTIONS
     ========================================================== */

  const statusOptions = [
    {
      label: "Active",
      value: "active",
    },
    {
      label: "Hidden",
      value: "hidden",
    },
  ];

  /* ==========================================================
     CREATE PROFILE
     ========================================================== */

  const handleCreateProfile = () => {
    const formData =
      new FormData();

    formData.append(
      "name",
      name,
    );

    formData.append(
      "description",
      description,
    );

    formData.append(
      "appstlePlanName",
      appstlePlanName,
    );

    formData.append(
      "status",
      status,
    );

    formData.append(
      "selectionOpenOffset",
      selectionOpenOffset,
    );

    formData.append(
      "selectionDeadlineOffset",
      selectionDeadlineOffset,
    );

    formData.append(
      "autoSelectEnabled",
      String(
        autoSelectEnabled,
      ),
    );

    formData.append(
      "autoSelectOffset",
      autoSelectOffset,
    );

    formData.append(
      "reminder14Days",
      String(
        reminder14Days,
      ),
    );

    formData.append(
      "reminder7Days",
      String(
        reminder7Days,
      ),
    );

    formData.append(
      "reminder3Days",
      String(
        reminder3Days,
      ),
    );

    formData.append(
      "reminder1Day",
      String(
        reminder1Day,
      ),
    );

    formData.append(
      "hideOutOfStock",
      String(
        hideOutOfStock,
      ),
    );

    formData.append(
      "requireInventoryCheck",
      String(
        requireInventoryCheck,
      ),
    );

    formData.append(
      "allowBackorders",
      String(
        allowBackorders,
      ),
    );

    formData.append(
      "emailSubject",
      emailSubject,
    );

    formData.append(
      "emailTemplate",
      emailTemplate,
    );

    submit(
      formData,
      {
        method: "post",
      },
    );
  };

  const canCreate =
    name.trim().length > 0;

  /* ==========================================================
     RENDER
     ========================================================== */

  /* ==========================================================
     RENDER
     ========================================================== */

  return (
    <div
      style={{
        background: COLORS.page,
        minHeight: "100vh",
      }}
    >
      <Page
        title="Create Fulfillment Profile"
        subtitle="Create a subscription program and define how customers move from Appstle to selection and fulfillment."
        backAction={{
          content: "Fulfillment Profiles",
          url: "/app/tiers",
        }}
        primaryAction={{
          content: "Create Profile & Continue",
          onAction: handleCreateProfile,
          disabled: !canCreate,
        }}
      >
        <TitleBar title="Create Fulfillment Profile" />

        <BlockStack gap="600">

          {/* ==================================================
              HERO
              ================================================== */}

          <div
            style={{
              position: "relative",
              overflow: "hidden",
              border: `1px solid ${COLORS.border}`,
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
                    maxWidth: "650px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: COLORS.sageDark,
                      marginBottom: "14px",
                    }}
                  >
                    New fulfillment profile
                  </div>

                  <div
                    style={{
                      fontSize: "30px",
                      lineHeight: 1.12,
                      fontWeight: 650,
                      letterSpacing: "-0.035em",
                      color: COLORS.text,
                      marginBottom: "11px",
                    }}
                  >
                    Build the rules
                    <br />
                    <span
                      style={{
                        color: COLORS.sageDark,
                      }}
                    >
                      behind a personalized subscription.
                    </span>
                  </div>

                  <div
                    style={{
                      maxWidth: "580px",
                      fontSize: "14px",
                      lineHeight: 1.6,
                      color: COLORS.textSoft,
                    }}
                  >
                    Connect an Appstle subscription
                    to customer selection, reminders,
                    inventory, and fulfillment rules.
                    Products and exact SKUs come next.
                  </div>
                </div>

                <div
                  style={{
                    minWidth: "230px",
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
                      color: COLORS.sageDark,
                      marginBottom: "9px",
                    }}
                  >
                    Setup progress
                  </div>

                  <div
                    style={{
                      fontSize: "30px",
                      lineHeight: 1,
                      fontWeight: 650,
                      letterSpacing: "-0.04em",
                      color: COLORS.text,
                      marginBottom: "8px",
                    }}
                  >
                    1 of 2
                  </div>

                  <div
                    style={{
                      fontSize: "12px",
                      lineHeight: 1.45,
                      color: COLORS.muted,
                    }}
                  >
                    Profile rules first
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
                      color: COLORS.textSoft,
                    }}
                  >
                    Products & sizes are next
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
                  color: COLORS.sageDark,
                }}
              >
                ● Development sandbox
              </span>
            </div>
          </div>

          {/* ==================================================
              STEP 1 — BASIC INFORMATION
              ================================================== */}

          <SettingsSection
            eyebrow="Step 1"
            title="Basic information"
            description="Start with the name Little Adventures will recognize for this subscription program."
          >
            <TextField
              label="Profile Name"
              value={name}
              onChange={setName}
              autoComplete="off"
              placeholder="Example: Princess Twirl"
              helpText="Use the subscription program name your team already recognizes."
            />

            <TextField
              label="Description"
              value={description}
              onChange={setDescription}
              multiline={3}
              autoComplete="off"
              placeholder="Example: Monthly Twirl subscription with customer style and size selection."
            />

            <div
              style={{
                maxWidth: "280px",
              }}
            >
              <Select
                label="Status"
                options={statusOptions}
                value={status}
                onChange={setStatus}
              />
            </div>
          </SettingsSection>

          {/* ==================================================
              STEP 2 — APPSTLE
              ================================================== */}

          <SettingsSection
            eyebrow="Step 2"
            title="Connect to Appstle"
            description="Tell SubscriptionSync which Appstle subscription plan this profile represents."
          >
            <TextField
              label="Appstle Subscription Plan"
              value={appstlePlanName}
              onChange={setAppstlePlanName}
              autoComplete="off"
              placeholder="Example: Princess Subscription - Twirl"
              helpText="For now this is entered manually. Later the Appstle integration can populate this automatically."
            />

            <InfoBox>
              Appstle remains the source of truth
              for the subscription itself.
              SubscriptionSync uses this profile
              to control the workflow around
              customer selection and fulfillment.
            </InfoBox>
          </SettingsSection>

          {/* ==================================================
              STEP 3 — CUSTOMER TIMELINE
              ================================================== */}

          <SettingsSection
            eyebrow="Step 3"
            title="Customer timeline"
            description="Choose when customers can make a selection and when SubscriptionSync should step in automatically."
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "14px",
              }}
            >
              <TimelineSetting
                step="01"
                label="Selection Opens"
                description="Customer can begin choosing."
                value={selectionOpenOffset}
                onChange={setSelectionOpenOffset}
                suffix="days before order"
              />

              <TimelineSetting
                step="02"
                label="Selection Deadline"
                description="Customer choice closes."
                value={selectionDeadlineOffset}
                onChange={setSelectionDeadlineOffset}
                suffix="days before order"
              />

              <TimelineSetting
                step="03"
                label="Auto Selection"
                description={
                  autoSelectEnabled
                    ? "Automatic selection timing."
                    : "Automatic selection is off."
                }
                value={autoSelectOffset}
                onChange={setAutoSelectOffset}
                suffix="days after deadline"
                disabled={!autoSelectEnabled}
              />
            </div>

            <Divider />

            <ToggleSetting
              label="Enable Auto Selection"
              description="If the customer misses the deadline, allow SubscriptionSync to move them into the automatic selection workflow."
              enabled={autoSelectEnabled}
              onToggle={() =>
                setAutoSelectEnabled(
                  (current) => !current,
                )
              }
            />
          </SettingsSection>

          {/* ==================================================
              STEP 4 — REMINDERS
              ================================================== */}

          <SettingsSection
            eyebrow="Step 4"
            title="Customer reminders"
            description="Choose when SubscriptionSync should remind customers before their selection deadline."
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "12px",
              }}
            >
              <CompactToggle
                label="14 Days"
                description="Early reminder"
                enabled={reminder14Days}
                onToggle={() =>
                  setReminder14Days(
                    (current) => !current,
                  )
                }
              />

              <CompactToggle
                label="7 Days"
                description="One week reminder"
                enabled={reminder7Days}
                onToggle={() =>
                  setReminder7Days(
                    (current) => !current,
                  )
                }
              />

              <CompactToggle
                label="3 Days"
                description="Deadline approaching"
                enabled={reminder3Days}
                onToggle={() =>
                  setReminder3Days(
                    (current) => !current,
                  )
                }
              />

              <CompactToggle
                label="1 Day"
                description="Final reminder"
                enabled={reminder1Day}
                onToggle={() =>
                  setReminder1Day(
                    (current) => !current,
                  )
                }
              />
            </div>
          </SettingsSection>

          {/* ==================================================
              STEP 5 — INVENTORY
              ================================================== */}

          <SettingsSection
            eyebrow="Step 5"
            title="Inventory rules"
            description="Choose how Shopify inventory should affect the products and sizes customers can select."
          >
            <ToggleSetting
              label="Hide Out-of-Stock Products"
              description="Customers will not see unavailable products or individual size variants."
              enabled={hideOutOfStock}
              onToggle={() =>
                setHideOutOfStock(
                  (current) => !current,
                )
              }
            />

            <Divider />

            <ToggleSetting
              label="Require Inventory Check"
              description="Verify availability again before a customer selection moves into fulfillment."
              enabled={requireInventoryCheck}
              onToggle={() =>
                setRequireInventoryCheck(
                  (current) => !current,
                )
              }
            />

            <Divider />

            <ToggleSetting
              label="Allow Backorders"
              description="Allow a selection even when Shopify currently shows no available inventory."
              enabled={allowBackorders}
              onToggle={() =>
                setAllowBackorders(
                  (current) => !current,
                )
              }
            />
          </SettingsSection>

          {/* ==================================================
              STEP 6 — EMAIL
              ================================================== */}

          <SettingsSection
            eyebrow="Step 6"
            title="Customer selection email"
            description="Set up the message customers will eventually receive when it is time to make a selection."
          >
            <TextField
              label="Email Subject"
              value={emailSubject}
              onChange={setEmailSubject}
              autoComplete="off"
            />

            <TextField
              label="Email Template"
              value={emailTemplate}
              onChange={setEmailTemplate}
              multiline={8}
              autoComplete="off"
              helpText="Variables such as {{customer_name}} and {{selection_link}} will be connected when email automation is activated."
            />
          </SettingsSection>

          {/* ==================================================
              NEXT STEP
              ================================================== */}

          <div
            style={{
              background: COLORS.sageSoft,
              border:
                `1px solid ${COLORS.sageSoftStrong}`,
              borderRadius: "18px",
              padding: "22px 24px",
            }}
          >
            <BlockStack gap="400">
              <InlineStack
                gap="300"
                blockAlign="center"
                wrap
              >
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "50%",
                    background: COLORS.white,
                    border:
                      `1px solid ${COLORS.border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: COLORS.sageDark,
                    fontSize: "16px",
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  2
                </div>

                <div>
                  <div
                    style={{
                      fontSize: "17px",
                      fontWeight: 650,
                      color: COLORS.text,
                      marginBottom: "4px",
                    }}
                  >
                    Next: Products & Sizes
                  </div>

                  <div
                    style={{
                      fontSize: "13px",
                      lineHeight: 1.55,
                      color: COLORS.muted,
                      maxWidth: "700px",
                    }}
                  >
                    After creating the profile,
                    choose the exact Little
                    Adventures products, sizes,
                    and SKUs customers in this
                    subscription can receive.
                  </div>
                </div>
              </InlineStack>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(150px, 1fr))",
                  gap: "10px",
                }}
              >
                <NextStepItem text="Products" />
                <NextStepItem text="Sizes" />
                <NextStepItem text="Individual SKUs" />
                <NextStepItem text="Eligibility" />
              </div>
            </BlockStack>
          </div>

          {/* ==================================================
              SUMMARY + CREATE
              ================================================== */}

          <div
            style={{
              background: COLORS.sageDeep,
              borderRadius: "18px",
              padding: "24px",
              boxShadow:
                "0 10px 24px rgba(39,51,42,0.10)",
            }}
          >
            <BlockStack gap="400">
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
                    Ready to continue
                  </div>

                  <div
                    style={{
                      fontSize: "19px",
                      fontWeight: 650,
                      color: "#FFFFFF",
                      marginBottom: "4px",
                    }}
                  >
                    Create the profile, then assign products.
                  </div>

                  <div
                    style={{
                      fontSize: "12px",
                      lineHeight: 1.5,
                      color:
                        "rgba(255,255,255,0.66)",
                    }}
                  >
                    Appstle plan:{" "}
                    {appstlePlanName ||
                      "Not linked yet"}
                  </div>
                </div>

                <Badge
                  tone={
                    status === "active"
                      ? "success"
                      : "attention"
                  }
                >
                  {status === "active"
                    ? "Active"
                    : "Hidden"}
                </Badge>
              </InlineStack>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(170px, 1fr))",
                  gap: "10px",
                }}
              >
                <DarkSummaryCard
                  label="Profile"
                  value={
                    name ||
                    "Not named yet"
                  }
                />

                <DarkSummaryCard
                  label="Selection Opens"
                  value={`${selectionOpenOffset} days before`}
                />

                <DarkSummaryCard
                  label="Deadline"
                  value={`${selectionDeadlineOffset} days before`}
                />

                <DarkSummaryCard
                  label="Products"
                  value="Next Step"
                />
              </div>

              <InlineStack
                align="end"
                gap="300"
                wrap
              >
                <Button
                  url="/app/tiers"
                >
                  Cancel
                </Button>

                <Button
                  variant="primary"
                  onClick={
                    handleCreateProfile
                  }
                  disabled={
                    !canCreate
                  }
                >
                  Create Profile & Continue
                </Button>
              </InlineStack>
            </BlockStack>
          </div>

          <div style={{ height: "20px" }} />
        </BlockStack>
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
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: COLORS.white,
        border:
          `1px solid ${COLORS.border}`,
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
   TIMELINE SETTING
   ============================================================ */

function TimelineSetting({
  step,
  label,
  description,
  value,
  onChange,
  suffix,
  disabled = false,
}: {
  step: string;
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  suffix: string;
  disabled?: boolean;
}) {
  return (
    <div
      style={{
        background: COLORS.page,
        border:
          `1px solid ${COLORS.border}`,
        borderRadius: "14px",
        padding: "16px",
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
              borderRadius: "999px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: COLORS.sageSoft,
              border:
                `1px solid ${COLORS.sageSoftStrong}`,
              color: COLORS.sageDark,
              fontSize: "10px",
              fontWeight: 800,
              flexShrink: 0,
            }}
          >
            {step}
          </div>

          <div>
            <div
              style={{
                fontSize: "13px",
                fontWeight: 650,
                color: COLORS.text,
                marginBottom: "3px",
              }}
            >
              {label}
            </div>

            <div
              style={{
                fontSize: "11px",
                color: COLORS.muted,
              }}
            >
              {description}
            </div>
          </div>
        </InlineStack>

        <TextField
          label={label}
          labelHidden
          value={value}
          onChange={onChange}
          type="number"
          autoComplete="off"
          suffix={suffix}
          disabled={disabled}
        />
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
      <div
        style={{
          maxWidth: "760px",
        }}
      >
        <div
          style={{
            fontSize: "13px",
            fontWeight: 650,
            color: COLORS.text,
            marginBottom: "4px",
          }}
        >
          {label}
        </div>

        <div
          style={{
            fontSize: "12px",
            lineHeight: 1.5,
            color: COLORS.muted,
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
        onClick={onToggle}
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
    <button
      type="button"
      onClick={onToggle}
      style={{
        width: "100%",
        cursor: "pointer",
        textAlign: "left",
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
        borderRadius: "14px",
        padding: "15px",
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
              color: COLORS.text,
              fontSize: "14px",
              fontWeight: 700,
            }}
          >
            {label}
          </div>

          <div
            style={{
              color: COLORS.muted,
              fontSize: "12px",
              marginTop: "3px",
            }}
          >
            {description}
          </div>
        </div>

        <div
          style={{
            minWidth: "38px",
            padding: "5px 7px",
            borderRadius: "999px",
            textAlign: "center",
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
            fontSize: "10px",
            fontWeight: 800,
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
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: COLORS.sageSoft,
        border:
          `1px solid ${COLORS.sageSoftStrong}`,
        borderRadius: "13px",
        padding: "14px 16px",
        color: COLORS.muted,
        fontSize: "12px",
        lineHeight: 1.55,
      }}
    >
      {children}
    </div>
  );
}

/* ============================================================
   NEXT STEP ITEM
   ============================================================ */

function NextStepItem({
  text,
}: {
  text: string;
}) {
  return (
    <div
      style={{
        background: COLORS.white,
        border:
          `1px solid ${COLORS.border}`,
        borderRadius: "11px",
        padding: "11px 12px",
        color: COLORS.sageDark,
        fontSize: "12px",
        fontWeight: 650,
      }}
    >
      ✓ {text}
    </div>
  );
}

/* ============================================================
   DARK SUMMARY CARD
   ============================================================ */

function DarkSummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        background:
          "rgba(255,255,255,0.07)",
        border:
          "1px solid rgba(255,255,255,0.10)",
        borderRadius: "12px",
        padding: "13px 14px",
      }}
    >
      <div
        style={{
          fontSize: "9px",
          fontWeight: 700,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          color:
            "rgba(255,255,255,0.55)",
          marginBottom: "5px",
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: "14px",
          fontWeight: 650,
          color: "#FFFFFF",
        }}
      >
        {value}
      </div>
    </div>
  );
}