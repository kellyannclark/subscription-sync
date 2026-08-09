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
  Card,
  Divider,
  InlineStack,
  Page,
  Select,
  Text,
  TextField,
} from "@shopify/polaris";

import { TitleBar } from "@shopify/app-bridge-react";

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
        title="Create Fulfillment Profile"
        subtitle="Create a subscription program and define how customers move from Appstle to selection and fulfillment."
        backAction={{
          content:
            "Fulfillment Profiles",

          url:
            "/app/tiers",
        }}
        primaryAction={{
          content:
            "Create Profile & Continue",

          onAction:
            handleCreateProfile,

          disabled:
            !canCreate,
        }}
      >
        <TitleBar title="Create Fulfillment Profile" />

        <BlockStack gap="500">

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

                    lineHeight:
                      1.2,

                    fontWeight:
                      700,

                    marginBottom:
                      "8px",
                  }}
                >
                  Build a Subscription Program
                </div>

                <div
                  style={{
                    maxWidth:
                      "720px",

                    color:
                      "#E8EEF7",

                    fontSize:
                      "14px",

                    lineHeight:
                      1.55,
                  }}
                >
                  Connect an Appstle
                  subscription with
                  customer selection,
                  reminders, inventory,
                  and fulfillment rules.
                  Products and individual
                  SKUs are chosen in the
                  next step.
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
                  Step 1 of 2
                </span>
              </div>
            </InlineStack>
          </div>

          {/* ==================================================
              STEP 1 — BASIC INFORMATION
              ================================================== */}

          <Card>
            <BlockStack gap="400">

              <SectionHeading
                step="1"
                title="Basic Information"
                description="Start with the name Little Adventures will recognize for this subscription program."
              />

              <TextField
                label="Profile Name"
                value={name}
                onChange={
                  setName
                }
                autoComplete="off"
                placeholder="Example: Princess Twirl"
                helpText="Use the subscription program name your team already recognizes."
              />

              <TextField
                label="Description"
                value={
                  description
                }
                onChange={
                  setDescription
                }
                multiline={3}
                autoComplete="off"
                placeholder="Example: Monthly Twirl subscription with customer style and size selection."
              />

              <div
                style={{
                  maxWidth:
                    "280px",
                }}
              >
                <Select
                  label="Status"
                  options={
                    statusOptions
                  }
                  value={
                    status
                  }
                  onChange={
                    setStatus
                  }
                />
              </div>

            </BlockStack>
          </Card>

          {/* ==================================================
              STEP 2 — APPSTLE
              ================================================== */}

          <Card>
            <BlockStack gap="400">

              <SectionHeading
                step="2"
                title="Connect to Appstle"
                description="Tell SubscriptionSync which Appstle subscription plan this profile represents."
              />

              <TextField
                label="Appstle Subscription Plan"
                value={
                  appstlePlanName
                }
                onChange={
                  setAppstlePlanName
                }
                autoComplete="off"
                placeholder="Example: Princess Subscription - Twirl"
                helpText="For now this is entered manually. Later the Appstle integration can populate this automatically."
              />

              <SoftInfoBox>
                Appstle remains the
                source of truth for the
                subscription itself.
                SubscriptionSync uses
                this profile to control
                what happens around
                customer selection and
                fulfillment.
              </SoftInfoBox>

            </BlockStack>
          </Card>

          {/* ==================================================
              STEP 3 — CUSTOMER TIMELINE
              ================================================== */}

          <Card>
            <BlockStack gap="400">

              <SectionHeading
                step="3"
                title="Customer Timeline"
                description="Choose when customers can make a selection and when SubscriptionSync should step in automatically."
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
                <TimelineSetting
                  label="Selection Opens"
                  description="Customer can begin choosing."
                  value={
                    selectionOpenOffset
                  }
                  onChange={
                    setSelectionOpenOffset
                  }
                  suffix="days before order"
                />

                <TimelineSetting
                  label="Selection Deadline"
                  description="Customer choice closes."
                  value={
                    selectionDeadlineOffset
                  }
                  onChange={
                    setSelectionDeadlineOffset
                  }
                  suffix="days before order"
                />

                <TimelineSetting
                  label="Auto Selection"
                  description={
                    autoSelectEnabled
                      ? "Automatic selection timing."
                      : "Automatic selection is off."
                  }
                  value={
                    autoSelectOffset
                  }
                  onChange={
                    setAutoSelectOffset
                  }
                  suffix="days after deadline"
                  disabled={
                    !autoSelectEnabled
                  }
                />
              </div>

              <Divider />

              <ToggleSetting
                label="Enable Auto Selection"
                description="If the customer misses the deadline, allow SubscriptionSync to move them into the automatic selection workflow."
                enabled={
                  autoSelectEnabled
                }
                onToggle={() =>
                  setAutoSelectEnabled(
                    (current) =>
                      !current,
                  )
                }
              />

            </BlockStack>
          </Card>

          {/* ==================================================
              STEP 4 — REMINDERS
              ================================================== */}

          <Card>
            <BlockStack gap="400">

              <SectionHeading
                step="4"
                title="Customer Reminders"
                description="Choose when SubscriptionSync should remind customers before their selection deadline."
              />

              <div
                style={{
                  display:
                    "grid",

                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(220px, 1fr))",

                  gap:
                    "12px",
                }}
              >
                <CompactToggle
                  label="14 Days"
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
                  label="7 Days"
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
                  label="3 Days"
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
                  label="1 Day"
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
              STEP 5 — INVENTORY
              ================================================== */}

          <Card>
            <BlockStack gap="400">

              <SectionHeading
                step="5"
                title="Inventory Rules"
                description="Choose how Shopify inventory should affect the products and sizes customers can select."
              />

              <ToggleSetting
                label="Hide Out-of-Stock Products"
                description="Customers will not see unavailable products or individual size variants."
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
                label="Require Inventory Check"
                description="Verify availability again before a customer selection moves into fulfillment."
                enabled={
                  requireInventoryCheck
                }
                onToggle={() =>
                  setRequireInventoryCheck(
                    (current) =>
                      !current,
                  )
                }
              />

              <Divider />

              <ToggleSetting
                label="Allow Backorders"
                description="Allow a selection even when Shopify currently shows no available inventory."
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
              STEP 6 — EMAIL
              ================================================== */}

          <Card>
            <BlockStack gap="400">

              <SectionHeading
                step="6"
                title="Customer Selection Email"
                description="Set up the message customers will eventually receive when it is time to make a selection."
              />

              <TextField
                label="Email Subject"
                value={
                  emailSubject
                }
                onChange={
                  setEmailSubject
                }
                autoComplete="off"
              />

              <TextField
                label="Email Template"
                value={
                  emailTemplate
                }
                onChange={
                  setEmailTemplate
                }
                multiline={8}
                autoComplete="off"
                helpText="Variables such as {{customer_name}} and {{selection_link}} will be connected when email automation is activated."
              />

            </BlockStack>
          </Card>

          {/* ==================================================
              NEXT STEP
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
                "22px",
            }}
          >
            <BlockStack gap="300">

              <InlineStack
                gap="300"
                blockAlign="center"
                wrap
              >
                <div
                  style={{
                    width:
                      "42px",

                    height:
                      "42px",

                    borderRadius:
                      "50%",

                    background:
                      COLORS.softBlueStrong,

                    border:
                      `1px solid ${COLORS.borderBlue}`,

                    display:
                      "flex",

                    alignItems:
                      "center",

                    justifyContent:
                      "center",

                    color:
                      COLORS.numberBlue,

                    fontSize:
                      "17px",

                    fontWeight:
                      800,

                    flexShrink:
                      0,
                  }}
                >
                  2
                </div>

                <div>
                  <Text
                    as="h2"
                    variant="headingMd"
                  >
                    Next: Products & Sizes
                  </Text>

                  <div
                    style={{
                      marginTop:
                        "4px",
                    }}
                  >
                    <Text
                      as="p"
                      variant="bodyMd"
                      tone="subdued"
                    >
                      After creating the
                      profile, you'll choose
                      the exact Little
                      Adventures products,
                      sizes, and SKUs customers
                      in this subscription can
                      receive.
                    </Text>
                  </div>
                </div>
              </InlineStack>

              <div
                style={{
                  display:
                    "grid",

                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(150px, 1fr))",

                  gap:
                    "10px",
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

          <Card>
            <BlockStack gap="400">

              <InlineStack
                align="space-between"
                blockAlign="center"
                gap="300"
                wrap
              >
                <div>
                  <Text
                    as="h2"
                    variant="headingLg"
                  >
                    Ready to Continue?
                  </Text>

                  <div
                    style={{
                      marginTop:
                        "5px",
                    }}
                  >
                    <Text
                      as="p"
                      variant="bodyMd"
                      tone="subdued"
                    >
                      Create this profile,
                      then choose its eligible
                      products and sizes.
                    </Text>
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
                  display:
                    "grid",

                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(170px, 1fr))",

                  gap:
                    "12px",
                }}
              >
                <SummaryBox
                  label="Profile"
                  value={
                    name ||
                    "Not named yet"
                  }
                />

                <SummaryBox
                  label="Selection Opens"
                  value={`${selectionOpenOffset} days before`}
                />

                <SummaryBox
                  label="Deadline"
                  value={`${selectionDeadlineOffset} days before`}
                />

                <SummaryBox
                  label="Products"
                  value="Next Step"
                />
              </div>

              <Divider />

              <Text
                as="p"
                variant="bodyMd"
              >
                <strong>
                  Appstle Plan:
                </strong>{" "}
                {appstlePlanName ||
                  "Not linked yet"}
              </Text>

              <InlineStack
                align="end"
                gap="300"
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
          </Card>

        </BlockStack>
      </Page>
    </div>
  );
}

/* ============================================================
   SECTION HEADING
   ============================================================ */

function SectionHeading({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <InlineStack
      gap="300"
      blockAlign="start"
      wrap={false}
    >
      <div
        style={{
          width:
            "34px",

          height:
            "34px",

          borderRadius:
            "10px",

          background:
            COLORS.softBlueStrong,

          border:
            `1px solid ${COLORS.borderBlue}`,

          color:
            COLORS.numberBlue,

          display:
            "flex",

          alignItems:
            "center",

          justifyContent:
            "center",

          fontSize:
            "13px",

          fontWeight:
            800,

          flexShrink:
            0,
        }}
      >
        {step}
      </div>

      <BlockStack gap="100">
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
   TIMELINE SETTING
   ============================================================ */

function TimelineSetting({
  label,
  description,
  value,
  onChange,
  suffix,
  disabled = false,
}: {
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
      <BlockStack gap="200">

        <BlockStack gap="050">
          <Text
            as="p"
            variant="headingSm"
          >
            {label}
          </Text>

          <Text
            as="p"
            variant="bodySm"
            tone="subdued"
          >
            {description}
          </Text>
        </BlockStack>

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

        cursor:
          "pointer",

        textAlign:
          "left",

        width:
          "100%",
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
            {label}
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

            fontWeight:
              700,

            fontSize:
              "12px",
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
   SOFT INFO BOX
   ============================================================ */

function SoftInfoBox({
  children,
}: {
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
          "15px 17px",
      }}
    >
      <Text
        as="p"
        variant="bodySm"
        tone="subdued"
      >
        {children}
      </Text>
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
        background:
          COLORS.white,

        border:
          `1px solid ${COLORS.borderBlue}`,

        borderRadius:
          "10px",

        padding:
          "10px 12px",

        color:
          COLORS.numberBlue,

        fontSize:
          "13px",

        fontWeight:
          600,
      }}
    >
      ✓ {text}
    </div>
  );
}

/* ============================================================
   SUMMARY BOX
   ============================================================ */

function SummaryBox({
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
          COLORS.softBlue,

        border:
          `1px solid ${COLORS.borderBlue}`,

        borderRadius:
          "12px",

        padding:
          "14px",
      }}
    >
      <BlockStack gap="050">
        <Text
          as="span"
          variant="bodySm"
          tone="subdued"
        >
          {label}
        </Text>

        <Text
          as="span"
          variant="headingSm"
        >
          {value}
        </Text>
      </BlockStack>
    </div>
  );
}