import type {
  LoaderFunctionArgs,
  ActionFunctionArgs,
} from "@remix-run/node";

import { redirect } from "@remix-run/node";
import { useSubmit } from "@remix-run/react";
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
} from "@shopify/polaris";

import { TitleBar } from "@shopify/app-bridge-react";

import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  return null;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  await authenticate.admin(request);

  const formData = await request.formData();

  const name = String(formData.get("name") ?? "").trim();

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
    formData.get("selectionDeadlineOffset") ?? 7,
  );

  const autoSelectOffset = Number(
    formData.get("autoSelectOffset") ?? 2,
  );

  const reminder14Days =
    formData.get("reminder14Days") === "true";

  const reminder7Days =
    formData.get("reminder7Days") === "true";

  const reminder3Days =
    formData.get("reminder3Days") === "true";

  const reminder1Day =
    formData.get("reminder1Day") === "true";

  const autoSelectEnabled =
    formData.get("autoSelectEnabled") === "true";

  const hideOutOfStock =
    formData.get("hideOutOfStock") === "true";

  const allowBackorders =
    formData.get("allowBackorders") === "true";

  const requireInventoryCheck =
    formData.get("requireInventoryCheck") === "true";

  const emailSubject = String(
    formData.get("emailSubject") ?? "",
  ).trim();

  const emailTemplate = String(
    formData.get("emailTemplate") ?? "",
  ).trim();

  const selectedProductsRaw = String(
    formData.get("selectedProducts") ?? "[]",
  );

  const selectedProducts = JSON.parse(
    selectedProductsRaw,
  ) as string[];

  if (!name) {
    throw new Response("Profile name is required.", {
      status: 400,
    });
  }

  await db.fulfillmentProfile.create({
    data: {
      name,
      isActive: status === "active",

      appstlePlanName: appstlePlanName || null,

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

      emailSubject: emailSubject || null,
      emailTemplate: emailTemplate || null,

      products: {
        create: selectedProducts.map((product) => {
          const firstSpaceIndex = product.indexOf(" ");

          const sku =
            firstSpaceIndex > -1
              ? product.substring(0, firstSpaceIndex)
              : product;

          return {
            sku,
            productName: product,
            isActive: true,
          };
        }),
      },
    },
  });

  return redirect("/app/tiers");
};

const mockProducts = [
  "50012 Belle XS",
  "50034 Belle M",
  "50107 Belle L",
  "50158 Belle XL",
  "50219 Snow White XS",
  "50285 Snow White S",
  "50341 Snow White M",
  "50402 Snow White L",
  "50478 Snow White XL",
];

export default function CreateFulfillmentProfilePage() {
  const submit = useSubmit();

  const [name, setName] = useState("");

  const [appstlePlanName, setAppstlePlanName] =
    useState("");

  const [status, setStatus] = useState("active");

  const [
    selectionOpenOffset,
    setSelectionOpenOffset,
  ] = useState("14");

  const [
    selectionDeadlineOffset,
    setSelectionDeadlineOffset,
  ] = useState("7");

  const [reminder14Days, setReminder14Days] =
    useState(true);

  const [reminder7Days, setReminder7Days] =
    useState(true);

  const [reminder3Days, setReminder3Days] =
    useState(true);

  const [reminder1Day, setReminder1Day] =
    useState(true);

  const [
    autoSelectEnabled,
    setAutoSelectEnabled,
  ] = useState(true);

  const [autoSelectOffset, setAutoSelectOffset] =
    useState("2");

  const [hideOutOfStock, setHideOutOfStock] =
    useState(true);

  const [allowBackorders, setAllowBackorders] =
    useState(false);

  const [
    requireInventoryCheck,
    setRequireInventoryCheck,
  ] = useState(true);

  const [emailSubject, setEmailSubject] =
    useState(
      "It's time to make your monthly selection!",
    );

  const [emailTemplate, setEmailTemplate] =
    useState(
      `Hi {{customer_name}},

It's time to make your monthly Little Adventures selection.

Use the link below to choose from the products and sizes currently available for your subscription.

{{selection_link}}

Thank you!

Little Adventures`,
    );

  const [searchValue, setSearchValue] =
    useState("");

  const [
    selectedProducts,
    setSelectedProducts,
  ] = useState<string[]>([]);

  const filteredProducts = mockProducts.filter(
    (product) =>
      product
        .toLowerCase()
        .includes(searchValue.toLowerCase()),
  );

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

  const handleToggleProduct = (
    product: string,
  ) => {
    setSelectedProducts((current) => {
      if (current.includes(product)) {
        return current.filter(
          (item) => item !== product,
        );
      }

      return [...current, product];
    });
  };

  const handleCreateProfile = () => {
    const formData = new FormData();

    formData.append("name", name);

    formData.append(
      "appstlePlanName",
      appstlePlanName,
    );

    formData.append("status", status);

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
      String(reminder14Days),
    );

    formData.append(
      "reminder7Days",
      String(reminder7Days),
    );

    formData.append(
      "reminder3Days",
      String(reminder3Days),
    );

    formData.append(
      "reminder1Day",
      String(reminder1Day),
    );

    formData.append(
      "autoSelectEnabled",
      String(autoSelectEnabled),
    );

    formData.append(
      "autoSelectOffset",
      autoSelectOffset,
    );

    formData.append(
      "hideOutOfStock",
      String(hideOutOfStock),
    );

    formData.append(
      "allowBackorders",
      String(allowBackorders),
    );

    formData.append(
      "requireInventoryCheck",
      String(requireInventoryCheck),
    );

    formData.append(
      "emailSubject",
      emailSubject,
    );

    formData.append(
      "emailTemplate",
      emailTemplate,
    );

    formData.append(
      "selectedProducts",
      JSON.stringify(selectedProducts),
    );

    submit(formData, {
      method: "post",
    });
  };

  return (
    <div className="ss-dashboard">
      <Page
        title="Create Fulfillment Profile"
        subtitle="Configure how a Little Adventures subscription tier moves from Appstle subscription to monthly customer selection and fulfillment."
        backAction={{
          content: "Fulfillment Profiles",
          url: "/app/tiers",
        }}
        primaryAction={{
          content: "Create Profile",
          onAction: handleCreateProfile,
        }}
      >
        <TitleBar title="Create Fulfillment Profile" />

        <BlockStack gap="500">
          <div className="ss-hero">
            <BlockStack gap="200">
              <Text as="h2" variant="headingLg">
                Build the Operational Rules for This Tier
              </Text>

              <Text
                as="p"
                variant="bodyMd"
                tone="subdued"
              >
                Appstle manages the subscription itself.
                This fulfillment profile tells
                SubscriptionSync how to manage the
                customer selection, available products,
                inventory rules, reminders, and
                fulfillment workflow for that
                subscription tier.
              </Text>
            </BlockStack>
          </div>

          {/* PROFILE DETAILS */}
          <Card>
            <BlockStack gap="400">
              <BlockStack gap="100">
                <div className="ss-section-accent" />

                <Text
                  as="h2"
                  variant="headingLg"
                >
                  Profile Details
                </Text>

                <Text
                  as="p"
                  variant="bodyMd"
                  tone="subdued"
                >
                  Give this profile the tier name Little
                  Adventures will recognize inside
                  SubscriptionSync.
                </Text>
              </BlockStack>

              <TextField
                label="Tier / Profile Name"
                value={name}
                onChange={setName}
                autoComplete="off"
                placeholder="Example: Princess Traditional"
              />

              <Select
                label="Status"
                options={statusOptions}
                value={status}
                onChange={setStatus}
              />
            </BlockStack>
          </Card>

          {/* APPSTLE */}
          <Card>
            <BlockStack gap="400">
              <BlockStack gap="100">
                <div className="ss-section-accent" />

                <Text
                  as="h2"
                  variant="headingLg"
                >
                  Appstle Connection
                </Text>

                <Text
                  as="p"
                  variant="bodyMd"
                  tone="subdued"
                >
                  Link this profile to the corresponding
                  Appstle subscription plan.
                </Text>
              </BlockStack>

              <TextField
                label="Linked Appstle Plan"
                value={appstlePlanName}
                onChange={setAppstlePlanName}
                autoComplete="off"
                placeholder="Example: Princess Subscription - Traditional"
                helpText="For now this is entered manually. Later, the Appstle integration can populate and sync this automatically."
              />
            </BlockStack>
          </Card>

          {/* SELECTION WINDOW */}
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
                  These dates are calculated from the
                  customer's upcoming Appstle order date.
                </Text>
              </BlockStack>

              <InlineStack gap="400" wrap>
                <Box minWidth="240px">
                  <TextField
                    label="Selection opens"
                    value={selectionOpenOffset}
                    onChange={setSelectionOpenOffset}
                    type="number"
                    autoComplete="off"
                    suffix="days before order"
                  />
                </Box>

                <Box minWidth="240px">
                  <TextField
                    label="Selection deadline"
                    value={selectionDeadlineOffset}
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

          {/* REMINDERS */}
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
                  SubscriptionSync should send before
                  the customer's selection deadline.
                </Text>
              </BlockStack>

              <ToggleSetting
                label="14-day reminder"
                description="Send a reminder 14 days before the selection deadline."
                enabled={reminder14Days}
                onToggle={() =>
                  setReminder14Days(
                    (current) => !current,
                  )
                }
              />

              <Divider />

              <ToggleSetting
                label="7-day reminder"
                description="Send a reminder 7 days before the selection deadline."
                enabled={reminder7Days}
                onToggle={() =>
                  setReminder7Days(
                    (current) => !current,
                  )
                }
              />

              <Divider />

              <ToggleSetting
                label="3-day reminder"
                description="Send a reminder 3 days before the selection deadline."
                enabled={reminder3Days}
                onToggle={() =>
                  setReminder3Days(
                    (current) => !current,
                  )
                }
              />

              <Divider />

              <ToggleSetting
                label="1-day reminder"
                description="Send a final reminder 1 day before the selection deadline."
                enabled={reminder1Day}
                onToggle={() =>
                  setReminder1Day(
                    (current) => !current,
                  )
                }
              />
            </BlockStack>
          </Card>

          {/* AUTO SELECT */}
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
                  Define what happens when a customer
                  does not submit a selection before
                  the deadline.
                </Text>
              </BlockStack>

              <ToggleSetting
                label="Enable Auto Selection"
                description="Allow SubscriptionSync to move customers who do not submit a selection into the automatic selection workflow."
                enabled={autoSelectEnabled}
                onToggle={() =>
                  setAutoSelectEnabled(
                    (current) => !current,
                  )
                }
              />

              {autoSelectEnabled && (
                <TextField
                  label="Auto selection timing"
                  value={autoSelectOffset}
                  onChange={setAutoSelectOffset}
                  type="number"
                  autoComplete="off"
                  suffix="days after deadline"
                />
              )}
            </BlockStack>
          </Card>

          {/* INVENTORY */}
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
                  Control which Shopify products and
                  variants can be shown to customers.
                </Text>
              </BlockStack>

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
                description="Verify inventory before a customer selection moves into fulfillment."
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
                description="Allow selections even when Shopify inventory is not currently available."
                enabled={allowBackorders}
                onToggle={() =>
                  setAllowBackorders(
                    (current) => !current,
                  )
                }
              />
            </BlockStack>
          </Card>

          {/* PRODUCTS */}
          <Card>
            <BlockStack gap="400">
              <BlockStack gap="100">
                <div className="ss-section-accent" />

                <Text
                  as="h2"
                  variant="headingLg"
                >
                  Eligible Products
                </Text>

                <Text
                  as="p"
                  variant="bodyMd"
                  tone="subdued"
                >
                  Choose the products customers in this
                  tier may select. These are temporary
                  sandbox products while we build the
                  Shopify product and variant
                  integration.
                </Text>
              </BlockStack>

              <TextField
                label="Search eligible products"
                labelHidden
                value={searchValue}
                onChange={setSearchValue}
                autoComplete="off"
                placeholder="Search products..."
                clearButton
                onClearButtonClick={() =>
                  setSearchValue("")
                }
              />

              <Box
                padding="300"
                borderWidth="025"
                borderColor="border"
                borderRadius="200"
                minHeight="220px"
              >
                <BlockStack gap="200">
                  {filteredProducts.map((product) => {
                    const selected =
                      selectedProducts.includes(product);

                    return (
                      <InlineStack
                        key={product}
                        align="space-between"
                        blockAlign="center"
                      >
                        <Text
                          as="span"
                          variant="bodyMd"
                        >
                          {product}
                        </Text>

                        <Button
                          size="slim"
                          variant={
                            selected
                              ? "primary"
                              : "secondary"
                          }
                          onClick={() =>
                            handleToggleProduct(product)
                          }
                        >
                          {selected
                            ? "Selected"
                            : "Add"}
                        </Button>
                      </InlineStack>
                    );
                  })}
                </BlockStack>
              </Box>

              <Text
                as="p"
                variant="bodySm"
                tone="subdued"
              >
                {selectedProducts.length} eligible{" "}
                {selectedProducts.length === 1
                  ? "product"
                  : "products"}{" "}
                selected.
              </Text>
            </BlockStack>
          </Card>

          {/* EMAIL */}
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
                  This email will eventually be sent
                  when SubscriptionSync detects that a
                  customer needs to make a monthly
                  selection.
                </Text>
              </BlockStack>

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
                helpText="Template variables such as {{customer_name}} and {{selection_link}} will be connected when we build the email automation."
              />
            </BlockStack>
          </Card>

          {/* SUMMARY */}
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

              <InlineStack gap="300" wrap>
                <SummaryBox
                  label="Status"
                  value={
                    status === "active"
                      ? "Active"
                      : "Hidden"
                  }
                />

                <SummaryBox
                  label="Eligible Products"
                  value={String(
                    selectedProducts.length,
                  )}
                />

                <SummaryBox
                  label="Selection Opens"
                  value={`${selectionOpenOffset} days before`}
                />

                <SummaryBox
                  label="Deadline"
                  value={`${selectionDeadlineOffset} days before`}
                />
              </InlineStack>

              <Divider />

              <Text as="p" variant="bodyMd">
                <strong>Linked Appstle Plan:</strong>{" "}
                {appstlePlanName ||
                  "Not linked yet"}
              </Text>

              <InlineStack align="end" gap="200">
                <Button
                  url="/app/tiers"
                  variant="plain"
                >
                  Cancel
                </Button>

                <Button
                  variant="primary"
                  onClick={handleCreateProfile}
                >
                  Create Profile
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </BlockStack>
      </Page>
    </div>
  );
}

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
          enabled ? "primary" : "secondary"
        }
        onClick={onToggle}
      >
        {enabled ? "On" : "Off"}
      </Button>
    </InlineStack>
  );
}

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