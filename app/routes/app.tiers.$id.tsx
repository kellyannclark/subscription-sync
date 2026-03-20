import type { LoaderFunctionArgs } from "@remix-run/node";
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
  Banner,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

type AssignedProduct = {
  sku: string;
  product: string;
  size: string;
  availability: "Available" | "Out of Stock";
  forceInclude: boolean;
  expiresOn: string | null;
};

const mockSearchProducts = [
  "50341 Pirate Vest S",
  "50912 Belle Dress M",
  "51142 Mermaid Gown L",
  "52010 Snow White XS",
  "52155 Rapunzel Dress M",
  "53022 Tinker Bell S",
];

const initialAssignedProducts: AssignedProduct[] = [
  {
    sku: "50341",
    product: "Pirate Vest",
    size: "S",
    availability: "Available",
    forceInclude: false,
    expiresOn: null,
  },
  {
    sku: "50912",
    product: "Belle Dress",
    size: "M",
    availability: "Out of Stock",
    forceInclude: true,
    expiresOn: "Nov 15, 2025",
  },
  {
    sku: "51142",
    product: "Mermaid Gown",
    size: "L",
    availability: "Available",
    forceInclude: false,
    expiresOn: null,
  },
];

export default function EditTierPage() {
  const [tierName, setTierName] = useState("Princess");
  const [description, setDescription] = useState(
    "A magical subscription tier filled with elegant gowns, sparkling accessories, and dreamy styles designed for little royals who love fairytale adventures.",
  );
  const [status, setStatus] = useState("active");
  const [searchValue, setSearchValue] = useState("");
  const [assignedProducts, setAssignedProducts] = useState<AssignedProduct[]>(
    initialAssignedProducts,
  );

  const [neverSentBefore, setNeverSentBefore] = useState(true);
  const [sameSizeAsLastSent, setSameSizeAsLastSent] = useState(true);
  const [onlyOfferActive, setOnlyOfferActive] = useState(true);

  const [showSuccess, setShowSuccess] = useState(false);

  const statusOptions = [
    { label: "Active", value: "active" },
    { label: "Hidden", value: "hidden" },
    { label: "Archived", value: "archived" },
  ];

  const filteredSearchProducts = mockSearchProducts.filter((product) =>
    product.toLowerCase().includes(searchValue.toLowerCase()),
  );

  const handleSaveChanges = () => {
    console.log("Save changes clicked", {
      tierName,
      description,
      status,
      assignedProducts,
      rules: {
        neverSentBefore,
        sameSizeAsLastSent,
        onlyOfferActive,
      },
    });

    setShowSuccess(true);
  };

  const handleRemoveProduct = (sku: string) => {
    setAssignedProducts((prev) => prev.filter((item) => item.sku !== sku));
  };

  const handleToggleForceInclude = (sku: string) => {
    setAssignedProducts((prev) =>
      prev.map((item) =>
        item.sku === sku
          ? { ...item, forceInclude: !item.forceInclude }
          : item,
      ),
    );
  };

  const handleAddProduct = (productString: string) => {
    const parts = productString.split(" ");
    const sku = parts[0];
    const size = parts[parts.length - 1];
    const product = parts.slice(1, -1).join(" ");

    const alreadyAssigned = assignedProducts.some((item) => item.sku === sku);
    if (alreadyAssigned) return;

    const newProduct: AssignedProduct = {
      sku,
      product,
      size,
      availability: "Available",
      forceInclude: false,
      expiresOn: null,
    };

    setAssignedProducts((prev) => [...prev, newProduct]);
  };

  return (
    <Page
      title="Edit Tier"
      backAction={{ content: "Tiers", url: "/app/tiers" }}
      primaryAction={{
        content: "Save Changes",
        onAction: handleSaveChanges,
      }}
    >
      <TitleBar/>

      <BlockStack gap="500">
        {showSuccess && (
          <Banner
            title="Tier updated successfully"
            tone="success"
            onDismiss={() => setShowSuccess(false)}
          >
            <p>Your tier changes have been saved.</p>
          </Banner>
        )}

        <InlineStack align="space-between" blockAlign="start">
        <Text as="p" variant="bodyMd" tone="subdued">
            Update tier details, manage assigned SKUs, and adjust selection rules.
        </Text>

        <BlockStack gap="100" inlineAlign="end">
            <Text as="p" variant="bodyMd">
            Last updated Oct 9, 2025
            </Text>
            <Text as="p" variant="bodySm" tone="subdued">
            ID: twirl-123
            </Text>
        </BlockStack>
        </InlineStack>

        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingLg">
              Tier Details
            </Text>

            <InlineStack gap="400" align="space-between" blockAlign="center">
              <Box width="30%">
                <Text as="span" variant="bodyMd" fontWeight="medium">
                  Tier Name:
                </Text>
              </Box>
              <Box width="70%">
                <TextField
                  label="Tier Name"
                  labelHidden
                  value={tierName}
                  onChange={setTierName}
                  autoComplete="off"
                />
              </Box>
            </InlineStack>

            <InlineStack gap="400" align="space-between" blockAlign="start">
              <Box width="30%">
                <Text as="span" variant="bodyMd" fontWeight="medium">
                  Description:
                </Text>
              </Box>
              <Box width="70%">
                <TextField
                  label="Description"
                  labelHidden
                  value={description}
                  onChange={setDescription}
                  multiline={5}
                  autoComplete="off"
                />
              </Box>
            </InlineStack>

            <InlineStack gap="400" align="space-between" blockAlign="center">
              <Box width="30%">
                <Text as="span" variant="bodyMd" fontWeight="medium">
                  Status:
                </Text>
              </Box>
              <Box width="70%">
                <Select
                  label="Status"
                  labelHidden
                  options={statusOptions}
                  onChange={setStatus}
                  value={status}
                />
              </Box>
            </InlineStack>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingLg">
              Assigned Products
            </Text>

            <InlineStack gap="300" blockAlign="center">
              <Box minWidth="320px">
                <TextField
                  label="Search products"
                  labelHidden
                  value={searchValue}
                  onChange={setSearchValue}
                  autoComplete="off"
                  placeholder="Search Shopify SKUs..."
                />
              </Box>
              <Text as="p" variant="bodySm" tone="subdued">
                Search and add products from Shopify inventory
              </Text>
            </InlineStack>

            <Box
              padding="300"
              borderWidth="025"
              borderColor="border"
              borderRadius="200"
            >
              <BlockStack gap="200">
                {filteredSearchProducts.length > 0 ? (
                  filteredSearchProducts.map((product) => (
                    <InlineStack
                      key={product}
                      align="space-between"
                      blockAlign="center"
                    >
                      <Text as="span" variant="bodyMd">
                        {product}
                      </Text>
                      <Button
                        size="slim"
                        variant="plain"
                        onClick={() => handleAddProduct(product)}
                      >
                        Add
                      </Button>
                    </InlineStack>
                  ))
                ) : (
                  <Text as="p" variant="bodyMd" tone="subdued">
                    No products found.
                  </Text>
                )}
              </BlockStack>
            </Box>

            <Divider />
{assignedProducts.length === 0 ? (
  <Box
    padding="400"
    background="bg-surface-secondary"
    borderRadius="200"
  >
    <Text as="p" variant="bodyMd" tone="subdued">
      No products assigned to this tier yet.
    </Text>
  </Box>
) : (
<div style={{ maxWidth: "900px", margin: "0 auto" }}>
  <BlockStack gap="300">
    {assignedProducts.map((item) => (
      <Box
        key={item.sku}
        padding="300"
        background="bg-surface-secondary"
        borderRadius="200"
      >
        <BlockStack gap="300">
          <InlineStack align="space-between" blockAlign="center">
            <BlockStack gap="100">
              <Text as="p" variant="bodySm" tone="subdued">
                SKU
              </Text>
              <Text as="p" variant="bodyMd">
                {item.sku}
              </Text>
            </BlockStack>

            <Button
              size="slim"
              tone="critical"
              variant="plain"
              onClick={() => handleRemoveProduct(item.sku)}
            >
              Remove
            </Button>
          </InlineStack>

          <BlockStack gap="100">
            <Text as="p" variant="bodySm" tone="subdued">
              Product
            </Text>
            <Text as="p" variant="bodyMd">
              {item.product}
            </Text>
          </BlockStack>

          <InlineStack align="space-between" blockAlign="center">
            <BlockStack gap="100">
              <Text as="p" variant="bodySm" tone="subdued">
                Size
              </Text>
              <Text as="p" variant="bodyMd">
                {item.size}
              </Text>
            </BlockStack>

            <BlockStack gap="100" inlineAlign="end">
              <Text as="p" variant="bodySm" tone="subdued">
                Availability
              </Text>
              <Text
                as="p"
                variant="bodyMd"
                tone={
                  item.availability === "Available" ? "success" : "critical"
                }
              >
                {item.availability}
              </Text>
            </BlockStack>
          </InlineStack>

          <InlineStack align="space-between" blockAlign="center">
            <BlockStack gap="100">
              <Text as="p" variant="bodySm" tone="subdued">
                Expires On
              </Text>
              <Text as="p" variant="bodyMd">
                {item.expiresOn ?? "—"}
              </Text>
            </BlockStack>

            <BlockStack gap="100" inlineAlign="end">
              <Text as="p" variant="bodySm" tone="subdued">
                Force Include
              </Text>
              <Button
                size="slim"
                variant={item.forceInclude ? "primary" : "secondary"}
                onClick={() => handleToggleForceInclude(item.sku)}
              >
                {item.forceInclude ? "On" : "Off"}
              </Button>
            </BlockStack>
          </InlineStack>
        </BlockStack>
      </Box>
    ))}
  </BlockStack>
</div>
)}
      </BlockStack>
    </Card>

    <Card>
      <BlockStack gap="300">
        <Text as="h2" variant="headingLg">
          Tier Rules
        </Text>

        <InlineStack align="space-between" blockAlign="center">
          <Text as="span" variant="bodyMd">
            Item never sent before
          </Text>
          <Button
            size="slim"
            variant={neverSentBefore ? "primary" : "secondary"}
            onClick={() => setNeverSentBefore((prev) => !prev)}
          >
            {neverSentBefore ? "On" : "Off"}
          </Button>
        </InlineStack>

        <InlineStack align="space-between" blockAlign="center">
          <Text as="span" variant="bodyMd">
            Same size as last size sent
          </Text>
          <Button
            size="slim"
            variant={sameSizeAsLastSent ? "primary" : "secondary"}
            onClick={() => setSameSizeAsLastSent((prev) => !prev)}
          >
            {sameSizeAsLastSent ? "On" : "Off"}
          </Button>
        </InlineStack>

        <InlineStack align="space-between" blockAlign="center">
          <Text as="span" variant="bodyMd">
            Only offer products marked Active
          </Text>
          <Button
            size="slim"
            variant={onlyOfferActive ? "primary" : "secondary"}
            onClick={() => setOnlyOfferActive((prev) => !prev)}
          >
            {onlyOfferActive ? "On" : "Off"}
          </Button>
        </InlineStack>
      </BlockStack>
    </Card>

    <Card>
      <BlockStack gap="300">
        <Text as="h2" variant="headingLg">
          Tier Summary
        </Text>

        <InlineStack gap="300" wrap>
          <Box
            padding="300"
            background="bg-surface-secondary"
            borderRadius="200"
          >
            <Text as="span" variant="headingMd">
              Products: {assignedProducts.length}
            </Text>
          </Box>

          <Box
            padding="300"
            background="bg-surface-secondary"
            borderRadius="200"
          >
            <Text as="span" variant="headingMd">
              Status:{" "}
              {statusOptions.find((option) => option.value === status)?.label}
            </Text>
          </Box>
        </InlineStack>

        <Divider />

        <Text as="p" variant="bodyMd">
          Rules:{" "}
          {[
            neverSentBefore ? "Never sent before" : null,
            sameSizeAsLastSent ? "Same size as last sent" : null,
            onlyOfferActive ? "Only offer Active products" : null,
          ]
            .filter(Boolean)
            .join(", ")}
        </Text>

        <InlineStack align="end" gap="300">
          <Button url="/app/tiers" variant="plain">
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveChanges}>
            Save Changes
          </Button>
        </InlineStack>
      </BlockStack>
    </Card>
  </BlockStack>
</Page>
);
}