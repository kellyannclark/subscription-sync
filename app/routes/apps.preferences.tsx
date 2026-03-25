import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useState } from "react";
import {
  Page,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Select,
  Button,
  Box,
  TextField,
  Banner,
  Link,
} from "@shopify/polaris";
import {
  AppProxyProvider,
  AppProxyForm,
} from "@shopify/shopify-app-remix/react";
import { authenticate } from "../shopify.server";

type MonthlyPreference = {
  month: string;
  dress: string;
  size: string;
};

type CatalogItem = {
  id: string;
  name: string;
  sku: string;
  description: string;
  image: string;
};

const generateMonths = (): MonthlyPreference[] => {
  const months: MonthlyPreference[] = [];
  const currentDate = new Date();

  for (let i = 0; i < 12; i++) {
    const date = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + i,
      1,
    );

    const monthLabel = date.toLocaleString("default", {
      month: "long",
      year: "numeric",
    });

    months.push({
      month: monthLabel,
      dress: "",
      size: "",
    });
  }

  return months;
};

const dressOptions = [
  { label: "Select a dress", value: "" },
  { label: "Blue Belle", value: "blue-belle" },
  { label: "Wizard Twist", value: "wizard-twist" },
  { label: "Pink Fashion", value: "pink-fashion" },
  { label: "Sweet Cindy", value: "sweet-cindy" },
  { label: "Holiday Joy", value: "holiday-joy" },
];

const sizeOptions = [
  { label: "Select a size", value: "" },
  { label: "2T", value: "2t" },
  { label: "3T", value: "3t" },
  { label: "4T", value: "4t" },
  { label: "5/6", value: "5-6" },
  { label: "7/8", value: "7-8" },
];

const catalogItems: CatalogItem[] = [
  {
    id: "1",
    name: "Blue Belle",
    sku: "50012",
    description:
      "A classic blue dress with apron details and a soft storybook feel.",
    image:
      "https://cdn.shopify.com/s/files/1/0262/4071/2726/files/placeholder-images-image_medium.png",
  },
  {
    id: "2",
    name: "Wizard Twist",
    sku: "50034",
    description:
      "A magical grey-and-white look with playful school-inspired details.",
    image:
      "https://cdn.shopify.com/s/files/1/0262/4071/2726/files/placeholder-images-image_medium.png",
  },
  {
    id: "3",
    name: "Pink Fashion",
    sku: "50107",
    description:
      "A light pink dress with chic details and a fun fashion-forward style.",
    image:
      "https://cdn.shopify.com/s/files/1/0262/4071/2726/files/placeholder-images-image_medium.png",
  },
  {
    id: "4",
    name: "Sweet Cindy",
    sku: "50158",
    description:
      "A dreamy blue dress with bright trim and soft fairytale charm.",
    image:
      "https://cdn.shopify.com/s/files/1/0262/4071/2726/files/placeholder-images-image_medium.png",
  },
  {
    id: "5",
    name: "Holiday Joy",
    sku: "50219",
    description:
      "A festive pink style with cheerful ribbon details and holiday sparkle.",
    image:
      "https://cdn.shopify.com/s/files/1/0262/4071/2726/files/placeholder-images-image_medium.png",
  },
  {
    id: "6",
    name: "Snow Day",
    sku: "50285",
    description:
      "A winter-inspired style with soft tones and cozy seasonal charm.",
    image:
      "https://cdn.shopify.com/s/files/1/0262/4071/2726/files/placeholder-images-image_medium.png",
  },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.public.appProxy(request);

  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    throw new Response("Missing token", { status: 400 });
  }

  // TODO:
  // Look up this token in your own database and load the correct:
  // - subscriber
  // - subscription / tier
  // - allowed catalog items
  // - any saved preferences
  //
  // For now, we return mock data so the page renders.

  return json({
    appUrl: process.env.SHOPIFY_APP_URL ?? "",
    token,
    subscriberName: "Sample Subscriber",
    tierName: "Twirl",
    preferences: generateMonths(),
    catalogItems,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  await authenticate.public.appProxy(request);

  const formData = await request.formData();
  const token = formData.get("token");

  if (!token || typeof token !== "string") {
    return json(
      { ok: false, error: "Missing token." },
      { status: 400 },
    );
  }

  const notes = formData.get("notes");

  const submittedPreferences = Array.from({ length: 12 }, (_, index) => ({
    month: formData.get(`preferences[${index}][month]`),
    dress: formData.get(`preferences[${index}][dress]`),
    size: formData.get(`preferences[${index}][size]`),
  }));

  // TODO:
  // Validate token against your database
  // Save submittedPreferences + notes
  // Tie them to the correct subscription/customer

  console.log("Submitted preferences", {
    token,
    notes,
    submittedPreferences,
  });

  return json({ ok: true });
};

export default function SubscriberFormPage() {
  const { appUrl, token, subscriberName, tierName, preferences, catalogItems } =
    useLoaderData<typeof loader>();

  const [localPreferences, setLocalPreferences] =
    useState<MonthlyPreference[]>(preferences);
  const [notes, setNotes] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const handleDressChange = (index: number, value: string) => {
    setLocalPreferences((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, dress: value } : item,
      ),
    );
  };

  const handleSizeChange = (index: number, value: string) => {
    setLocalPreferences((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, size: value } : item,
      ),
    );
  };

  const handleSubmitPreferences = () => {
    // This keeps your existing page-level button behavior for now.
    // Real saving should happen through the AppProxyForm submit below.
    setShowSuccess(true);
  };

  return (
    <AppProxyProvider appUrl={appUrl}>
      <Page
        title="Subscriber Form"
        primaryAction={{
          content: "Submit Preferences",
          onAction: handleSubmitPreferences,
        }}
      >
        <BlockStack gap="500">
          {showSuccess && (
            <Banner
              title="Preferences submitted"
              tone="success"
              onDismiss={() => setShowSuccess(false)}
            >
              <p>Your monthly preferences have been recorded.</p>
            </Banner>
          )}

          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingLg">
                Monthly Pick
              </Text>

              <Text as="p" variant="bodyLg" fontWeight="medium">
                Hello {subscriberName}, you’re on the {tierName} plan.
              </Text>

              <Text as="p" variant="bodyMd">
                Want to change your plan? <Link url="#">Contact support</Link>
              </Text>
            </BlockStack>
          </Card>

          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingLg">
                How this works
              </Text>

              <Text as="p" variant="bodyMd">
                You can choose all of your upcoming dress selections now, or
                submit them month by month when you receive your reminder email.
              </Text>

              <Box
                padding="300"
                background="bg-surface-secondary"
                borderRadius="200"
              >
                <BlockStack gap="200">
                  <Text as="p" variant="bodyMd">
                    While we do our best to fulfill your selections, styles are
                    not guaranteed because inventory can change before shipment.
                  </Text>
                  <Text as="p" variant="bodyMd">
                    If no selection is submitted by the deadline, we will choose
                    a dress for you based on your current size, your past picks,
                    and styles you have not already received.
                  </Text>
                </BlockStack>
              </Box>
            </BlockStack>
          </Card>

          <AppProxyForm method="post" action="/apps/preferences/">
            <input type="hidden" name="token" value={token} />

            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingLg">
                  Monthly Preferences
                </Text>

                <BlockStack gap="300">
                  {localPreferences.map((item, index) => (
                    <Box
                      key={item.month}
                      padding="300"
                      background="bg-surface-secondary"
                      borderRadius="200"
                    >
                      <BlockStack gap="300">
                        <Text as="h3" variant="headingMd">
                          {item.month}
                        </Text>

                        <input
                          type="hidden"
                          name={`preferences[${index}][month]`}
                          value={item.month}
                        />

                        <InlineStack gap="300" wrap>
                          <Box minWidth="220px">
                            <Select
                              label="Dress"
                              options={dressOptions}
                              value={item.dress}
                              onChange={(value) =>
                                handleDressChange(index, value)
                              }
                            />
                            <input
                              type="hidden"
                              name={`preferences[${index}][dress]`}
                              value={item.dress}
                            />
                          </Box>

                          <Box minWidth="180px">
                            <Select
                              label="Size"
                              options={sizeOptions}
                              value={item.size}
                              onChange={(value) =>
                                handleSizeChange(index, value)
                              }
                            />
                            <input
                              type="hidden"
                              name={`preferences[${index}][size]`}
                              value={item.size}
                            />
                          </Box>
                        </InlineStack>
                      </BlockStack>
                    </Box>
                  ))}
                </BlockStack>

                <TextField
                  label="Additional notes"
                  value={notes}
                  onChange={setNotes}
                  multiline={4}
                  autoComplete="off"
                  placeholder="Anything you'd like us to know about style preferences, fit, or special requests?"
                />
                <input type="hidden" name="notes" value={notes} />
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingLg">
                  Available Styles in Your Tier
                </Text>

                <Text as="p" variant="bodyMd" tone="subdued">
                  Browse the current catalog options included in your plan.
                </Text>

                <div
                  style={{
                    overflowX: "auto",
                    paddingBottom: "8px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: "16px",
                      minWidth: "max-content",
                    }}
                  >
                    {catalogItems.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          width: "260px",
                          flex: "0 0 auto",
                        }}
                      >
                        <Card>
                          <BlockStack gap="300">
                            <Box
                              background="bg-surface-secondary"
                              borderRadius="200"
                              padding="200"
                            >
                              <img
                                src={item.image}
                                alt={item.name}
                                style={{
                                  width: "100%",
                                  height: "220px",
                                  objectFit: "cover",
                                  borderRadius: "8px",
                                  display: "block",
                                }}
                              />
                            </Box>

                            <BlockStack gap="100">
                              <Text as="h3" variant="headingMd">
                                {item.name}
                              </Text>
                              <Text as="p" variant="bodySm" tone="subdued">
                                SKU: {item.sku}
                              </Text>
                            </BlockStack>

                            <Text as="p" variant="bodyMd">
                              {item.description}
                            </Text>
                          </BlockStack>
                        </Card>
                      </div>
                    ))}
                  </div>
                </div>
              </BlockStack>
            </Card>

            <InlineStack align="end" gap="300">
              <Button submit variant="primary">
                Submit Preferences
              </Button>
            </InlineStack>
          </AppProxyForm>
        </BlockStack>
      </Page>
    </AppProxyProvider>
  );
}