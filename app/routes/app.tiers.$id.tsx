import type {
  LoaderFunctionArgs,
  ActionFunctionArgs,
} from "@remix-run/node";

import {
  json,
  redirect,
} from "@remix-run/node";

import {
  useLoaderData,
  useSubmit,
} from "@remix-run/react";

import { useState } from "react";

import {
  Page,
  Text,
  BlockStack,
  InlineStack,
  TextField,
  Select,
  Button,
  Divider,
  Badge,
} from "@shopify/polaris";

import { TitleBar } from "@shopify/app-bridge-react";

import { authenticate } from "../shopify.server";
import db from "../db.server";

/* ============================================================
   LOADER
   ============================================================ */

export const loader = async ({
  request,
  params,
}: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  if (!params.id) {
    throw new Response(
      "Missing fulfillment profile ID",
      {
        status: 400,
      },
    );
  }

  const profile =
    await db.fulfillmentProfile.findUnique({
      where: {
        id: params.id,
      },

      include: {
        products: {
          include: {
            variants: true,
          },
        },

        subscribers: true,
      },
    });

  if (!profile) {
    throw new Response(
      "Fulfillment profile not found",
      {
        status: 404,
      },
    );
  }

  const eligibleProductCount =
    profile.products.length;

  const eligibleSkuCount =
    profile.products.reduce(
      (total, product) =>
        total + product.variants.length,
      0,
    );

  return json({
    profile,
    eligibleProductCount,
    eligibleSkuCount,
  });
};

/* ============================================================
   ACTION
   ============================================================ */

export const action = async ({
  request,
  params,
}: ActionFunctionArgs) => {
  await authenticate.admin(request);

  if (!params.id) {
    throw new Response(
      "Missing fulfillment profile ID",
      {
        status: 400,
      },
    );
  }

  const formData =
    await request.formData();

  const intent =
    formData.get("intent");

  /* ==========================================================
     DELETE PROFILE
     ========================================================== */

  if (intent === "delete") {
    const subscriberCount =
      await db.subscriber.count({
        where: {
          fulfillmentProfileId:
            params.id,
        },
      });

    if (subscriberCount > 0) {
      throw new Response(
        "This fulfillment profile cannot be deleted because subscribers are assigned to it. Archive or hide the profile instead.",
        {
          status: 409,
        },
      );
    }

    await db.fulfillmentProfile.delete({
      where: {
        id: params.id,
      },
    });

    return redirect("/app/tiers");
  }

  /* ==========================================================
     SAVE PROFILE RULES
     ========================================================== */

  const name = String(
    formData.get("name") ?? "",
  ).trim();

  const appstlePlanName = String(
    formData.get("appstlePlanName") ?? "",
  ).trim();

  const status = String(
    formData.get("status") ?? "active",
  );

  const selectionOpenOffset = Number(
    formData.get(
      "selectionOpenOffset",
    ) ?? 14,
  );

  const selectionDeadlineOffset =
    Number(
      formData.get(
        "selectionDeadlineOffset",
      ) ?? 7,
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
    formData.get(
      "autoSelectEnabled",
    ) === "true";

  const autoSelectOffset = Number(
    formData.get(
      "autoSelectOffset",
    ) ?? 2,
  );

  const hideOutOfStock =
    formData.get(
      "hideOutOfStock",
    ) === "true";

  const allowBackorders =
    formData.get(
      "allowBackorders",
    ) === "true";

  const requireInventoryCheck =
    formData.get(
      "requireInventoryCheck",
    ) === "true";

  const emailSubject = String(
    formData.get(
      "emailSubject",
    ) ?? "",
  ).trim();

  const emailTemplate = String(
    formData.get(
      "emailTemplate",
    ) ?? "",
  ).trim();

  if (!name) {
    throw new Response(
      "Profile name is required.",
      {
        status: 400,
      },
    );
  }

  /*
   * IMPORTANT:
   *
   * We update ONLY the fulfillment profile rules here.
   *
   * Products and individual SKUs are managed separately at:
   *
   * /app/tiers/:id/products
   *
   * Saving this page will NOT overwrite or delete
   * eligible products and SKUs.
   */
  await db.fulfillmentProfile.update({
    where: {
      id: params.id,
    },

    data: {
      name,

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

  return redirect(
    `/app/tiers/${params.id}`,
  );
};

/* ============================================================
   PAGE
   ============================================================ */

export default function EditFulfillmentProfilePage() {
  const {
    profile,
    eligibleProductCount,
    eligibleSkuCount,
  } =
    useLoaderData<typeof loader>();

  const submit = useSubmit();

  /* ==========================================================
     PROFILE DETAILS
     ========================================================== */

  const [
    name,
    setName,
  ] = useState(
    profile.name,
  );

  const [
    appstlePlanName,
    setAppstlePlanName,
  ] = useState(
    profile.appstlePlanName ?? "",
  );

  const [
    status,
    setStatus,
  ] = useState(
    profile.isActive
      ? "active"
      : "hidden",
  );

  /* ==========================================================
     SELECTION WINDOW
     ========================================================== */

  const [
    selectionOpenOffset,
    setSelectionOpenOffset,
  ] = useState(
    String(
      profile.selectionOpenOffset,
    ),
  );

  const [
    selectionDeadlineOffset,
    setSelectionDeadlineOffset,
  ] = useState(
    String(
      profile.selectionDeadlineOffset,
    ),
  );

  /* ==========================================================
     REMINDERS
     ========================================================== */

  const [
    reminder14Days,
    setReminder14Days,
  ] = useState(
    profile.reminder14Days,
  );

  const [
    reminder7Days,
    setReminder7Days,
  ] = useState(
    profile.reminder7Days,
  );

  const [
    reminder3Days,
    setReminder3Days,
  ] = useState(
    profile.reminder3Days,
  );

  const [
    reminder1Day,
    setReminder1Day,
  ] = useState(
    profile.reminder1Day,
  );

  /* ==========================================================
     AUTO SELECT
     ========================================================== */

  const [
    autoSelectEnabled,
    setAutoSelectEnabled,
  ] = useState(
    profile.autoSelectEnabled,
  );

  const [
    autoSelectOffset,
    setAutoSelectOffset,
  ] = useState(
    String(
      profile.autoSelectOffset,
    ),
  );

  /* ==========================================================
     INVENTORY
     ========================================================== */

  const [
    hideOutOfStock,
    setHideOutOfStock,
  ] = useState(
    profile.hideOutOfStock,
  );

  const [
    allowBackorders,
    setAllowBackorders,
  ] = useState(
    profile.allowBackorders,
  );

  const [
    requireInventoryCheck,
    setRequireInventoryCheck,
  ] = useState(
    profile.requireInventoryCheck,
  );

  /* ==========================================================
     EMAIL
     ========================================================== */

  const [
    emailSubject,
    setEmailSubject,
  ] = useState(
    profile.emailSubject ?? "",
  );

  const [
    emailTemplate,
    setEmailTemplate,
  ] = useState(
    profile.emailTemplate ?? "",
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

  const reminderCount = [
    reminder14Days,
    reminder7Days,
    reminder3Days,
    reminder1Day,
  ].filter(Boolean).length;

  /* ==========================================================
     SAVE
     ========================================================== */

  const handleSaveChanges = () => {
    const formData =
      new FormData();

    formData.append(
      "name",
      name,
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
      "hideOutOfStock",
      String(
        hideOutOfStock,
      ),
    );

    formData.append(
      "allowBackorders",
      String(
        allowBackorders,
      ),
    );

    formData.append(
      "requireInventoryCheck",
      String(
        requireInventoryCheck,
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

  /* ==========================================================
     DELETE
     ========================================================== */

  const handleDeleteProfile = () => {
    const confirmed =
      window.confirm(
        `Delete "${profile.name}" permanently?

This cannot be undone.

If subscribers are assigned to this profile, SubscriptionSync will block the deletion.`,
      );

    if (!confirmed) {
      return;
    }

    const formData =
      new FormData();

    formData.append(
      "intent",
      "delete",
    );

    submit(
      formData,
      {
        method: "post",
      },
    );
  };

  /* ==========================================================
     RENDER
     ========================================================== */

  /* ==========================================================
     RENDER
     ========================================================== */

  return (
    <div
      style={{
        background: "#F7F7F4",
        minHeight: "100vh",
      }}
    >
      <Page
        title="Edit Fulfillment Profile"
        subtitle="Manage the rules that connect this subscription plan to customer selection and fulfillment."
        backAction={{
          content: "Fulfillment Profiles",
          url: "/app/tiers",
        }}
        primaryAction={{
          content: "Save Changes",
          onAction: handleSaveChanges,
        }}
      >
        <TitleBar title="Edit Fulfillment Profile" />

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
                    maxWidth: "650px",
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
                    Fulfillment profile
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
                    Define the rules
                    <br />
                    <span
                      style={{
                        color: "#4D5E51",
                      }}
                    >
                      behind {profile.name}.
                    </span>
                  </div>

                  <div
                    style={{
                      maxWidth: "580px",
                      fontSize: "14px",
                      lineHeight: 1.6,
                      color: "#52574F",
                    }}
                  >
                    Appstle manages the subscription.
                    SubscriptionSync manages the
                    personalization and fulfillment
                    workflow around it.
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
                      color: "#4D5E51",
                      marginBottom: "9px",
                    }}
                  >
                    Profile status
                  </div>

                  <div
                    style={{
                      marginBottom: "10px",
                    }}
                  >
                    {status === "active" ? (
                      <Badge tone="success">
                        Active
                      </Badge>
                    ) : (
                      <Badge tone="attention">
                        Hidden
                      </Badge>
                    )}
                  </div>

                  <div
                    style={{
                      fontSize: "12px",
                      lineHeight: 1.45,
                      color: "#787D75",
                    }}
                  >
                    {profile.subscribers.length} assigned{" "}
                    {profile.subscribers.length === 1
                      ? "subscriber"
                      : "subscribers"}
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
                    {eligibleSkuCount} eligible SKU
                    {eligibleSkuCount === 1 ? "" : "s"}
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
              PROFILE DETAILS
              ================================================== */}

          <SettingsSection
            eyebrow="Profile"
            title="Fulfillment profile"
            description="Define the profile name, status, and the Appstle subscription plan it corresponds to."
          >
            <TextField
              label="Tier / Profile Name"
              value={name}
              onChange={setName}
              autoComplete="off"
            />

            <Select
              label="Status"
              options={statusOptions}
              value={status}
              onChange={setStatus}
            />

            <TextField
              label="Linked Appstle Plan"
              value={appstlePlanName}
              onChange={setAppstlePlanName}
              autoComplete="off"
              placeholder="Example: Princess Subscription - Traditional"
              helpText="This is entered manually for now. Later the Appstle integration can sync this automatically."
            />
          </SettingsSection>

          {/* ==================================================
              SELECTION WINDOW
              ================================================== */}

          <SettingsSection
            eyebrow="Timing"
            title="Customer selection window"
            description="Choose when customers can begin making their monthly selection and when that selection closes."
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "14px",
              }}
            >
              <TimelineInputCard
                step="01"
                title="Selection opens"
                description="How early customers can begin choosing."
              >
                <TextField
                  label="Selection opens"
                  labelHidden
                  value={selectionOpenOffset}
                  onChange={setSelectionOpenOffset}
                  type="number"
                  autoComplete="off"
                  suffix="days before order"
                />
              </TimelineInputCard>

              <TimelineInputCard
                step="02"
                title="Selection deadline"
                description="When the customer's choice must be complete."
              >
                <TextField
                  label="Selection deadline"
                  labelHidden
                  value={selectionDeadlineOffset}
                  onChange={setSelectionDeadlineOffset}
                  type="number"
                  autoComplete="off"
                  suffix="days before order"
                />
              </TimelineInputCard>
            </div>
          </SettingsSection>

          {/* ==================================================
              REMINDERS
              ================================================== */}

          <SettingsSection
            eyebrow="Communication"
            title="Reminder schedule"
            description="Choose which reminders SubscriptionSync should send before the customer's selection deadline."
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
                title="14 days"
                description="Early reminder"
                enabled={reminder14Days}
                onToggle={() =>
                  setReminder14Days(
                    (current) => !current,
                  )
                }
              />

              <CompactToggle
                title="7 days"
                description="One week reminder"
                enabled={reminder7Days}
                onToggle={() =>
                  setReminder7Days(
                    (current) => !current,
                  )
                }
              />

              <CompactToggle
                title="3 days"
                description="Deadline approaching"
                enabled={reminder3Days}
                onToggle={() =>
                  setReminder3Days(
                    (current) => !current,
                  )
                }
              />

              <CompactToggle
                title="1 day"
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
              AUTO SELECT
              ================================================== */}

          <SettingsSection
            eyebrow="Automation"
            title="Auto selection"
            description="Define what happens when a customer does not submit a selection before the deadline."
          >
            <ToggleSetting
              label="Enable Auto Selection"
              description="Move customers who do not submit a selection into the automatic selection workflow."
              enabled={autoSelectEnabled}
              onToggle={() =>
                setAutoSelectEnabled(
                  (current) => !current,
                )
              }
            />

            {autoSelectEnabled && (
              <div
                style={{
                  maxWidth: "320px",
                }}
              >
                <TextField
                  label="Auto selection timing"
                  value={autoSelectOffset}
                  onChange={setAutoSelectOffset}
                  type="number"
                  autoComplete="off"
                  suffix="days after deadline"
                />
              </div>
            )}
          </SettingsSection>

          {/* ==================================================
              INVENTORY
              ================================================== */}

          <SettingsSection
            eyebrow="Products"
            title="Inventory rules"
            description="Control how Shopify inventory affects the exact products and sizes customers can choose."
          >
            <ToggleSetting
              label="Hide Out-of-Stock Products"
              description="Do not show unavailable products or variants on the customer selection form."
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
              description="Verify inventory before a selection moves into fulfillment."
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
              description="Allow a selection even when Shopify inventory is not currently available."
              enabled={allowBackorders}
              onToggle={() =>
                setAllowBackorders(
                  (current) => !current,
                )
              }
            />
          </SettingsSection>

          {/* ==================================================
              ELIGIBLE PRODUCTS & SIZES
              ================================================== */}

          <div
            style={{
              background: "#EEF1ED",
              border: "1px solid #E4EAE3",
              borderRadius: "18px",
              padding: "24px",
            }}
          >
            <BlockStack gap="400">
              <InlineStack
                align="space-between"
                blockAlign="center"
                gap="400"
                wrap
              >
                <SectionHeader
                  eyebrow="Eligibility"
                  title="Eligible products & sizes"
                  description="Manage the exact Little Adventures products, sizes, and SKUs customers in this profile may select."
                />

                <Button
                  variant="primary"
                  url={`/app/tiers/${profile.id}/products`}
                >
                  Manage Eligible Products & Sizes
                </Button>
              </InlineStack>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(190px, 1fr))",
                  gap: "12px",
                }}
              >
                <SummaryCard
                  label="Eligible Products"
                  value={String(
                    eligibleProductCount,
                  )}
                />

                <SummaryCard
                  label="Eligible SKUs"
                  value={String(
                    eligibleSkuCount,
                  )}
                />

                <SummaryCard
                  label="Reminders"
                  value={String(reminderCount)}
                />
              </div>

              {eligibleSkuCount === 0 ? (
                <InfoBox tone="attention">
                  <strong>
                    No eligible SKUs selected yet.
                  </strong>{" "}
                  Open Eligible Products & Sizes to
                  choose the individual variants
                  customers in this profile may
                  select.
                </InfoBox>
              ) : (
                <InfoBox tone="success">
                  <strong>
                    Product eligibility configured.
                  </strong>{" "}
                  {eligibleSkuCount} individual SKU
                  {eligibleSkuCount === 1 ? "" : "s"}{" "}
                  are currently eligible across{" "}
                  {eligibleProductCount} product
                  {eligibleProductCount === 1
                    ? ""
                    : "s"}.
                </InfoBox>
              )}
            </BlockStack>
          </div>

          {/* ==================================================
              EMAIL
              ================================================== */}

          <SettingsSection
            eyebrow="Communication"
            title="Customer selection email"
            description="Configure the message customers will eventually receive when it is time to make their monthly selection."
          >
            <TextField
              label="Email subject"
              value={emailSubject}
              onChange={setEmailSubject}
              autoComplete="off"
            />

            <TextField
              label="Email template"
              value={emailTemplate}
              onChange={setEmailTemplate}
              multiline={10}
              autoComplete="off"
              helpText="Template variables such as {{customer_name}} and {{selection_link}} will be connected when the email automation is built."
            />
          </SettingsSection>

          {/* ==================================================
              PROFILE SUMMARY
              ================================================== */}

          <div
            style={{
              background: "#39483D",
              borderRadius: "18px",
              padding: "24px",
              boxShadow:
                "0 10px 24px rgba(39,51,42,0.10)",
            }}
          >
            <BlockStack gap="400">
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
                  Profile summary
                </div>

                <div
                  style={{
                    fontSize: "19px",
                    fontWeight: 650,
                    color: "#FFFFFF",
                    marginBottom: "5px",
                  }}
                >
                  {name || profile.name}
                </div>

                <div
                  style={{
                    fontSize: "12px",
                    lineHeight: 1.55,
                    color:
                      "rgba(255,255,255,0.66)",
                  }}
                >
                  Linked Appstle plan:{" "}
                  {appstlePlanName ||
                    "Not linked yet"}
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(150px, 1fr))",
                  gap: "10px",
                }}
              >
                <DarkSummaryCard
                  label="Status"
                  value={
                    status === "active"
                      ? "Active"
                      : "Hidden"
                  }
                />

                <DarkSummaryCard
                  label="Eligible products"
                  value={String(
                    eligibleProductCount,
                  )}
                />

                <DarkSummaryCard
                  label="Eligible SKUs"
                  value={String(
                    eligibleSkuCount,
                  )}
                />

                <DarkSummaryCard
                  label="Reminders"
                  value={String(reminderCount)}
                />

                <DarkSummaryCard
                  label="Auto select"
                  value={
                    autoSelectEnabled
                      ? "Enabled"
                      : "Off"
                  }
                />

                <DarkSummaryCard
                  label="Inventory check"
                  value={
                    requireInventoryCheck
                      ? "Enabled"
                      : "Off"
                  }
                />
              </div>

              <div
                style={{
                  background:
                    "rgba(255,255,255,0.07)",
                  border:
                    "1px solid rgba(255,255,255,0.10)",
                  borderRadius: "12px",
                  padding: "14px 16px",
                  color:
                    "rgba(255,255,255,0.72)",
                  fontSize: "12px",
                  lineHeight: 1.55,
                }}
              >
                Selection opens{" "}
                <strong style={{ color: "#FFFFFF" }}>
                  {selectionOpenOffset} days
                </strong>{" "}
                before the order and closes{" "}
                <strong style={{ color: "#FFFFFF" }}>
                  {selectionDeadlineOffset} days
                </strong>{" "}
                before the order.
              </div>

              <InlineStack
                align="space-between"
                blockAlign="center"
                gap="400"
                wrap
              >
                <div>
                  <Button
                    tone="critical"
                    variant="plain"
                    onClick={handleDeleteProfile}
                  >
                    Delete Profile
                  </Button>

                  {profile.subscribers.length > 0 && (
                    <div
                      style={{
                        marginTop: "4px",
                        fontSize: "11px",
                        color:
                          "rgba(255,255,255,0.55)",
                      }}
                    >
                      Profiles with assigned
                      subscribers cannot be deleted.
                    </div>
                  )}
                </div>

                <InlineStack gap="200" wrap>
                  <Button
                    url="/app/tiers"
                  >
                    Cancel
                  </Button>

                  <Button
                    variant="primary"
                    onClick={handleSaveChanges}
                  >
                    Save Changes
                  </Button>
                </InlineStack>
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
   TIMELINE INPUT CARD
   ============================================================ */

function TimelineInputCard({
  step,
  title,
  description,
  children,
}: {
  step: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "#F7F7F4",
        border: "1px solid #E4E5DF",
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
              background: "#EEF1ED",
              border: "1px solid #E4EAE3",
              color: "#4D5E51",
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
                color: "#20221F",
                marginBottom: "3px",
              }}
            >
              {title}
            </div>

            <div
              style={{
                fontSize: "11px",
                color: "#787D75",
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
            color: "#20221F",
            marginBottom: "4px",
          }}
        >
          {label}
        </div>

        <div
          style={{
            fontSize: "12px",
            lineHeight: 1.5,
            color: "#787D75",
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
        {enabled ? "On" : "Off"}
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
      onClick={onToggle}
      style={{
        width: "100%",
        cursor: "pointer",
        textAlign: "left",
        background:
          enabled
            ? "#EEF1ED"
            : "#F7F7F4",
        border:
          `1px solid ${
            enabled
              ? "#E4EAE3"
              : "#E4E5DF"
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
              color: "#20221F",
              fontSize: "14px",
              fontWeight: 700,
            }}
          >
            {title}
          </div>

          <div
            style={{
              color: "#787D75",
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
                ? "#4D5E51"
                : "#FFFFFF",
            border:
              `1px solid ${
                enabled
                  ? "#4D5E51"
                  : "#D6D8D2"
              }`,
            color:
              enabled
                ? "#FFFFFF"
                : "#787D75",
            fontSize: "10px",
            fontWeight: 800,
          }}
        >
          {enabled ? "ON" : "OFF"}
        </div>
      </InlineStack>
    </button>
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
        borderRadius: "14px",
        padding: "16px",
      }}
    >
      <div
        style={{
          fontSize: "10px",
          fontWeight: 700,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          color: "#787D75",
          marginBottom: "8px",
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: "20px",
          fontWeight: 650,
          letterSpacing: "-0.03em",
          color: "#20221F",
        }}
      >
        {value}
      </div>
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

/* ============================================================
   INFO BOX
   ============================================================ */

function InfoBox({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "success" | "attention";
}) {
  const isSuccess =
    tone === "success";

  return (
    <div
      style={{
        background:
          isSuccess
            ? "#EDF3ED"
            : "#F7F0E2",
        border:
          `1px solid ${
            isSuccess
              ? "#CDDCCF"
              : "#E9D6AE"
          }`,
        borderRadius: "13px",
        padding: "14px 16px",
        color:
          isSuccess
            ? "#4D5E51"
            : "#705F42",
        fontSize: "12px",
        lineHeight: 1.55,
      }}
    >
      {children}
    </div>
  );
}