
import type { LoaderFunctionArgs } from "@remix-run/node";

import { authenticate } from "../shopify.server";

import {
  getSubscriberFromPreferenceToken,
} from "../utils/preference-access.server";

export const loader = async ({
  request,
}: LoaderFunctionArgs) => {
  // Verify that Shopify forwarded this request.
  const { liquid } =
    await authenticate.public.appProxy(request);

  // Read the customer's personalized access token.
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  // Verify the token is valid, unexpired, and not revoked.
  const subscriber =
    await getSubscriberFromPreferenceToken(token);

  if (!subscriber) {
    return liquid(`
      <div style="max-width: 700px; margin: 40px auto; padding: 20px; text-align: center;">
        <h2>SubscriptionSync</h2>
        <p>This preference link is invalid or has expired.</p>
        <p>Please request a new link to select your dresses.</p>
      </div>
    `);
  }

  // Safe placeholder: no customer information displayed yet.
  return liquid(`
    <div style="max-width: 700px; margin: 40px auto; padding: 20px; text-align: center;">
      <h2>Welcome to SubscriptionSync!</h2>
      <p>Your secure subscription link has been verified.</p>
      <p>Your dress preference form is being prepared.</p>
      <p>No selections have been saved or changed.</p>
    </div>
  `);
};
