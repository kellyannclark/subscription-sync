import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
} from "@remix-run/node";

import {
  json,
  redirect,
} from "@remix-run/node";

import {
  useLoaderData,
  useSubmit,
} from "@remix-run/react";

import {
  Badge,
  BlockStack,
  Button,
  Card,
  InlineStack,
  Page,
  Text,
} from "@shopify/polaris";

import { authenticate } from "../shopify.server";
import db from "../db.server";

/* ============================================================
   SUBSCRIPTIONSYNC BRAND COLORS
   ============================================================ */

const COLORS = {
  navy: "#17233E",
  blue: "#294A78",
  tealBlue: "#2F7C89",

  pageBackground: "#F5F7FB",

  white: "#FFFFFF",

  softBlue: "#F4F8FC",
  softBlueStrong: "#EAF1F8",

  border: "#D9E2EC",
  borderBlue: "#C6D5E5",

  text: "#1F2937",
  muted: "#667085",

  numberBlue: "#244B78",
  accentBlue: "#356A9A",
};

/* ============================================================
   LOADER
   ============================================================ */

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
        subscribers: true,

        products: {
          include: {
            variants: {
              where: {
                isActive: true,
              },
            },
          },
        },
      },
    });

  return json({
    profiles,
  });
};

/* ============================================================
   ACTION
   ============================================================ */

export const action = async ({
  request,
}: ActionFunctionArgs) => {
  await authenticate.admin(request);

  const formData =
    await request.formData();

  const profileId =
    formData.get("profileId");

  if (
    typeof profileId !==
    "string"
  ) {
    throw new Response(
      "Missing fulfillment profile ID",
      {
        status: 400,
      },
    );
  }

  const isActive =
    formData.get("isActive") ===
    "true";

  await db.fulfillmentProfile.update({
    where: {
      id: profileId,
    },

    data: {
      isActive,
    },
  });

  return redirect(
    "/app/tiers",
  );
};

/* ============================================================
   PAGE
   ============================================================ */

export default function FulfillmentProfileListPage() {
  const {
    profiles,
  } =
    useLoaderData<typeof loader>();

  const submit =
    useSubmit();

  const handleToggleProfile = (
    profileId: string,
    currentStatus: boolean,
  ) => {
    const formData =
      new FormData();

    formData.append(
      "profileId",
      profileId,
    );

    formData.append(
      "isActive",
      String(
        !currentStatus,
      ),
    );

    submit(
      formData,
      {
        method: "post",
      },
    );
  };

  /* ==========================================================
     SUMMARY STATS
     ========================================================== */

  const activeProfiles =
    profiles.filter(
      (profile) =>
        profile.isActive,
    ).length;

  const totalSubscribers =
    profiles.reduce(
      (
        total,
        profile,
      ) =>
        total +
        profile.subscribers.length,

      0,
    );

  const totalProducts =
    profiles.reduce(
      (
        total,
        profile,
      ) =>
        total +
        profile.products.length,

      0,
    );

  const totalVariants =
    profiles.reduce(
      (
        total,
        profile,
      ) =>
        total +
        profile.products.reduce(
          (
            productTotal,
            product,
          ) =>
            productTotal +
            product.variants.length,

          0,
        ),

      0,
    );

  return (
    <div
      style={{
        background:
          COLORS.pageBackground,

        minHeight:
          "100vh",
      }}
    >
      <Page
        title="Fulfillment Profiles"
        subtitle="Configure the operational rules behind each Little Adventures subscription program."
        backAction={{
          content:
            "Dashboard",

          url:
            "/app",
        }}
        primaryAction={{
          content:
            "Create New Profile",

          url:
            "/app/tiers/new",
        }}
      >
        <BlockStack gap="500">

          {/* ==================================================
              HERO
              ================================================== */}

          <div
            style={{
              background:
                `linear-gradient(
                  135deg,
                  ${COLORS.navy} 0%,
                  ${COLORS.blue} 62%,
                  ${COLORS.tealBlue} 100%
                )`,

              borderRadius:
                "18px",

              padding:
                "30px",

              boxShadow:
                "0 8px 26px rgba(23, 35, 62, 0.14)",

              color:
                COLORS.white,
            }}
          >
            <InlineStack
              align="space-between"
              blockAlign="center"
              gap="400"
              wrap
            >
              <div>
                <div
                  style={{
                    fontSize:
                      "12px",

                    fontWeight:
                      700,

                    letterSpacing:
                      "0.08em",

                    textTransform:
                      "uppercase",

                    color:
                      "#BFE8ED",

                    marginBottom:
                      "8px",
                  }}
                >
                  SubscriptionSync
                </div>

                <div
                  style={{
                    fontSize:
                      "28px",

                    fontWeight:
                      700,

                    lineHeight:
                      1.2,

                    marginBottom:
                      "8px",
                  }}
                >
                  Fulfillment Profiles
                </div>

                <div
                  style={{
                    fontSize:
                      "14px",

                    lineHeight:
                      1.55,

                    color:
                      "#E8EEF7",

                    maxWidth:
                      "720px",
                  }}
                >
                  Connect Appstle
                  subscription plans to
                  products, sizes,
                  reminders, inventory
                  rules, and fulfillment
                  workflows.
                </div>
              </div>

              <div
                style={{
                  background:
                    "rgba(255,255,255,0.12)",

                  border:
                    "1px solid rgba(255,255,255,0.20)",

                  borderRadius:
                    "999px",

                  padding:
                    "9px 15px",
                }}
              >
                <span
                  style={{
                    color:
                      COLORS.white,

                    fontSize:
                      "13px",

                    fontWeight:
                      700,
                  }}
                >
                  ● Development Sandbox
                </span>
              </div>
            </InlineStack>
          </div>

          {/* ==================================================
              SNAPSHOT
              ================================================== */}

          <BlockStack gap="300">
            <BlockStack gap="100">
              <SectionHeading>
                Profile Snapshot
              </SectionHeading>

              <Text
                as="p"
                variant="bodyMd"
                tone="subdued"
              >
                A quick look at the
                fulfillment setup
                currently configured in
                SubscriptionSync.
              </Text>
            </BlockStack>

            <div
              style={{
                display:
                  "grid",

                gridTemplateColumns:
                  "repeat(auto-fit, minmax(180px, 1fr))",

                gap:
                  "16px",
              }}
            >
              <MetricCard
                label="Active Profiles"
                value={
                  activeProfiles
                }
              />

              <MetricCard
                label="Subscribers"
                value={
                  totalSubscribers
                }
              />

              <MetricCard
                label="Eligible Products"
                value={
                  totalProducts
                }
              />

              <MetricCard
                label="Eligible SKUs"
                value={
                  totalVariants
                }
              />
            </div>
          </BlockStack>

          {/* ==================================================
              PROFILE SECTION
              ================================================== */}

          <BlockStack gap="300">
            <BlockStack gap="100">
              <SectionHeading>
                Subscription Programs
              </SectionHeading>

              <Text
                as="p"
                variant="bodyMd"
                tone="subdued"
              >
                Each profile defines
                how a subscription plan
                moves from customer
                selection through
                fulfillment.
              </Text>
            </BlockStack>

            {profiles.length === 0 ? (
              <Card>
                <div
                  style={{
                    padding:
                      "28px 8px",

                    textAlign:
                      "center",
                  }}
                >
                  <BlockStack gap="200">
                    <Text
                      as="p"
                      variant="headingMd"
                    >
                      No fulfillment
                      profiles yet
                    </Text>

                    <Text
                      as="p"
                      variant="bodyMd"
                      tone="subdued"
                    >
                      Create a profile
                      to connect an
                      Appstle plan with
                      its products,
                      sizes, selection
                      rules, and
                      fulfillment
                      workflow.
                    </Text>

                    <InlineStack
                      align="center"
                    >
                      <Button
                        variant="primary"
                        url="/app/tiers/new"
                      >
                        Create First
                        Profile
                      </Button>
                    </InlineStack>
                  </BlockStack>
                </div>
              </Card>
            ) : (
              <div
                style={{
                  display:
                    "grid",

                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(320px, 1fr))",

                  gap:
                    "18px",
                }}
              >
                {profiles.map(
                  (profile) => {
                    const variantCount =
                      profile.products.reduce(
                        (
                          total,
                          product,
                        ) =>
                          total +
                          product.variants.length,

                        0,
                      );

                    return (
                      <ProfileCard
                        key={
                          profile.id
                        }
                        profile={
                          profile
                        }
                        variantCount={
                          variantCount
                        }
                        onToggle={() =>
                          handleToggleProfile(
                            profile.id,
                            profile.isActive,
                          )
                        }
                      />
                    );
                  },
                )}
              </div>
            )}
          </BlockStack>

        </BlockStack>
      </Page>
    </div>
  );
}

/* ============================================================
   PROFILE CARD
   ============================================================ */

function ProfileCard({
  profile,
  variantCount,
  onToggle,
}: {
  profile: {
    id: string;
    name: string;
    description:
      | string
      | null;

    appstlePlanName:
      | string
      | null;

    isActive: boolean;

    updatedAt:
      string
      | Date;

    subscribers: {
      id: string;
    }[];

    products: {
      id: string;

      variants: {
        id: string;
      }[];
    }[];
  };

  variantCount: number;

  onToggle: () => void;
}) {
  return (
    <div
      style={{
        background:
          COLORS.white,

        border:
          `1px solid ${COLORS.border}`,

        borderRadius:
          "16px",

        overflow:
          "hidden",

        boxShadow:
          "0 3px 12px rgba(23,35,62,0.05)",
      }}
    >
      {/* PROFILE TOP */}

      <div
        style={{
          background:
            COLORS.softBlue,

          borderBottom:
            `1px solid ${COLORS.borderBlue}`,

          padding:
            "20px",
        }}
      >
        <BlockStack gap="200">

          <InlineStack
            align="space-between"
            blockAlign="start"
            gap="300"
            wrap
          >
            <div>
              <Text
                as="h2"
                variant="headingLg"
              >
                {
                  profile.name
                }
              </Text>

              {profile.description && (
                <div
                  style={{
                    marginTop:
                      "4px",
                  }}
                >
                  <Text
                    as="p"
                    variant="bodySm"
                    tone="subdued"
                  >
                    {
                      profile.description
                    }
                  </Text>
                </div>
              )}
            </div>

            {profile.isActive ? (
              <Badge tone="success">
                Active
              </Badge>
            ) : (
              <Badge tone="attention">
                Archived
              </Badge>
            )}
          </InlineStack>

          <div>
            <Text
              as="p"
              variant="bodySm"
              tone="subdued"
            >
              Connected Subscription
              Plan
            </Text>

            <div
              style={{
                marginTop:
                  "4px",
              }}
            >
              <Text
                as="p"
                variant="bodyMd"
                fontWeight="semibold"
              >
                {profile.appstlePlanName ??
                  "Not connected"}
              </Text>
            </div>
          </div>

        </BlockStack>
      </div>

      {/* PROFILE BODY */}

      <div
        style={{
          padding:
            "20px",
        }}
      >
        <BlockStack gap="400">

          {/* STATS */}

          <div
            style={{
              display:
                "grid",

              gridTemplateColumns:
                "repeat(3, 1fr)",

              gap:
                "10px",
            }}
          >
            <MiniMetric
              label="Subscribers"
              value={
                profile
                  .subscribers
                  .length
              }
            />

            <MiniMetric
              label="Products"
              value={
                profile
                  .products
                  .length
              }
            />

            <MiniMetric
              label="SKUs"
              value={
                variantCount
              }
            />
          </div>

          {/* UPDATED */}

          <InlineStack
            align="space-between"
            gap="200"
          >
            <Text
              as="span"
              variant="bodySm"
              tone="subdued"
            >
              Last updated
            </Text>

            <Text
              as="span"
              variant="bodySm"
              fontWeight="medium"
            >
              {formatDate(
                profile.updatedAt,
              )}
            </Text>
          </InlineStack>

          {/* MAIN ACTIONS */}

          <BlockStack gap="200">

            <Button
              variant="primary"
              fullWidth
              url={`/app/tiers/${profile.id}`}
            >
              Open Profile
            </Button>

            <Button
              fullWidth
              url={`/app/tiers/${profile.id}/products`}
            >
              Manage Products & Sizes
            </Button>

            <Button
              fullWidth
              url="/app/preferences-form"
            >
              Preview Customer Form
            </Button>

          </BlockStack>

          {/* SECONDARY ACTION */}

          <InlineStack
            align="end"
          >
            <Button
              variant="plain"
              tone={
                profile.isActive
                  ? "critical"
                  : undefined
              }
              onClick={
                onToggle
              }
            >
              {profile.isActive
                ? "Archive Profile"
                : "Restore Profile"}
            </Button>
          </InlineStack>

        </BlockStack>
      </div>
    </div>
  );
}

/* ============================================================
   SECTION HEADING
   ============================================================ */

function SectionHeading({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <InlineStack
      gap="200"
      blockAlign="center"
    >
      <div
        style={{
          width:
            "4px",

          height:
            "22px",

          borderRadius:
            "999px",

          background:
            COLORS.tealBlue,

          flexShrink:
            0,
        }}
      />

      <Text
        as="h2"
        variant="headingLg"
      >
        {children}
      </Text>
    </InlineStack>
  );
}

/* ============================================================
   MAIN METRIC
   ============================================================ */

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div
      style={{
        background:
          COLORS.softBlue,

        border:
          `1px solid ${COLORS.borderBlue}`,

        borderRadius:
          "14px",

        padding:
          "18px",

        minHeight:
          "100px",

        boxShadow:
          "0 2px 8px rgba(41,74,120,0.04)",
      }}
    >
      <BlockStack gap="150">
        <Text
          as="p"
          variant="bodySm"
          tone="subdued"
        >
          {label}
        </Text>

        <div
          style={{
            fontSize:
              "28px",

            lineHeight:
              1,

            fontWeight:
              750,

            color:
              COLORS.numberBlue,
          }}
        >
          {value}
        </div>
      </BlockStack>
    </div>
  );
}

/* ============================================================
   MINI METRIC
   ============================================================ */

function MiniMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div
      style={{
        background:
          COLORS.softBlue,

        border:
          `1px solid ${COLORS.borderBlue}`,

        borderRadius:
          "10px",

        padding:
          "12px",
      }}
    >
      <div
        style={{
          fontSize:
            "11px",

          color:
            COLORS.muted,

          marginBottom:
            "4px",

          fontWeight:
            600,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize:
            "20px",

          fontWeight:
            750,

          color:
            COLORS.numberBlue,
        }}
      >
        {value}
      </div>
    </div>
  );
}

/* ============================================================
   DATE
   ============================================================ */

function formatDate(
  date:
    | string
    | Date,
) {
  return new Intl.DateTimeFormat(
    "en-US",
    {
      month:
        "short",

      day:
        "numeric",

      year:
        "numeric",
    },
  ).format(
    new Date(date),
  );
}