import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  Form,
  useActionData,
  useLoaderData,
  useNavigation,
} from "@remix-run/react";
import { useMemo, useState } from "react";
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
} from "@shopify/polaris";

import { authenticate } from "../shopify.server";
import db from "../db.server";

type MonthlySelection = {
  month: string;
  product: string;
};

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

  const subscribers = await db.subscriber.findMany({
    orderBy: {
      name: "asc",
    },
    include: {
      tier: true,
    },
  });

  const assignedProducts = await db.assignedProduct.findMany({
    orderBy: {
      productName: "asc",
    },
  });

  const uniqueProducts = Array.from(
    new Map(
      assignedProducts.map((product) => [
        product.productName,
        {
          label: product.productName,
          value: product.productName,
        },
      ]),
    ).values(),
  );

  return json({
    subscribers,
    selections: initialSelections,
    productOptions: [
      { label: "Select a product", value: "" },
      ...uniqueProducts,
    ],
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

  const subscriberId = String(formData.get("subscriberId") ?? "");
  const months = formData.getAll("month");
  const products = formData.getAll("product");

  if (!subscriberId) {
    return json({
      success: false,
      message: "Choose a subscriber before saving preferences.",
    });
  }

  const selectedItems = months
    .map((month, index) => ({
      month: String(month),
      productName: String(products[index] ?? ""),
    }))
    .filter((item) => item.productName.length > 0);

  if (selectedItems.length === 0) {
    return json({
      success: false,
      message: "Choose at least one product before saving.",
    });
  }

  await db.$transaction(async (tx) => {
  for (const item of selectedItems) {
    await tx.selection.create({
      data: {
        subscriberId,
        month: item.month,
        productName: item.productName,
        status: "Manual Selection",
        source: "Quick Submit",
      },
    });
  }

      await tx.subscriber.update({
        where: {
          id: subscriberId,
        },
        data: {
          status: "Order Ready",
        },
      });

      await tx.activityLog.create({
        data: {
          eventType: "Quick Submit",
          description: `Saved ${selectedItems.length} manual selection(s).`,
          status: "Success",
          user: "Admin",
          source: "SubscriptionSync",
        },
      });
    });

  return json({
    success: true,
    message: "Customer selections saved successfully.",
  });
};

export default function QuickSubmitPage() {
  const { subscribers, selections, productOptions } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();

  const isSubmitting = navigation.state === "submitting";

  const [intent, setIntent] = useState("save");
  const [selectedSubscriberId, setSelectedSubscriberId] = useState(
    subscribers[0]?.id ?? "",
  );
  const [monthlySelections, setMonthlySelections] =
    useState<MonthlySelection[]>(selections);

  const selectedSubscriber = useMemo(() => {
    return subscribers.find(
      (subscriber) => subscriber.id === selectedSubscriberId,
    );
  }, [subscribers, selectedSubscriberId]);

  const updateSelection = (month: string, product: string) => {
    setMonthlySelections((currentSelections) =>
      currentSelections.map((selection) =>
        selection.month === month ? { ...selection, product } : selection,
      ),
    );
  };

  const clearForm = () => {
    setIntent("clear");
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
        <input type="hidden" name="subscriberId" value={selectedSubscriberId} />

        {monthlySelections.map((selection) => (
          <div key={selection.month}>
            <input type="hidden" name="month" value={selection.month} />
            <input type="hidden" name="product" value={selection.product} />
          </div>
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

                    <Select
                      label="Subscriber"
                      value={selectedSubscriberId}
                      onChange={setSelectedSubscriberId}
                      options={[
                        { label: "Choose a subscriber", value: "" },
                        ...subscribers.map((subscriber) => ({
                          label: `${subscriber.name} — ${subscriber.email}`,
                          value: subscriber.id,
                        })),
                      ]}
                    />

                    {selectedSubscriber ? (
                      <InlineStack align="space-between" gap="400" wrap>
                        <BlockStack gap="100">
                          <Text as="p" fontWeight="semibold">
                            Customer: {selectedSubscriber.name}
                          </Text>
                          <Text as="p">Email: {selectedSubscriber.email}</Text>
                          <Text as="p">
                            Subscription Tier:{" "}
                            {selectedSubscriber.tier?.name ?? "No tier"}
                          </Text>
                          <Text as="p">
                            Subscription Start:{" "}
                            {formatDate(selectedSubscriber.subscriptionStartDate)}
                          </Text>
                          <Text as="p">
                            Next Ship Date:{" "}
                            {formatDate(selectedSubscriber.nextShipDate)}
                          </Text>
                          <Text as="p">
                            Selection Deadline:{" "}
                            {formatDate(
                              selectedSubscriber.nextSelectionDeadline,
                            )}
                          </Text>
                        </BlockStack>
                      </InlineStack>
                    ) : (
                      <Text as="p" tone="subdued">
                        Choose a subscriber to begin.
                      </Text>
                    )}
                  </BlockStack>
                </Card>

                <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
                  <MonthlySelectionCard
                    selections={firstHalf}
                    productOptions={productOptions}
                    onChange={updateSelection}
                  />

                  <MonthlySelectionCard
                    selections={secondHalf}
                    productOptions={productOptions}
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
  productOptions,
  onChange,
}: {
  selections: MonthlySelection[];
  productOptions: { label: string; value: string }[];
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

function formatDate(date: string | Date | null) {
  if (!date) return "Not set";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}