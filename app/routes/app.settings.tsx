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
  cutoffDate: string;
  processingDelay: string;
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
    cutoffDate: "15",
    processingDelay: "24",
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
  const [cutoffDate, setCutoffDate] = useState(settings.cutoffDate);
  const [processingDelay, setProcessingDelay] = useState(
    settings.processingDelay,
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
      subtitle="Configure automation, reminders, inventory rules, integrations, and order processing for SubscriptionSync."
      backAction={{ content: "Dashboard", url: "/app" }}
    >
      <Form method="post">
        <input type="hidden" name="intent" value={intent} />

        <input
          type="hidden"
          name="automationEnabled"
          value={String(automationEnabled)}
        />
        <input type="hidden" name="cutoffDate" value={cutoffDate} />
        <input
          type="hidden"
          name="processingDelay"
          value={processingDelay}
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
                      Automation Settings
                    </Text>

                    <Checkbox
                      label="Enable automatic monthly selections"
                      checked={automationEnabled}
                      onChange={setAutomationEnabled}
                      helpText="When enabled, eligible subscribers can submit monthly selections and automation can prepare orders."
                    />

                    <Select
                      label="Default selection cutoff date"
                      value={cutoffDate}
                      onChange={setCutoffDate}
                      options={[
                        { label: "1st of each month", value: "1" },
                        { label: "5th of each month", value: "5" },
                        { label: "10th of each month", value: "10" },
                        { label: "15th of each month", value: "15" },
                        { label: "20th of each month", value: "20" },
                      ]}
                    />

                    <Select
                      label="Order processing time delay"
                      value={processingDelay}
                      onChange={setProcessingDelay}
                      options={[
                        { label: "12 hours", value: "12" },
                        { label: "24 hours", value: "24" },
                        { label: "48 hours", value: "48" },
                      ]}
                    />
                  </BlockStack>
                </Card>

                <Card>
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingMd">
                      Reminder Settings
                    </Text>

                    <Checkbox
                      label="Send reminder 14 days before cutoff"
                      checked={reminder14Days}
                      onChange={setReminder14Days}
                    />

                    <Checkbox
                      label="Send reminder 7 days before cutoff"
                      checked={reminder7Days}
                      onChange={setReminder7Days}
                    />

                    <Checkbox
                      label="Send reminder 3 days before cutoff"
                      checked={reminder3Days}
                      onChange={setReminder3Days}
                    />

                    <Checkbox
                      label="Send final reminder 1 day before cutoff"
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
                      label="Auto-create orders after cutoff"
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
                      label="Default tag for auto orders"
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