import type {
  LoaderFunctionArgs,
  ActionFunctionArgs,
} from "@remix-run/node";

import { json, redirect } from "@remix-run/node";
import {
  useLoaderData,
  useSubmit,
} from "@remix-run/react";

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

export const loader = async ({
  request,
}: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  const profiles =
    await db.fulfillmentProfile.findMany({
      orderBy: {
        updatedAt: "desc",
      },
      include: {
        products: true,
        subscribers: true,
      },
    });

  return json({ profiles });
};

export const action = async ({
  request,
}: ActionFunctionArgs) => {
  await authenticate.admin(request);

  const formData = await request.formData();

  const profileId =
    formData.get("profileId");

  if (typeof profileId !== "string") {
    throw new Response(
      "Missing fulfillment profile ID",
      {
        status: 400,
      },
    );
  }

  const isActive =
    formData.get("isActive") === "true";

  await db.fulfillmentProfile.update({
    where: {
      id: profileId,
    },
    data: {
      isActive,
    },
  });

  return redirect("/app/tiers");
};

export default function FulfillmentProfileListPage() {
  const { profiles } =
    useLoaderData<typeof loader>();

  const submit = useSubmit();

  const handleToggleProfile = (
    profileId: string,
    currentStatus: boolean,
  ) => {
    const formData = new FormData();

    formData.append(
      "profileId",
      profileId,
    );

    formData.append(
      "isActive",
      String(!currentStatus),
    );

    submit(formData, {
      method: "post",
    });
  };

  const rowMarkup = profiles.map(
    (profile, index) => (
      <IndexTable.Row
        id={profile.id}
        key={profile.id}
        position={index}
      >
        <IndexTable.Cell>
          <BlockStack gap="050">
            <Text
              as="span"
              fontWeight="semibold"
            >
              {profile.name}
            </Text>
          </BlockStack>
        </IndexTable.Cell>

        <IndexTable.Cell>
          {profile.appstlePlanName ? (
            <Badge tone="info">
              {profile.appstlePlanName}
            </Badge>
          ) : (
            <Text
              as="span"
              variant="bodySm"
              tone="subdued"
            >
              Not linked
            </Text>
          )}
        </IndexTable.Cell>

        <IndexTable.Cell>
          {profile.subscribers.length}
        </IndexTable.Cell>

        <IndexTable.Cell>
          {profile.products.length}
        </IndexTable.Cell>

        <IndexTable.Cell>
          {new Date(
            profile.updatedAt,
          ).toLocaleDateString()}
        </IndexTable.Cell>

        <IndexTable.Cell>
          {profile.isActive ? (
            <Badge tone="success">
              Active
            </Badge>
          ) : (
            <Badge tone="attention">
              Hidden
            </Badge>
          )}
        </IndexTable.Cell>

        <IndexTable.Cell>
          <InlineStack gap="200">
            <Button
              url={`/app/tiers/${profile.id}`}
              variant="plain"
            >
              View
            </Button>

            <Button
              url={`/app/tiers/${profile.id}`}
              variant="plain"
            >
              Edit
            </Button>

            <Button
              variant="plain"
              tone={
                profile.isActive
                  ? "critical"
                  : undefined
              }
              onClick={() =>
                handleToggleProfile(
                  profile.id,
                  profile.isActive,
                )
              }
            >
              {profile.isActive
                ? "Archive"
                : "Restore"}
            </Button>
          </InlineStack>
        </IndexTable.Cell>
      </IndexTable.Row>
    ),
  );

  return (
    <div className="ss-dashboard">
      <Page
        title="Fulfillment Profiles"
        subtitle="Configure the operational rules behind each Little Adventures subscription tier."
        backAction={{
          content: "Dashboard",
          url: "/app",
        }}
        primaryAction={{
          content: "Create New Profile",
          url: "/app/tiers/new",
        }}
      >
        <TitleBar title="Fulfillment Profiles" />

        <BlockStack gap="500">
          <div className="ss-hero">
            <BlockStack gap="200">
              <Text
                as="h2"
                variant="headingLg"
              >
                Subscription Fulfillment Setup
              </Text>

              <Text
                as="p"
                variant="bodyMd"
                tone="subdued"
              >
                Each fulfillment profile connects an
                Appstle subscription plan to the
                SubscriptionSync rules used for monthly
                selections, products, sizes, inventory,
                reminders, and fulfillment.
              </Text>
            </BlockStack>
          </div>

          <BlockStack gap="300">
            <BlockStack gap="100">
              <div className="ss-section-accent" />

              <Text
                as="h2"
                variant="headingLg"
              >
                Fulfillment Profiles
              </Text>

              <Text
                as="p"
                variant="bodyMd"
                tone="subdued"
              >
                Little Adventures can continue to think of
                these as subscription tiers.
                SubscriptionSync uses each profile to
                define how that tier is handled from
                customer selection through fulfillment.
              </Text>
            </BlockStack>

            <Card padding="0">
              <IndexTable
                resourceName={{
                  singular:
                    "fulfillment profile",
                  plural:
                    "fulfillment profiles",
                }}
                itemCount={profiles.length}
                headings={[
                  {
                    title: "Profile",
                  },
                  {
                    title:
                      "Linked Appstle Plan",
                  },
                  {
                    title: "Subscribers",
                  },
                  {
                    title:
                      "Eligible Products",
                  },
                  {
                    title: "Last Updated",
                  },
                  {
                    title: "Status",
                  },
                  {
                    title: "Actions",
                  },
                ]}
                selectable={false}
              >
                {rowMarkup}
              </IndexTable>

              {profiles.length === 0 && (
                <div
                  style={{
                    padding: "32px",
                    textAlign: "center",
                  }}
                >
                  <BlockStack gap="200">
                    <Text
                      as="p"
                      variant="headingMd"
                    >
                      No fulfillment profiles yet
                    </Text>

                    <Text
                      as="p"
                      variant="bodyMd"
                      tone="subdued"
                    >
                      Create a fulfillment profile to
                      link an Appstle subscription plan
                      with its monthly selection and
                      fulfillment rules.
                    </Text>
                  </BlockStack>
                </div>
              )}
            </Card>
          </BlockStack>

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
    </div>
  );
}