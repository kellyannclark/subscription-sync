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
  Card,
  Text,
  BlockStack,
  InlineStack,
  TextField,
  Select,
  Button,
  Box,
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

  return (
    <div className="ss-dashboard">
      <Page
        title="Edit Fulfillment Profile"
        subtitle="Manage the operational rules that connect this subscription tier to monthly selection and fulfillment."
        backAction={{
          content:
            "Fulfillment Profiles",
          url: "/app/tiers",
        }}
        primaryAction={{
          content:
            "Save Changes",
          onAction:
            handleSaveChanges,
        }}
      >
        <TitleBar title="Edit Fulfillment Profile" />

        <BlockStack gap="500">

          {/* ==================================================
              HERO
              ================================================== */}

          <div className="ss-hero">
            <InlineStack
              align="space-between"
              blockAlign="start"
              gap="400"
              wrap
            >
              <BlockStack gap="150">
                <Text
                  as="h2"
                  variant="headingLg"
                >
                  {profile.name}
                </Text>

                <Text
                  as="p"
                  variant="bodyMd"
                  tone="subdued"
                >
                  Appstle manages the
                  subscription.
                  SubscriptionSync manages
                  the customer selection
                  and fulfillment workflow.
                </Text>
              </BlockStack>

              <BlockStack
                gap="050"
                inlineAlign="end"
              >
                <Text
                  as="p"
                  variant="bodySm"
                  tone="subdued"
                >
                  Last updated{" "}
                  {new Date(
                    profile.updatedAt,
                  ).toLocaleDateString()}
                </Text>

                <Text
                  as="p"
                  variant="bodySm"
                  tone="subdued"
                >
                  {
                    profile.subscribers
                      .length
                  }{" "}
                  assigned{" "}
                  {profile.subscribers
                    .length === 1
                    ? "subscriber"
                    : "subscribers"}
                </Text>
              </BlockStack>
            </InlineStack>
          </div>

          {/* ==================================================
              PROFILE DETAILS
              ================================================== */}

          <Card>
            <BlockStack gap="400">
              <BlockStack gap="100">
                <div className="ss-section-accent" />

                <Text
                  as="h2"
                  variant="headingLg"
                >
                  Fulfillment Profile
                </Text>

                <Text
                  as="p"
                  variant="bodyMd"
                  tone="subdued"
                >
                  Define the tier name,
                  status, and corresponding
                  Appstle subscription plan.
                </Text>
              </BlockStack>

              <TextField
                label="Tier / Profile Name"
                value={name}
                onChange={setName}
                autoComplete="off"
              />

              <Select
                label="Status"
                options={
                  statusOptions
                }
                value={status}
                onChange={setStatus}
              />

              <TextField
                label="Linked Appstle Plan"
                value={
                  appstlePlanName
                }
                onChange={
                  setAppstlePlanName
                }
                autoComplete="off"
                placeholder="Example: Princess Subscription - Traditional"
                helpText="This is entered manually for now. Later the Appstle integration can sync this automatically."
              />
            </BlockStack>
          </Card>

          {/* ==================================================
              SELECTION WINDOW
              ================================================== */}

          <Card>
            <BlockStack gap="400">
              <BlockStack gap="100">
                <div className="ss-section-accent" />

                <Text
                  as="h2"
                  variant="headingLg"
                >
                  Customer Selection Window
                </Text>

                <Text
                  as="p"
                  variant="bodyMd"
                  tone="subdued"
                >
                  These settings determine
                  when the customer can make
                  their monthly selection
                  relative to the upcoming
                  Appstle order date.
                </Text>
              </BlockStack>

              <InlineStack
                gap="400"
                wrap
              >
                <Box minWidth="240px">
                  <TextField
                    label="Selection opens"
                    value={
                      selectionOpenOffset
                    }
                    onChange={
                      setSelectionOpenOffset
                    }
                    type="number"
                    autoComplete="off"
                    suffix="days before order"
                  />
                </Box>

                <Box minWidth="240px">
                  <TextField
                    label="Selection deadline"
                    value={
                      selectionDeadlineOffset
                    }
                    onChange={
                      setSelectionDeadlineOffset
                    }
                    type="number"
                    autoComplete="off"
                    suffix="days before order"
                  />
                </Box>
              </InlineStack>
            </BlockStack>
          </Card>

          {/* ==================================================
              REMINDERS
              ================================================== */}

          <Card>
            <BlockStack gap="400">
              <BlockStack gap="100">
                <div className="ss-section-accent" />

                <Text
                  as="h2"
                  variant="headingLg"
                >
                  Reminder Schedule
                </Text>

                <Text
                  as="p"
                  variant="bodyMd"
                  tone="subdued"
                >
                  Choose which reminders
                  SubscriptionSync should
                  send before the customer's
                  selection deadline.
                </Text>
              </BlockStack>

              <ToggleSetting
                label="14-day reminder"
                description="Send a reminder 14 days before the selection deadline."
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

              <Divider />

              <ToggleSetting
                label="7-day reminder"
                description="Send a reminder 7 days before the selection deadline."
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

              <Divider />

              <ToggleSetting
                label="3-day reminder"
                description="Send a reminder 3 days before the selection deadline."
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

              <Divider />

              <ToggleSetting
                label="1-day reminder"
                description="Send a final reminder 1 day before the selection deadline."
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
            </BlockStack>
          </Card>

          {/* ==================================================
              AUTO SELECT
              ================================================== */}

          <Card>
            <BlockStack gap="400">
              <BlockStack gap="100">
                <div className="ss-section-accent" />

                <Text
                  as="h2"
                  variant="headingLg"
                >
                  Auto Selection
                </Text>

                <Text
                  as="p"
                  variant="bodyMd"
                  tone="subdued"
                >
                  Define what happens when
                  a customer does not submit
                  a selection before the
                  deadline.
                </Text>
              </BlockStack>

              <ToggleSetting
                label="Enable Auto Selection"
                description="Move customers who do not submit a selection into the automatic selection workflow."
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

              {autoSelectEnabled && (
                <TextField
                  label="Auto selection timing"
                  value={
                    autoSelectOffset
                  }
                  onChange={
                    setAutoSelectOffset
                  }
                  type="number"
                  autoComplete="off"
                  suffix="days after deadline"
                />
              )}
            </BlockStack>
          </Card>

          {/* ==================================================
              INVENTORY
              ================================================== */}

          <Card>
            <BlockStack gap="400">
              <BlockStack gap="100">
                <div className="ss-section-accent" />

                <Text
                  as="h2"
                  variant="headingLg"
                >
                  Inventory Rules
                </Text>

                <Text
                  as="p"
                  variant="bodyMd"
                  tone="subdued"
                >
                  Control how Shopify
                  inventory affects the
                  exact products and size
                  variants available to
                  customers.
                </Text>
              </BlockStack>

              <ToggleSetting
                label="Hide Out-of-Stock Products"
                description="Do not show unavailable products or variants on the customer selection form."
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
                description="Verify inventory before a selection moves into fulfillment."
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
                description="Allow a selection even when Shopify inventory is not currently available."
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
              ELIGIBLE PRODUCTS & SIZES
              ================================================== */}

          <Card>
            <BlockStack gap="400">
              <BlockStack gap="100">
                <div className="ss-section-accent" />

                <InlineStack
                  align="space-between"
                  blockAlign="center"
                  gap="300"
                  wrap
                >
                  <BlockStack gap="100">
                    <Text
                      as="h2"
                      variant="headingLg"
                    >
                      Eligible Products &
                      Sizes
                    </Text>

                    <Text
                      as="p"
                      variant="bodyMd"
                      tone="subdued"
                    >
                      Manage the exact
                      Little Adventures
                      products, sizes, and
                      SKUs customers in this
                      fulfillment profile may
                      select.
                    </Text>
                  </BlockStack>

                  <Button
                    variant="primary"
                    url={`/app/tiers/${profile.id}/products`}
                  >
                    Manage Eligible Products
                    & Sizes
                  </Button>
                </InlineStack>
              </BlockStack>

              <Divider />

              <InlineStack
                gap="300"
                wrap
              >
                <SummaryBox
                  label="Eligible Products"
                  value={String(
                    eligibleProductCount,
                  )}
                />

                <SummaryBox
                  label="Eligible SKUs"
                  value={String(
                    eligibleSkuCount,
                  )}
                />
              </InlineStack>

              {eligibleSkuCount ===
              0 ? (
                <Box
                  padding="400"
                  background="bg-surface-secondary"
                  borderRadius="200"
                >
                  <BlockStack gap="150">
                    <Text
                      as="p"
                      variant="bodyMd"
                      fontWeight="semibold"
                    >
                      No eligible SKUs
                      selected yet
                    </Text>

                    <Text
                      as="p"
                      variant="bodySm"
                      tone="subdued"
                    >
                      Open Eligible Products
                      & Sizes to choose the
                      individual product
                      variants customers in
                      this profile may select.
                    </Text>
                  </BlockStack>
                </Box>
              ) : (
                <Box
                  padding="400"
                  background="bg-surface-secondary"
                  borderRadius="200"
                >
                  <InlineStack
                    align="space-between"
                    blockAlign="center"
                    gap="300"
                    wrap
                  >
                    <BlockStack gap="100">
                      <Text
                        as="p"
                        variant="bodyMd"
                        fontWeight="semibold"
                      >
                        Product eligibility
                        configured
                      </Text>

                      <Text
                        as="p"
                        variant="bodySm"
                        tone="subdued"
                      >
                        {
                          eligibleSkuCount
                        }{" "}
                        individual SKUs are
                        currently eligible
                        across{" "}
                        {
                          eligibleProductCount
                        }{" "}
                        products.
                      </Text>
                    </BlockStack>

                    <Badge tone="success">
                      Configured
                    </Badge>
                  </InlineStack>
                </Box>
              )}
            </BlockStack>
          </Card>

          {/* ==================================================
              EMAIL
              ================================================== */}

          <Card>
            <BlockStack gap="400">
              <BlockStack gap="100">
                <div className="ss-section-accent" />

                <Text
                  as="h2"
                  variant="headingLg"
                >
                  Customer Selection Email
                </Text>

                <Text
                  as="p"
                  variant="bodyMd"
                  tone="subdued"
                >
                  Configure the email
                  customers will eventually
                  receive when it is time to
                  make their monthly
                  selection.
                </Text>
              </BlockStack>

              <TextField
                label="Email subject"
                value={
                  emailSubject
                }
                onChange={
                  setEmailSubject
                }
                autoComplete="off"
              />

              <TextField
                label="Email template"
                value={
                  emailTemplate
                }
                onChange={
                  setEmailTemplate
                }
                multiline={10}
                autoComplete="off"
                helpText="Template variables such as {{customer_name}} and {{selection_link}} will be connected when the email automation is built."
              />
            </BlockStack>
          </Card>

          {/* ==================================================
              SUMMARY
              ================================================== */}

          <Card>
            <BlockStack gap="300">
              <BlockStack gap="100">
                <div className="ss-section-accent" />

                <Text
                  as="h2"
                  variant="headingLg"
                >
                  Profile Summary
                </Text>
              </BlockStack>

              <InlineStack
                gap="300"
                wrap
              >
                <SummaryBox
                  label="Status"
                  value={
                    status ===
                    "active"
                      ? "Active"
                      : "Hidden"
                  }
                />

                <SummaryBox
                  label="Eligible Products"
                  value={String(
                    eligibleProductCount,
                  )}
                />

                <SummaryBox
                  label="Eligible SKUs"
                  value={String(
                    eligibleSkuCount,
                  )}
                />

                <SummaryBox
                  label="Reminders"
                  value={String(
                    reminderCount,
                  )}
                />

                <SummaryBox
                  label="Auto Select"
                  value={
                    autoSelectEnabled
                      ? "Enabled"
                      : "Off"
                  }
                />

                <SummaryBox
                  label="Inventory Check"
                  value={
                    requireInventoryCheck
                      ? "Enabled"
                      : "Off"
                  }
                />
              </InlineStack>

              <Divider />

              <Text
                as="p"
                variant="bodyMd"
              >
                <strong>
                  Linked Appstle Plan:
                </strong>{" "}
                {appstlePlanName ||
                  "Not linked yet"}
              </Text>

              <Text
                as="p"
                variant="bodyMd"
              >
                <strong>
                  Selection Window:
                </strong>{" "}
                Opens{" "}
                {
                  selectionOpenOffset
                }{" "}
                days before order and
                closes{" "}
                {
                  selectionDeadlineOffset
                }{" "}
                days before order.
              </Text>

              <Divider />

              {/* DELETE + SAVE */}

              <InlineStack
                align="space-between"
                blockAlign="center"
                gap="300"
                wrap
              >
                <BlockStack gap="050">
                  <Button
                    tone="critical"
                    variant="plain"
                    onClick={
                      handleDeleteProfile
                    }
                  >
                    Delete Profile
                  </Button>

                  {profile.subscribers
                    .length > 0 && (
                    <Text
                      as="p"
                      variant="bodySm"
                      tone="subdued"
                    >
                      Profiles with assigned
                      subscribers cannot be
                      deleted.
                    </Text>
                  )}
                </BlockStack>

                <InlineStack gap="200">
                  <Button
                    url="/app/tiers"
                    variant="plain"
                  >
                    Cancel
                  </Button>

                  <Button
                    variant="primary"
                    onClick={
                      handleSaveChanges
                    }
                  >
                    Save Changes
                  </Button>
                </InlineStack>
              </InlineStack>
            </BlockStack>
          </Card>
        </BlockStack>
      </Page>
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
    <Box
      padding="300"
      background="bg-surface-secondary"
      borderRadius="200"
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
          variant="headingMd"
        >
          {value}
        </Text>
      </BlockStack>
    </Box>
  );
}