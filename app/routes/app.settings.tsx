import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
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
  Box,
  Button,
  Card,
  Checkbox,
  Divider,
  InlineStack,
  Layout,
  Page,
  Select,
  Text,
  TextField,
} from "@shopify/polaris";

import { authenticate } from "../shopify.server";

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

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  const settings: SettingsData = {
    automationEnabled: true,
    selectionDeadlineOffset: "7",
    autoSelectionOffset: "2",
    orderCreationOffset: "1",
    autoOrderTag: "SubscriptionSync-Auto",
    customerSelectedTag: "MonthlySelection",
    modifiedOrderTag: "AppstleSync",
    hideOutOfStock: true,
    hideDiscontinued: true,
    allowBackorders: false,
    autoCreateOrders: true,
    requireManualReview: false,
    reminder14Days: true,
    reminder7Days: true,
    reminder3Days: true,
    reminder1Day: true,
    emailSender: "support@littleadventures.com",
    testSubscriberEmail: "",
    storeUrl: "https://littleadventures.com",
    shopifyConnected: true,
    appstleConnected: true,
    databaseConnected: true,
    lastSync: "Oct 6, 2025 · 4:37 PM",
  };

  return json({ settings });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  await authenticate.admin(request);

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "sync-now") {
    return json({
      success: true,
      message: "Sync started successfully.",
    });
  }

  if (intent === "test-reminder") {
    const testSubscriberEmail = formData.get("testSubscriberEmail");

    if (!testSubscriberEmail || typeof testSubscriberEmail !== "string") {
      return json({
        success: false,
        message: "Enter a test subscriber email before sending a reminder.",
      });
    }

    return json({
      success: true,
      message: `Test reminder prepared for ${testSubscriberEmail}.`,
    });
  }

  if (intent === "generate-test-order") {
    return json({
      success: true,
      message: "Test order generation started.",
    });
  }

  return json({
    success: true,
    message: "Settings saved successfully.",
  });
};

export default function SettingsPage() {
  const { settings } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();

  const isSubmitting = navigation.state === "submitting";
  const [intent, setIntent] = useState("save");

  const [automationEnabled, setAutomationEnabled] = useState(
    settings.automationEnabled,
  );

  const [selectionDeadlineOffset, setSelectionDeadlineOffset] = useState(
    settings.selectionDeadlineOffset,
  );
  const [autoSelectionOffset, setAutoSelectionOffset] = useState(
    settings.autoSelectionOffset,
  );
  const [orderCreationOffset, setOrderCreationOffset] = useState(
    settings.orderCreationOffset,
  );

  const [reminder14Days, setReminder14Days] = useState(settings.reminder14Days);
  const [reminder7Days, setReminder7Days] = useState(settings.reminder7Days);
  const [reminder3Days, setReminder3Days] = useState(settings.reminder3Days);
  const [reminder1Day, setReminder1Day] = useState(settings.reminder1Day);
  const [emailSender, setEmailSender] = useState(settings.emailSender);

  const [hideOutOfStock, setHideOutOfStock] = useState(
    settings.hideOutOfStock,
  );
  const [hideDiscontinued, setHideDiscontinued] = useState(
    settings.hideDiscontinued,
  );
  const [allowBackorders, setAllowBackorders] = useState(
    settings.allowBackorders,
  );

  const [autoCreateOrders, setAutoCreateOrders] = useState(
    settings.autoCreateOrders,
  );
  const [requireManualReview, setRequireManualReview] = useState(
    settings.requireManualReview,
  );

  const [autoOrderTag, setAutoOrderTag] = useState(settings.autoOrderTag);
  const [customerSelectedTag, setCustomerSelectedTag] = useState(
    settings.customerSelectedTag,
  );
  const [modifiedOrderTag, setModifiedOrderTag] = useState(
    settings.modifiedOrderTag,
  );

  const [testSubscriberEmail, setTestSubscriberEmail] = useState(
    settings.testSubscriberEmail,
  );

  return (
    <Page
      title="Settings"
      subtitle="Configure rolling subscriber schedules, reminders, inventory rules, integrations, and order processing."
      backAction={{ content: "Dashboard", url: "/app" }}
    >
      <Form method="post">
        <input type="hidden" name="intent" value={intent} />

        <input
          type="hidden"
          name="automationEnabled"
          value={String(automationEnabled)}
        />
        <input
          type="hidden"
          name="selectionDeadlineOffset"
          value={selectionDeadlineOffset}
        />
        <input
          type="hidden"
          name="autoSelectionOffset"
          value={autoSelectionOffset}
        />
        <input
          type="hidden"
          name="orderCreationOffset"
          value={orderCreationOffset}
        />

        <input
          type="hidden"
          name="reminder14Days"
          value={String(reminder14Days)}
        />
        <input
          type="hidden"
          name="reminder7Days"
          value={String(reminder7Days)}
        />
        <input
          type="hidden"
          name="reminder3Days"
          value={String(reminder3Days)}
        />
        <input
          type="hidden"
          name="reminder1Day"
          value={String(reminder1Day)}
        />
        <input type="hidden" name="emailSender" value={emailSender} />

        <input
          type="hidden"
          name="hideOutOfStock"
          value={String(hideOutOfStock)}
        />
        <input
          type="hidden"
          name="hideDiscontinued"
          value={String(hideDiscontinued)}
        />
        <input
          type="hidden"
          name="allowBackorders"
          value={String(allowBackorders)}
        />

        <input
          type="hidden"
          name="autoCreateOrders"
          value={String(autoCreateOrders)}
        />
        <input
          type="hidden"
          name="requireManualReview"
          value={String(requireManualReview)}
        />
        <input type="hidden" name="autoOrderTag" value={autoOrderTag} />
        <input
          type="hidden"
          name="customerSelectedTag"
          value={customerSelectedTag}
        />
        <input
          type="hidden"
          name="modifiedOrderTag"
          value={modifiedOrderTag}
        />
        <input
          type="hidden"
          name="testSubscriberEmail"
          value={testSubscriberEmail}
        />

        <BlockStack gap="500">
          {actionData?.message && (
            <Banner
              title={actionData.success ? "Success" : "Action needed"}
              tone={actionData.success ? "success" : "critical"}
            >
              <p>{actionData.message}</p>
            </Banner>
          )}

          <Layout>
            <Layout.Section>
              <BlockStack gap="500">
                <Card>
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingMd">
                      Rolling Schedule Settings
                    </Text>

                    <Text as="p" tone="subdued">
                      These settings calculate deadlines from each subscriber’s
                      individual next ship date.
                    </Text>

                    <Checkbox
                      label="Enable automatic daily subscriber processing"
                      checked={automationEnabled}
                      onChange={setAutomationEnabled}
                      helpText="When enabled, SubscriptionSync can check daily for subscribers who need reminders, auto-selection, or order creation."
                    />

                    <Select
                      label="Selection deadline offset"
                      value={selectionDeadlineOffset}
                      onChange={setSelectionDeadlineOffset}
                      helpText="How many days before the next ship date the subscriber must submit their selection."
                      options={[
                        { label: "3 days before ship date", value: "3" },
                        { label: "5 days before ship date", value: "5" },
                        { label: "7 days before ship date", value: "7" },
                        { label: "10 days before ship date", value: "10" },
                        { label: "14 days before ship date", value: "14" },
                      ]}
                    />

                    <Select
                      label="Auto-selection offset"
                      value={autoSelectionOffset}
                      onChange={setAutoSelectionOffset}
                      helpText="How many days before the ship date the app should auto-select if the subscriber has not submitted a choice."
                      options={[
                        { label: "1 day before ship date", value: "1" },
                        { label: "2 days before ship date", value: "2" },
                        { label: "3 days before ship date", value: "3" },
                        { label: "5 days before ship date", value: "5" },
                      ]}
                    />

                    <Select
                      label="Order creation offset"
                      value={orderCreationOffset}
                      onChange={setOrderCreationOffset}
                      helpText="How many days before the ship date the app should create or prepare the order."
                      options={[
                        { label: "Same day as ship date", value: "0" },
                        { label: "1 day before ship date", value: "1" },
                        { label: "2 days before ship date", value: "2" },
                        { label: "3 days before ship date", value: "3" },
                      ]}
                    />
                  </BlockStack>
                </Card>

                <Card>
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingMd">
                      Reminder Settings
                    </Text>

                    <Text as="p" tone="subdued">
                      Reminder timing is also based on each subscriber’s
                      individual selection deadline.
                    </Text>

                    <Checkbox
                      label="Send reminder 14 days before selection deadline"
                      checked={reminder14Days}
                      onChange={setReminder14Days}
                    />

                    <Checkbox
                      label="Send reminder 7 days before selection deadline"
                      checked={reminder7Days}
                      onChange={setReminder7Days}
                    />

                    <Checkbox
                      label="Send reminder 3 days before selection deadline"
                      checked={reminder3Days}
                      onChange={setReminder3Days}
                    />

                    <Checkbox
                      label="Send final reminder 1 day before selection deadline"
                      checked={reminder1Day}
                      onChange={setReminder1Day}
                    />

                    <TextField
                      label="Default email sender"
                      value={emailSender}
                      onChange={setEmailSender}
                      autoComplete="email"
                    />
                  </BlockStack>
                </Card>

                <Card>
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingMd">
                      Inventory Settings
                    </Text>

                    <Checkbox
                      label="Hide out-of-stock products"
                      checked={hideOutOfStock}
                      onChange={setHideOutOfStock}
                      helpText="Products with no available inventory will not appear on subscriber selection forms."
                    />

                    <Checkbox
                      label="Hide discontinued products"
                      checked={hideDiscontinued}
                      onChange={setHideDiscontinued}
                    />

                    <Checkbox
                      label="Allow backordered products"
                      checked={allowBackorders}
                      onChange={setAllowBackorders}
                    />
                  </BlockStack>
                </Card>

                <Card>
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingMd">
                      Order Creation
                    </Text>

                    <Checkbox
                      label="Auto-create orders using each subscriber’s order creation date"
                      checked={autoCreateOrders}
                      onChange={setAutoCreateOrders}
                    />

                    <Checkbox
                      label="Require manual review before creating orders"
                      checked={requireManualReview}
                      onChange={setRequireManualReview}
                    />

                    <Divider />

                    <TextField
                      label="Default tag for auto-created orders"
                      value={autoOrderTag}
                      onChange={setAutoOrderTag}
                      autoComplete="off"
                    />

                    <TextField
                      label="Default tag for customer-selected orders"
                      value={customerSelectedTag}
                      onChange={setCustomerSelectedTag}
                      autoComplete="off"
                    />

                    <TextField
                      label="Default tag for modified Appstle orders"
                      value={modifiedOrderTag}
                      onChange={setModifiedOrderTag}
                      autoComplete="off"
                    />
                  </BlockStack>
                </Card>

                <Card>
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingMd">
                      Testing Tools
                    </Text>

                    <TextField
                      label="Test subscriber email"
                      value={testSubscriberEmail}
                      onChange={setTestSubscriberEmail}
                      autoComplete="email"
                      placeholder="customer@example.com"
                    />

                    <InlineStack gap="300">
                      <Button
                        submit
                        loading={isSubmitting && intent === "test-reminder"}
                        onClick={() => setIntent("test-reminder")}
                      >
                        Send Test Reminder
                      </Button>

                      <Button
                        submit
                        loading={
                          isSubmitting && intent === "generate-test-order"
                        }
                        onClick={() => setIntent("generate-test-order")}
                      >
                        Generate Test Order
                      </Button>
                    </InlineStack>
                  </BlockStack>
                </Card>
              </BlockStack>
            </Layout.Section>

            <Layout.Section variant="oneThird">
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Integration Status
                  </Text>

                  <Box>
                    <Text as="p" fontWeight="semibold">
                      Shopify Store URL
                    </Text>
                    <Text as="p" tone="subdued">
                      {settings.storeUrl}
                    </Text>
                  </Box>

                  <InlineStack align="space-between">
                    <Text as="p">Shopify connection</Text>
                    <Badge
                      tone={settings.shopifyConnected ? "success" : "critical"}
                    >
                      {settings.shopifyConnected
                        ? "Connected"
                        : "Disconnected"}
                    </Badge>
                  </InlineStack>

                  <InlineStack align="space-between">
                    <Text as="p">Appstle connection</Text>
                    <Badge
                      tone={settings.appstleConnected ? "success" : "critical"}
                    >
                      {settings.appstleConnected
                        ? "Connected"
                        : "Disconnected"}
                    </Badge>
                  </InlineStack>

                  <InlineStack align="space-between">
                    <Text as="p">Database connection</Text>
                    <Badge
                      tone={settings.databaseConnected ? "success" : "critical"}
                    >
                      {settings.databaseConnected
                        ? "Connected"
                        : "Disconnected"}
                    </Badge>
                  </InlineStack>

                  <Divider />

                  <Box>
                    <Text as="p" fontWeight="semibold">
                      Last Sync
                    </Text>
                    <Text as="p" tone="subdued">
                      {settings.lastSync}
                    </Text>
                  </Box>

                  <Button
                    submit
                    loading={isSubmitting && intent === "sync-now"}
                    onClick={() => setIntent("sync-now")}
                  >
                    Sync Now
                  </Button>
                </BlockStack>
              </Card>
            </Layout.Section>
          </Layout>

          <InlineStack align="end" gap="300">
            <Button url="/app">Cancel</Button>

            <Button
              submit
              variant="primary"
              loading={isSubmitting && intent === "save"}
              onClick={() => setIntent("save")}
            >
              Save Settings
            </Button>
          </InlineStack>
        </BlockStack>
      </Form>
    </Page>
  );
}