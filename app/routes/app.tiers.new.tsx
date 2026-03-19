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
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
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

export default function CreateTierPage() {
  const [tierName, setTierName] = useState("Pirate Tier");
  const [description, setDescription] = useState(
    "A bold and adventurous subscription tier featuring swashbuckling costumes, rugged styles, and treasures fit for little explorers who love high-seas adventures.",
  );
  const [status, setStatus] = useState("active");
  const [searchValue, setSearchValue] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<string[]>(mockProducts);

  const [neverSentBefore, setNeverSentBefore] = useState(true);
  const [sameSizeAsLastSent, setSameSizeAsLastSent] = useState(true);
  const [onlyOfferActive, setOnlyOfferActive] = useState(true);

  const filteredProducts = mockProducts.filter((product) =>
    product.toLowerCase().includes(searchValue.toLowerCase()),
  );

  const statusOptions = [
    { label: "Active", value: "active" },
    { label: "Hidden", value: "hidden" },
    { label: "Archived", value: "archived" },
  ];

  const handleCreateTier = () => {
    console.log("Create tier clicked", {
      tierName,
      description,
      status,
      selectedProducts,
      rules: {
        neverSentBefore,
        sameSizeAsLastSent,
        onlyOfferActive,
      },
    });
  };

  const handleAddProduct = (product: string) => {
    if (!selectedProducts.includes(product)) {
      setSelectedProducts((prev) => [...prev, product]);
    }
  };

  return (
    <Page
      title="Create New Tier"
      primaryAction={{
        content: "Create Tier",
        onAction: handleCreateTier,
      }}
    >
      <TitleBar title="Create New Tier" />

      <BlockStack gap="500">
        <Text as="p" variant="bodyMd" tone="subdued">
          Create a new subscription tier and assign eligible products.
        </Text>

        <InlineStack align="space-between" blockAlign="center">
          <Text as="h2" variant="headingLg">
            Tier Details
          </Text>
        </InlineStack>

        <InlineStack gap="500" align="start">
          <Box width="50%">
            <Card>
              <BlockStack gap="400">
                <InlineStack gap="400" align="space-between">
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
                      multiline={6}
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

                <Text as="p" variant="bodySm" tone="subdued">
                  (Active | Hidden | Archived)
                </Text>
              </BlockStack>
            </Card>
          </Box>

          <Box width="50%">
            <Card>
              <BlockStack gap="400">
                <Text as="h3" variant="headingMd">
                  Assign Products
                </Text>

                <TextField
                  label="Search products"
                  labelHidden
                  value={searchValue}
                  onChange={setSearchValue}
                  autoComplete="off"
                  placeholder="Start typing..."
                />

                <Text as="h4" variant="bodyMd" fontWeight="medium">
                  Product List:
                </Text>

                <Box
                  padding="300"
                  borderWidth="025"
                  borderColor="border"
                  borderRadius="200"
                  minHeight="220px"
                >
                  <BlockStack gap="200">
                    {filteredProducts.length > 0 ? (
                      filteredProducts.map((product) => (
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

                <Text as="p" variant="bodySm" tone="subdued">
                  Searchable list from Shopify SKUs
                </Text>
              </BlockStack>
            </Card>
          </Box>
        </InlineStack>

        <InlineStack gap="500" align="start">
          <Box width="50%">
            <BlockStack gap="300">
              <Text as="h2" variant="headingLg">
                Tier Rules
              </Text>

              <Card>
                <BlockStack gap="300">
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
            </BlockStack>
          </Box>

          <Box width="50%">
            <BlockStack gap="300">
              <Text as="h2" variant="headingLg">
                Tier Summary
              </Text>

              <Card>
                <BlockStack gap="300">
                  <InlineStack gap="300">
                    <Box
                      padding="300"
                      background="bg-surface-secondary"
                      borderRadius="200"
                    >
                      <Text as="span" variant="headingMd">
                        Products: {selectedProducts.length}
                      </Text>
                    </Box>

                    <Box
                      padding="300"
                      background="bg-surface-secondary"
                      borderRadius="200"
                    >
                      <Text as="span" variant="headingMd">
                        Status: {statusOptions.find((option) => option.value === status)?.label}
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

                  <InlineStack align="end">
                    <Button url="/app/tiers" variant="plain">
                      Back
                    </Button>
                  </InlineStack>
                </BlockStack>
              </Card>
            </BlockStack>
          </Box>
        </InlineStack>
      </BlockStack>
    </Page>
  );
}