import type { LoaderFunctionArgs } from "@remix-run/node"; //Loader to ensure only admins can access the tier list page
import { useState } from "react";//useState hook for managing local state of tiers
//UI components from Polaris for building the tier list page
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
import { TitleBar } from "@shopify/app-bridge-react";//Shopify App Bridge component for consistent title bars across the app

import { authenticate } from "../shopify.server";//import custom authentication function to ensure only admins can access this page

//Custom authentication function to ensure only admins can access this page
export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};
//Define the structure of a subscription tier for consistent data handling and rendering
//TypeScript will ensure the data matches this structure throughout the component 
type Tier = {
  id: string;
  name: string;
  activeProducts: number;
  lastUpdated: string;
  availability: "Active" | "Draft";
};
//Mock data for subscription tiers to demonstrate the tier list page functionality
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
//Main React component for the tier list page, displaying all subscription tiers in a structured format with actions for each tier
export default function TierListPage() {
  const [tiers] = useState<Tier[]>(mockTiers);

  const rowMarkup = tiers.map(
    ({ id, name, activeProducts, lastUpdated, availability }, index) => ( //destructure tier properties for easier access and map over the tiers to create a row for each tier in the IndexTable
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