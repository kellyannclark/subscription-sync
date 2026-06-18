import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useSubmit } from "@remix-run/react";
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

const mockSearchProducts = [
  "50341 Pirate Vest S",
  "50912 Belle Dress M",
  "51142 Mermaid Gown L",
  "52010 Snow White XS",
  "52155 Rapunzel Dress M",
  "53022 Tinker Bell S",
];

type AssignedProduct = {
  sku: string;
  productName: string;
  forceInclude: boolean;
};

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  const tier = await db.tier.findUnique({
    where: { id: params.id },
    include: { products: true },
  });

  if (!tier) {
    throw new Response("Tier not found", { status: 404 });
  }

  return json({ tier });
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  await authenticate.admin(request);

  const formData = await request.formData();

  const tierName = formData.get("tierName") as string;
  const description = formData.get("description") as string;
  const status = formData.get("status") as string;
  const assignedProducts = JSON.parse(
    formData.get("assignedProducts") as string,
  ) as AssignedProduct[];

  await db.tier.update({
    where: { id: params.id },
    data: {
      name: tierName,
      description,
      isActive: status === "active",
      products: {
        deleteMany: {},
        create: assignedProducts.map((product) => ({
          sku: product.sku,
          productName: product.productName,
          forceInclude: product.forceInclude,
        })),
      },
    },
  });

  return redirect("/app/tiers");
};

export default function EditTierPage() {
  const { tier } = useLoaderData<typeof loader>();
  const submit = useSubmit();

  const [tierName, setTierName] = useState(tier.name);
  const [description, setDescription] = useState(tier.description ?? "");
  const [status, setStatus] = useState(tier.isActive ? "active" : "hidden");
  const [searchValue, setSearchValue] = useState("");

  const [assignedProducts, setAssignedProducts] = useState<AssignedProduct[]>(
    tier.products.map((product) => ({
      sku: product.sku,
      productName: product.productName,
      forceInclude: product.forceInclude,
    })),
  );

  const [neverSentBefore, setNeverSentBefore] = useState(true);
  const [sameSizeAsLastSent, setSameSizeAsLastSent] = useState(true);
  const [onlyOfferActive, setOnlyOfferActive] = useState(true);

  const statusOptions = [
    { label: "Active", value: "active" },
    { label: "Hidden", value: "hidden" },
    { label: "Archived", value: "archived" },
  ];

  const filteredSearchProducts = mockSearchProducts.filter((product) =>
    product.toLowerCase().includes(searchValue.toLowerCase()),
  );

  const handleSaveChanges = () => {
    const formData = new FormData();

    formData.append("tierName", tierName);
    formData.append("description", description);
    formData.append("status", status);
    formData.append("assignedProducts", JSON.stringify(assignedProducts));

    submit(formData, { method: "post" });
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
    const productName = productString;

    const alreadyAssigned = assignedProducts.some((item) => item.sku === sku);
    if (alreadyAssigned) return;

    setAssignedProducts((prev) => [
      ...prev,
      {
        sku,
        productName,
        forceInclude: false,
      },
    ]);
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
      <TitleBar title="Edit Tier" />

      <BlockStack gap="500">
        <InlineStack align="space-between" blockAlign="start">
          <Text as="p" variant="bodyMd" tone="subdued">
            Update tier details, manage assigned SKUs, and adjust selection
            rules.
          </Text>

          <BlockStack gap="100" inlineAlign="end">
            <Text as="p" variant="bodyMd">
              Last updated {new Date(tier.updatedAt).toLocaleDateString()}
            </Text>
            <Text as="p" variant="bodySm" tone="subdued">
              ID: {tier.id}
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

            <TextField
              label="Search products"
              labelHidden
              value={searchValue}
              onChange={setSearchValue}
              autoComplete="off"
              placeholder="Search Shopify SKUs..."
            />

            <Box
              padding="300"
              borderWidth="025"
              borderColor="border"
              borderRadius="200"
            >
              <BlockStack gap="200">
                {filteredSearchProducts.map((product) => (
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
                ))}
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
              <BlockStack gap="300">
                {assignedProducts.map((item) => (
                  <Box
                    key={item.sku}
                    padding="300"
                    background="bg-surface-secondary"
                    borderRadius="200"
                  >
                    <InlineStack align="space-between" blockAlign="center">
                      <BlockStack gap="100">
                        <Text as="p" variant="bodySm" tone="subdued">
                          SKU
                        </Text>
                        <Text as="p" variant="bodyMd">
                          {item.sku}
                        </Text>

                        <Text as="p" variant="bodySm" tone="subdued">
                          Product
                        </Text>
                        <Text as="p" variant="bodyMd">
                          {item.productName}
                        </Text>
                      </BlockStack>

                      <InlineStack gap="200">
                        <Button
                          size="slim"
                          variant={item.forceInclude ? "primary" : "secondary"}
                          onClick={() => handleToggleForceInclude(item.sku)}
                        >
                          {item.forceInclude ? "Force On" : "Force Off"}
                        </Button>

                        <Button
                          size="slim"
                          tone="critical"
                          variant="plain"
                          onClick={() => handleRemoveProduct(item.sku)}
                        >
                          Remove
                        </Button>
                      </InlineStack>
                    </InlineStack>
                  </Box>
                ))}
              </BlockStack>
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
                  {
                    statusOptions.find((option) => option.value === status)
                      ?.label
                  }
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