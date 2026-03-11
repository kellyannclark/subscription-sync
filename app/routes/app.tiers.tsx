import type { LoaderFunctionArgs } from "@remix-run/node";
import { useState } from "react";
import {
  Page,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Button,
  IndexTable,
  Badge,
  Pagination,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

type Tier = {
  id: string;
  name: string;
  activeProducts: number;
  lastUpdated: string;
  availability: "Active" | "Draft";
};

const mockTiers: Tier[] = [
  {
    id: "twirl",
    name: "Twirl",
    activeProducts: 12,
    lastUpdated: "Oct 8, 2025",
    availability: "Active",
  },
  {
    id: "deluxe",
    name: "Deluxe",
    activeProducts: 9,
    lastUpdated: "Oct 6, 2025",
    availability: "Active",
  },
  {
    id: "adventure",
    name: "Adventure",
    activeProducts: 15,
    lastUpdated: "Sept 30, 2025",
    availability: "Draft",
  },
];

export default function TierListPage() {
  const [tiers] = useState<Tier[]>(mockTiers);

  const rowMarkup = tiers.map(
    ({ id, name, activeProducts, lastUpdated, availability }, index) => (
      <IndexTable.Row id={id} key={id} position={index}>
        <IndexTable.Cell>
          <Text as="span" variant="bodyMd" fontWeight="semibold">
            {name}
          </Text>
        </IndexTable.Cell>

        <IndexTable.Cell>{activeProducts}</IndexTable.Cell>

        <IndexTable.Cell>{lastUpdated}</IndexTable.Cell>

        <IndexTable.Cell>
          {availability === "Active" ? (
            <Badge tone="success">Active</Badge>
          ) : (
            <Badge tone="attention">Draft</Badge>
          )}
        </IndexTable.Cell>

        <IndexTable.Cell>
          <InlineStack gap="200">
            <Button url={`/app/tiers/${id}`} variant="plain">
              View
            </Button>
            <Button url={`/app/tiers/${id}`} variant="plain">
              Edit
            </Button>
            <Button variant="plain" tone="critical">
              Delete
            </Button>
          </InlineStack>
        </IndexTable.Cell>
      </IndexTable.Row>
    ),
  );

  return (
    <Page
      title="Tier List"
      primaryAction={{
        content: "Create New Tier",
        url: "/app/tiers/new",
      }}
      secondaryActions={[
        {
          content: "Sync Now",
          onAction: () => {
            console.log("Sync triggered");
          },
        },
      ]}
    >
      <TitleBar title="Tier List" />

      <BlockStack gap="500">
        <Card>
          <BlockStack gap="300">
            <Text as="p" variant="bodyMd" tone="subdued">
              View all subscription tiers and open individual pages to edit
              details or manage products and size availability.
            </Text>
          </BlockStack>
        </Card>

        <Card padding="0">
          <IndexTable
            resourceName={{ singular: "tier", plural: "tiers" }}
            itemCount={tiers.length}
            headings={[
              { title: "Tier Name" },
              { title: "Active Products" },
              { title: "Last Updated" },
              { title: "Availability" },
              { title: "Actions" },
            ]}
            selectable={false}
          >
            {rowMarkup}
          </IndexTable>
        </Card>

        <InlineStack align="center">
          <Pagination
            hasPrevious={false}
            onPrevious={() => {}}
            hasNext={false}
            onNext={() => {}}
          />
        </InlineStack>
      </BlockStack>
    </Page>
  );
}