
import { createHash, randomBytes } from "node:crypto";
import db from "../db.server";

const TOKEN_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}

/**
 * Creates a secure, expiring access token for one subscriber.
 *
 * Only the token hash is saved in the database.
 * The original token is returned for use in a customer email.
 *
 * Call this only from an authorized server-side workflow.
 */
export async function createPreferenceAccessLink(
  subscriberId: string,
) {
  const token = randomBytes(32).toString("base64url");

  const expiresAt = new Date(
    Date.now() + TOKEN_LIFETIME_MS,
  );

  await db.preferenceAccessLink.create({
    data: {
      subscriberId,
      tokenHash: hashToken(token),
      expiresAt,
    },
  });

  return {
    token,
    expiresAt,
  };
}

/**
 * Finds the subscriber associated with a valid access token.
 *
 * Expired, revoked, or invalid tokens are rejected.
 */
export async function getSubscriberFromPreferenceToken(
  token: string | null,
) {
  if (
    !token ||
    !/^[A-Za-z0-9_-]{43}$/.test(token)
  ) {
    return null;
  }

  const accessLink = await db.preferenceAccessLink.findFirst({
    where: {
      tokenHash: hashToken(token),
      revokedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
    include: {
      subscriber: true,
    },
  });

  return accessLink?.subscriber ?? null;
}
