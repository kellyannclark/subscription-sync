import type { LoaderFunctionArgs } from "@remix-run/node";
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
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

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

const monthRows: MonthlyPreference[] = [
  { month: "October 2025", dress: "", size: "" },
  { month: "November 2025", dress: "", size: "" },
  { month: "December 2025", dress: "", size: "" },
  { month: "January 2026", dress: "", size: "" },
  { month: "February 2026", dress: "", size: "" },
  { month: "March 2026", dress: "", size: "" },
];

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

export default function SubscriberFormPage() {
  const [preferences, setPreferences] =
    useState<MonthlyPreference[]>(monthRows);
  const [notes, setNotes] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const handleDressChange = (index: number, value: string) => {
    setPreferences((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, dress: value } : item,
      ),
    );
  };

  const handleSizeChange = (index: number, value: string) => {
    setPreferences((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, size: value } : item,
      ),
    );
  };

  const handleSubmitPreferences = () => {
    console.log("Submitted preferences", {
      preferences,
      notes,
    });

    setShowSuccess(true);
  };

  return (
    <Page
      title="Subscriber Form"
      backAction={{ content: "Back", url: "/app" }}
      primaryAction={{
        content: "Submit Preferences",
        onAction: handleSubmitPreferences,
      }}
    >
      <TitleBar />

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
              You’re on the Twirl plan.
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
              Use this form to submit your monthly style preferences. Select the
              dress and size you want for each month, then review the catalog
              below for the styles available in your current subscription tier.
            </Text>

            <Box
              padding="300"
              background="bg-surface-secondary"
              borderRadius="200"
            >
              <Text as="p" variant="bodyMd">
                Please submit your monthly choice by the 20th. If we do not hear
                from you, we will send a dress based on your previous picks and
                available tier options.
              </Text>
            </Box>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingLg">
              Monthly Preferences
            </Text>

            <BlockStack gap="300">
              {preferences.map((item, index) => (
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
          <Button url="/app" variant="plain">
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmitPreferences}>
            Submit Preferences
          </Button>
        </InlineStack>
      </BlockStack>
    </Page>
  );
}