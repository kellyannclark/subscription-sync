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
  Banner,
  BlockStack,
  Button,
  Card,
  InlineGrid,
  InlineStack,
  Layout,
  Page,
  Select,
  Text,
  TextField,
} from "@shopify/polaris";

import { authenticate } from "../shopify.server";

type MonthlySelection = {
  month: string;
  product: string;
};

type Customer = {
  id: string;
  name: string;
  email: string;
  tier: string;
  subscriptionStartDate: string;
  nextShipDate: string;
  nextSelectionDeadline: string;
};

const productOptions = [
  { label: "Start typing to search products...", value: "" },
  { label: "Belle Dress", value: "belle-dress" },
  { label: "Ariel Dress", value: "ariel-dress" },
  { label: "Cinderella Dress", value: "cinderella-dress" },
  { label: "Rapunzel Dress", value: "rapunzel-dress" },
  { label: "Pirate Adventure Set", value: "pirate-adventure-set" },
];

const initialSelections: MonthlySelection[] = [
  { month: "January", product: "" },
  { month: "February", product: "" },
  { month: "March", product: "" },
  { month: "April", product: "" },
  { month: "May", product: "" },
  { month: "June", product: "" },
  { month: "July", product: "" },
  { month: "August", product: "" },
  { month: "September", product: "" },
  { month: "October", product: "" },
  { month: "November", product: "" },
  { month: "December", product: "" },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  const customer: Customer = {
    id: "john-doe",
    name: "John Doe",
    email: "john@example.com",
    tier: "Twirl Subscription",
    subscriptionStartDate: "January 2025",
    nextShipDate: "October 21, 2025",
    nextSelectionDeadline: "October 18, 2025",
  };

  return json({
    customer,
    selections: initialSelections,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  await authenticate.admin(request);

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "clear") {
    return json({
      success: true,
      message: "Form cleared.",
    });
  }

  return json({
    success: true,
    message: "Customer preferences saved successfully.",
  });
};

export default function QuickSubmitPage() {
  const { customer, selections } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();

  const isSubmitting = navigation.state === "submitting";

  const [intent, setIntent] = useState("save");
  const [customerSearch, setCustomerSearch] = useState("");
  const [monthlySelections, setMonthlySelections] =
    useState<MonthlySelection[]>(selections);

  const updateSelection = (month: string, product: string) => {
    setMonthlySelections((currentSelections) =>
      currentSelections.map((selection) =>
        selection.month === month ? { ...selection, product } : selection,
      ),
    );
  };

  const clearForm = () => {
    setIntent("clear");
    setCustomerSearch("");
    setMonthlySelections((currentSelections) =>
      currentSelections.map((selection) => ({
        ...selection,
        product: "",
      })),
    );
  };

  const firstHalf = monthlySelections.slice(0, 6);
  const secondHalf = monthlySelections.slice(6);

  return (
    <Page
      title="Quick Submit"
      subtitle="Manually update customer selections, apply requested changes, or make inventory-based adjustments."
      backAction={{ content: "Dashboard", url: "/app" }}
    >
      <Form method="post">
        <input type="hidden" name="intent" value={intent} />
        <input type="hidden" name="customerId" value={customer.id} />

        {monthlySelections.map((selection, index) => (
          <input
            key={selection.month}
            type="hidden"
            name={`selections[${index}][product]`}
            value={selection.product}
          />
        ))}

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
                    <Text as="p" tone="subdued">
                      Use this page to manually enter or adjust selections for a
                      customer when they request a change or when inventory
                      requires a substitution.
                    </Text>

                    <InlineStack align="space-between" gap="400" wrap>
                      <BlockStack gap="100">
                        <Text as="p" fontWeight="semibold">
                          Customer: {customer.name}
                        </Text>
                        <Text as="p">Email: {customer.email}</Text>
                        <Text as="p">
                          Subscription Tier: {customer.tier}
                        </Text>
                        <Text as="p">
                          Subscription Start: {customer.subscriptionStartDate}
                        </Text>
                        <Text as="p">
                          Next Ship Date: {customer.nextShipDate}
                        </Text>
                        <Text as="p">
                          Selection Deadline:{" "}
                          {customer.nextSelectionDeadline}
                        </Text>
                      </BlockStack>

                      <div style={{ minWidth: "320px" }}>
                        <TextField
                          label="Customer search"
                          labelHidden
                          value={customerSearch}
                          onChange={setCustomerSearch}
                          placeholder="Start typing name, email, or customer ID"
                          autoComplete="off"
                        />
                      </div>
                    </InlineStack>
                  </BlockStack>
                </Card>

                <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
                  <MonthlySelectionCard
                    selections={firstHalf}
                    onChange={updateSelection}
                  />

                  <MonthlySelectionCard
                    selections={secondHalf}
                    onChange={updateSelection}
                  />
                </InlineGrid>

                <InlineStack align="end" gap="300">
                  <Button
                    submit
                    loading={isSubmitting && intent === "clear"}
                    onClick={clearForm}
                  >
                    Clear Form
                  </Button>

                  <Button
                    submit
                    variant="primary"
                    loading={isSubmitting && intent === "save"}
                    onClick={() => setIntent("save")}
                  >
                    Save Preferences
                  </Button>
                </InlineStack>
              </BlockStack>
            </Layout.Section>
          </Layout>
        </BlockStack>
      </Form>
    </Page>
  );
}

function MonthlySelectionCard({
  selections,
  onChange,
}: {
  selections: MonthlySelection[];
  onChange: (month: string, product: string) => void;
}) {
  return (
    <Card>
      <BlockStack gap="300">
        {selections.map((selection) => (
          <InlineStack
            key={selection.month}
            align="space-between"
            gap="300"
            wrap={false}
          >
            <div style={{ flex: 1 }}>
              <Select
                label={`${selection.month} product`}
                labelHidden
                value={selection.product}
                onChange={(value) => onChange(selection.month, value)}
                options={productOptions}
              />
            </div>

            <div style={{ width: "110px" }}>
              <Text as="p">{selection.month}</Text>
            </div>
          </InlineStack>
        ))}
      </BlockStack>
    </Card>
  );
}