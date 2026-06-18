import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
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
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  const tiers = await db.tier.findMany({
    orderBy: {
      updatedAt: "desc",
    },
    include: {
      products: true,
    },
  });

  return json({ tiers });
};

export default function TierListPage() {
  const { tiers } = useLoaderData<typeof loader>();

  const rowMarkup = tiers.map((tier, index) => (
    <IndexTable.Row id={tier.id} key={tier.id} position={index}>
      <IndexTable.Cell>
        <Text as="span" variant="bodyMd" fontWeight="semibold">
          {tier.name}
        </Text>
      </IndexTable.Cell>

      <IndexTable.Cell>{tier.products.length}</IndexTable.Cell>

      <IndexTable.Cell>
        {new Date(tier.updatedAt).toLocaleDateString()}
      </IndexTable.Cell>

      <IndexTable.Cell>
        {tier.isActive ? (
          <Badge tone="success">Active</Badge>
        ) : (
          <Badge tone="attention">Hidden</Badge>
        )}
      </IndexTable.Cell>

      <IndexTable.Cell>
        <InlineStack gap="200">
          <Button url={`/app/tiers/${tier.id}`} variant="plain">
            View
          </Button>
          <Button url={`/app/tiers/${tier.id}`} variant="plain">
            Edit
          </Button>
          <Button variant="plain" tone="critical">
            Delete
          </Button>
        </InlineStack>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

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