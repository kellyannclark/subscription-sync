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
  InlineStack,
  Page,
} from "@shopify/polaris";

import { authenticate } from "../shopify.server";
import db from "../db.server";

/* ============================================================
   SUBSCRIPTIONSYNC DESIGN SYSTEM
   ============================================================ */

const COLORS = {
  // Main surfaces
  page: "#F7F7F4",
  white: "#FFFFFF",

  // Typography
  text: "#20221F",
  textSoft: "#52574F",
  muted: "#787D75",

  // Sage
  sage: "#687A6C",
  sageDark: "#4D5E51",
  sageDeep: "#39483D",
  sageSoft: "#EEF1ED",
  sageSoftStrong: "#E4EAE3",

  // Warm neutral
  cream: "#F5F1E8",
  creamStrong: "#E9E1D3",
  warmText: "#705F42",

  // Borders
  border: "#E4E5DF",
  borderStrong: "#D6D8D2",

  // Status surfaces
  attentionSoft: "#F7F0E2",
  attentionBorder: "#E9D6AE",
  successSoft: "#EDF3ED",
  successBorder: "#CDDCCF",
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
          COLORS.page,

        minHeight:
          "100vh",
      }}
    >
      <Page
        title="Fulfillment Profiles"
        subtitle="Configure the rules that connect subscription plans to personalized fulfillment."
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
        <BlockStack gap="600">

          {/* ==================================================
              HERO
              ================================================== */}

          <div
            style={{
              position:
                "relative",

              overflow:
                "hidden",

              border:
                `1px solid ${COLORS.border}`,

              borderRadius:
                "20px",

              minHeight:
                "225px",

              background: `
                linear-gradient(
                  108deg,
                  #FCFBF7 0%,
                  #F5F4EF 48%,
                  #D8E0D6 74%,
                  #A8B9A9 100%
                )
              `,

              boxShadow:
                "0 10px 28px rgba(32,34,31,0.06)",
            }}
          >
            <div
              style={{
                position:
                  "absolute",

                width:
                  "390px",

                height:
                  "390px",

                borderRadius:
                  "50%",

                background:
                  "radial-gradient(circle, rgba(57,72,61,0.22) 0%, rgba(57,72,61,0.07) 45%, transparent 70%)",

                right:
                  "-85px",

                top:
                  "-180px",

                pointerEvents:
                  "none",
              }}
            />

            <div
              style={{
                position:
                  "absolute",

                width:
                  "560px",

                height:
                  "170px",

                borderRadius:
                  "50%",

                background:
                  "linear-gradient(135deg, rgba(57,72,61,0.94), rgba(104,122,108,0.74))",

                right:
                  "-160px",

                bottom:
                  "-125px",

                transform:
                  "rotate(-5deg)",

                pointerEvents:
                  "none",
              }}
            />

            <div
              style={{
                position:
                  "absolute",

                width:
                  "245px",

                height:
                  "245px",

                borderRadius:
                  "50%",

                border:
                  "1px solid rgba(255,255,255,0.28)",

                right:
                  "38px",

                top:
                  "-28px",

                pointerEvents:
                  "none",
              }}
            />

            <div
              style={{
                position:
                  "relative",

                zIndex:
                  2,

                padding:
                  "36px 38px",
              }}
            >
              <InlineStack
                align="space-between"
                blockAlign="center"
                gap="600"
                wrap
              >
                <div
                  style={{
                    maxWidth:
                      "650px",
                  }}
                >
                  <div
                    style={{
                      fontSize:
                        "11px",

                      fontWeight:
                        700,

                      letterSpacing:
                        "0.12em",

                      textTransform:
                        "uppercase",

                      color:
                        COLORS.sageDark,

                      marginBottom:
                        "14px",
                    }}
                  >
                    Fulfillment logic
                  </div>

                  <div
                    style={{
                      fontSize:
                        "30px",

                      lineHeight:
                        1.12,

                      fontWeight:
                        650,

                      letterSpacing:
                        "-0.035em",

                      color:
                        COLORS.text,

                      marginBottom:
                        "11px",
                    }}
                  >
                    Turn subscription plans
                    <br />

                    <span
                      style={{
                        color:
                          COLORS.sageDark,
                      }}
                    >
                      into personalized fulfillment.
                    </span>
                  </div>

                  <div
                    style={{
                      maxWidth:
                        "580px",

                      fontSize:
                        "14px",

                      lineHeight:
                        1.6,

                      color:
                        COLORS.textSoft,
                    }}
                  >
                    Each profile connects a
                    subscription program to its
                    eligible products, sizes,
                    reminders, inventory rules,
                    and customer workflow.
                  </div>
                </div>

                <div
                  style={{
                    minWidth:
                      "225px",

                    padding:
                      "18px 20px",

                    borderRadius:
                      "16px",

                    background:
                      "rgba(255,255,255,0.76)",

                    border:
                      "1px solid rgba(255,255,255,0.72)",

                    backdropFilter:
                      "blur(8px)",

                    boxShadow:
                      "0 8px 24px rgba(32,34,31,0.07)",
                  }}
                >
                  <div
                    style={{
                      fontSize:
                        "10px",

                      fontWeight:
                        700,

                      letterSpacing:
                        "0.10em",

                      textTransform:
                        "uppercase",

                      color:
                        COLORS.sageDark,

                      marginBottom:
                        "9px",
                    }}
                  >
                    Active profiles
                  </div>

                  <div
                    style={{
                      fontSize:
                        "30px",

                      lineHeight:
                        1,

                      fontWeight:
                        650,

                      letterSpacing:
                        "-0.04em",

                      color:
                        COLORS.text,

                      marginBottom:
                        "8px",
                    }}
                  >
                    {
                      activeProfiles
                    }
                  </div>

                  <div
                    style={{
                      fontSize:
                        "12px",

                      lineHeight:
                        1.45,

                      color:
                        COLORS.muted,
                    }}
                  >
                    of {profiles.length} profile
                    {profiles.length === 1
                      ? ""
                      : "s"}{" "}
                    active
                  </div>

                  <div
                    style={{
                      height:
                        "1px",

                      background:
                        "rgba(77,94,81,0.12)",

                      margin:
                        "13px 0",
                    }}
                  />

                  <div
                    style={{
                      fontSize:
                        "11px",

                      color:
                        COLORS.textSoft,
                    }}
                  >
                    {totalSubscribers} subscriber
                    {totalSubscribers === 1
                      ? ""
                      : "s"}{" "}
                    assigned
                  </div>
                </div>
              </InlineStack>
            </div>

            <div
              style={{
                position:
                  "absolute",

                top:
                  "15px",

                right:
                  "15px",

                background:
                  "rgba(255,255,255,0.76)",

                border:
                  "1px solid rgba(77,94,81,0.16)",

                borderRadius:
                  "999px",

                padding:
                  "7px 11px",

                backdropFilter:
                  "blur(7px)",
              }}
            >
              <span
                style={{
                  fontSize:
                    "11px",

                  fontWeight:
                    650,

                  color:
                    COLORS.sageDark,
                }}
              >
                ● Development sandbox
              </span>
            </div>
          </div>

          {/* ==================================================
              SNAPSHOT
              ================================================== */}

          <div>
            <SectionHeader
              eyebrow="Overview"
              title="Profile snapshot"
              description="A quick look at the fulfillment structure currently configured in SubscriptionSync."
            />

            <div
              style={{
                display:
                  "grid",

                gridTemplateColumns:
                  "repeat(auto-fit, minmax(180px, 1fr))",

                gap:
                  "12px",

                marginTop:
                  "16px",
              }}
            >
              <MetricCard
                label="Active profiles"
                value={
                  activeProfiles
                }
                tone="success"
              />

              <MetricCard
                label="Subscribers"
                value={
                  totalSubscribers
                }
              />

              <MetricCard
                label="Eligible products"
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
          </div>

          {/* ==================================================
              PROFILE SECTION
              ================================================== */}

          <div>
            <InlineStack
              align="space-between"
              blockAlign="end"
              gap="400"
              wrap
            >
              <SectionHeader
                eyebrow="Programs"
                title="Subscription programs"
                description="Each profile defines how a subscription moves from customer choice through fulfillment."
              />

              {profiles.length > 0 ? (
                <div
                  style={{
                    background:
                      COLORS.sageSoft,

                    border:
                      `1px solid ${COLORS.sageSoftStrong}`,

                    borderRadius:
                      "999px",

                    padding:
                      "7px 12px",

                    color:
                      COLORS.sageDark,

                    fontSize:
                      "12px",

                    fontWeight:
                      700,

                    whiteSpace:
                      "nowrap",
                  }}
                >
                  {profiles.length} profile
                  {profiles.length === 1
                    ? ""
                    : "s"}
                </div>
              ) : null}
            </InlineStack>

            <div
              style={{
                marginTop:
                  "16px",
              }}
            >
              {profiles.length === 0 ? (
                <div
                  style={{
                    background:
                      COLORS.white,

                    border:
                      `1px solid ${COLORS.border}`,

                    borderRadius:
                      "18px",

                    padding:
                      "34px 24px",

                    textAlign:
                      "center",

                    boxShadow:
                      "0 2px 8px rgba(32,34,31,0.025)",
                  }}
                >
                  <BlockStack gap="300">
                    <div
                      style={{
                        fontSize:
                          "17px",

                        fontWeight:
                          650,

                        color:
                          COLORS.text,
                      }}
                    >
                      No fulfillment profiles yet
                    </div>

                    <div
                      style={{
                        maxWidth:
                          "520px",

                        margin:
                          "0 auto",

                        fontSize:
                          "13px",

                        lineHeight:
                          1.55,

                        color:
                          COLORS.muted,
                      }}
                    >
                      Create a profile to connect a
                      subscription plan with its
                      products, sizes, selection rules,
                      and fulfillment workflow.
                    </div>

                    <InlineStack
                      align="center"
                    >
                      <Button
                        variant="primary"
                        url="/app/tiers/new"
                      >
                        Create First Profile
                      </Button>
                    </InlineStack>
                  </BlockStack>
                </div>
              ) : (
                <div
                  style={{
                    display:
                      "grid",

                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(320px, 1fr))",

                    gap:
                      "16px",
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
            </div>
          </div>

          <div style={{ height: "20px" }} />
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
          `1px solid ${
            profile.isActive
              ? COLORS.border
              : COLORS.creamStrong
          }`,

        borderRadius:
          "18px",

        overflow:
          "hidden",

        boxShadow:
          "0 3px 14px rgba(32,34,31,0.045)",
      }}
    >
      {/* PROFILE TOP */}

      <div
        style={{
          background:
            profile.isActive
              ? COLORS.sageSoft
              : COLORS.cream,

          borderBottom:
            `1px solid ${
              profile.isActive
                ? COLORS.sageSoftStrong
                : COLORS.creamStrong
            }`,

          padding:
            "20px",
        }}
      >
        <BlockStack gap="300">
          <InlineStack
            align="space-between"
            blockAlign="start"
            gap="300"
            wrap
          >
            <div
              style={{
                maxWidth:
                  "78%",
              }}
            >
              <div
                style={{
                  fontSize:
                    "18px",

                  fontWeight:
                    650,

                  letterSpacing:
                    "-0.015em",

                  color:
                    COLORS.text,

                  marginBottom:
                    "5px",
                }}
              >
                {
                  profile.name
                }
              </div>

              {profile.description && (
                <div
                  style={{
                    fontSize:
                      "12px",

                    lineHeight:
                      1.5,

                    color:
                      COLORS.muted,
                  }}
                >
                  {
                    profile.description
                  }
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

          <div
            style={{
              background:
                "rgba(255,255,255,0.68)",

              border:
                "1px solid rgba(77,94,81,0.10)",

              borderRadius:
                "12px",

              padding:
                "11px 12px",
            }}
          >
            <div
              style={{
                fontSize:
                  "9px",

                fontWeight:
                  700,

                letterSpacing:
                  "0.08em",

                textTransform:
                  "uppercase",

                color:
                  COLORS.muted,

                marginBottom:
                  "4px",
              }}
            >
              Connected subscription plan
            </div>

            <div
              style={{
                fontSize:
                  "13px",

                fontWeight:
                  650,

                color:
                  COLORS.text,
              }}
            >
              {profile.appstlePlanName ??
                "Not connected"}
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

          <div
            style={{
              height:
                "1px",

              background:
                COLORS.border,
            }}
          />

          <InlineStack
            align="space-between"
            gap="200"
          >
            <div
              style={{
                fontSize:
                  "11px",

                color:
                  COLORS.muted,
              }}
            >
              Last updated
            </div>

            <div
              style={{
                fontSize:
                  "12px",

                fontWeight:
                  600,

                color:
                  COLORS.text,
              }}
            >
              {formatDate(
                profile.updatedAt,
              )}
            </div>
          </InlineStack>

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
   SECTION HEADER
   ============================================================ */

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <div
        style={{
          fontSize:
            "10px",

          fontWeight:
            700,

          letterSpacing:
            "0.11em",

          textTransform:
            "uppercase",

          color:
            COLORS.sage,

          marginBottom:
            "6px",
        }}
      >
        {eyebrow}
      </div>

      <div
        style={{
          fontSize:
            "20px",

          fontWeight:
            650,

          letterSpacing:
            "-0.015em",

          color:
            COLORS.text,

          marginBottom:
            "5px",
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize:
            "13px",

          lineHeight:
            1.5,

          color:
            COLORS.muted,

          maxWidth:
            "700px",
        }}
      >
        {description}
      </div>
    </div>
  );
}

/* ============================================================
   MAIN METRIC
   ============================================================ */

function MetricCard({
  label,
  value,
  tone =
    "neutral",
}: {
  label: string;
  value: number;
  tone?:
    | "neutral"
    | "success";
}) {
  const palette =
    tone === "success"
      ? {
          background:
            COLORS.successSoft,

          border:
            COLORS.successBorder,

          label:
            COLORS.sageDark,
        }
      : {
          background:
            COLORS.white,

          border:
            COLORS.border,

          label:
            COLORS.muted,
        };

  return (
    <div
      style={{
        background:
          palette.background,

        border:
          `1px solid ${palette.border}`,

        borderRadius:
          "15px",

        padding:
          "18px 19px",

        minHeight:
          "108px",

        boxShadow:
          "0 1px 2px rgba(32,34,31,0.02)",
      }}
    >
      <div
        style={{
          fontSize:
            "10px",

          fontWeight:
            700,

          letterSpacing:
            "0.07em",

          textTransform:
            "uppercase",

          color:
            palette.label,

          marginBottom:
            "13px",
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize:
            "30px",

          lineHeight:
            1,

          fontWeight:
            650,

          letterSpacing:
            "-0.04em",

          color:
            COLORS.text,
        }}
      >
        {value}
      </div>
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
          COLORS.page,

        border:
          `1px solid ${COLORS.border}`,

        borderRadius:
          "11px",

        padding:
          "12px",
      }}
    >
      <div
        style={{
          fontSize:
            "9px",

          letterSpacing:
            "0.05em",

          textTransform:
            "uppercase",

          color:
            COLORS.muted,

          marginBottom:
            "5px",

          fontWeight:
            700,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize:
            "20px",

          fontWeight:
            650,

          letterSpacing:
            "-0.03em",

          color:
            COLORS.text,
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