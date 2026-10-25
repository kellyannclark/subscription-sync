
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { AppProxyProvider } from "@shopify/shopify-app-remix/react";

import { authenticate } from "../shopify.server";
import db from "../db.server";
import { getSubscriberFromPreferenceToken } from "../utils/preference-access.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Verify the request came through Shopify.
  await authenticate.public.appProxy(request);

  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  // Identify the individual subscription securely.
  const subscriber = await getSubscriberFromPreferenceToken(token);

  // Load only the fulfillment profile assigned to this subscriber.
  const profile = subscriber?.fulfillmentProfileId
    ? await db.fulfillmentProfile.findFirst({
        where: {
          id: subscriber.fulfillmentProfileId,
          isActive: true,
        },
        select: {
          name: true,
          products: {
            where: {
              isActive: true,
            },
            orderBy: {
              productName: "asc",
            },
            select: {
              id: true,
              productName: true,
              shopifyProductId: true,
              variants: {
                where: {
                  isActive: true,
                },
                select: {
                  id: true,
                  variantName: true,
                  size: true,
                  sku: true,
                  shopifyVariantId: true,
                },
              },
            },
          },
        },
      })
    : null;

  return json(
    {
      appUrl: process.env.SHOPIFY_APP_URL ?? "",
      linkValid: Boolean(subscriber),
      profile,
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
        "X-Robots-Tag": "noindex, nofollow",
      },
    },
  );
};

export default function CustomerPreferencesRoute() {
  const { appUrl, linkValid, profile } =
    useLoaderData<typeof loader>();

  return (
    <AppProxyProvider appUrl={appUrl}>
      <main
        style={{
          maxWidth: "900px",
          margin: "40px auto",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <h1>Little Adventures</h1>

        {!linkValid ? (
          <p>
            This preference link is invalid or has expired.
            Please request a new link.
          </p>
        ) : !profile ? (
          <p>
            Your subscription's dress collection is not
            available yet. Please contact Little Adventures.
          </p>
        ) : (
          <>
            <h2>Choose Your Next Adventure ✨</h2>
            <p>Your subscription: {profile.name}</p>
            <p>
              {profile.products.length} eligible dress styles
              found.
            </p>
            <p>
              Your dress selection form is being prepared.
              No preferences have been changed.
            </p>
          </>
        )}
      </main>
    </AppProxyProvider>
  );
}
