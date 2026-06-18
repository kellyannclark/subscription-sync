import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useSubmit } from "@remix-run/react";
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

export const action = async ({ request }: ActionFunctionArgs) => {
  await authenticate.admin(request);

  const formData = await request.formData();
  const tierId = formData.get("tierId") as string;
  const isActive = formData.get("isActive") === "true";

  await db.tier.update({
    where: { id: tierId },
    data: {
      isActive,
    },
  });

  return redirect("/app/tiers");
};

export default function TierListPage() {
  const { tiers } = useLoaderData<typeof loader>();
  const submit = useSubmit();

  const handleToggleTier = (tierId: string, currentStatus: boolean) => {
    const formData = new FormData();

    formData.append("tierId", tierId);
    formData.append("isActive", String(!currentStatus));

    submit(formData, { method: "post" });
  };

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

          <Button
            variant="plain"
            tone={tier.isActive ? "critical" : undefined}
            onClick={() => handleToggleTier(tier.id, tier.isActive)}
          >
            {tier.isActive ? "Archive" : "Restore"}
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