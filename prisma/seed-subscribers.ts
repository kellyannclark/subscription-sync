import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const fulfillmentProfileId =
  "cmskuy9020000sg7jf773jqyx";

async function main() {
  const profile =
    await prisma.fulfillmentProfile.findUnique({
      where: {
        id: fulfillmentProfileId,
      },
    });

  if (!profile) {
    throw new Error(
      `Fulfillment profile ${fulfillmentProfileId} was not found.`,
    );
  }

  console.log(
    `Creating sandbox subscribers for ${profile.name}...`,
  );

  /*
   * Remove only the demo subscribers created by
   * this seed script so you can safely rerun it.
   */
  await prisma.subscriber.deleteMany({
    where: {
      email: {
        endsWith: "@subscriptionsync-demo.com",
      },
    },
  });

  const subscribers = [
    {
      name: "Emily Carter",
      email:
        "emily.carter@subscriptionsync-demo.com",
      shopifyCustomerId:
        "demo-shopify-1001",
      appstleSubscriptionId:
        "demo-appstle-1001",
      appstlePlanId:
        "demo-twirl-plan",
      appstlePlanName:
        "Princess Subscription - Twirl",
      subscriptionStatus: "Active",
      subscriptionStartDate:
        new Date("2026-02-12"),
      nextOrderDate:
        new Date("2026-08-20"),
      workflowStatus:
        "Waiting for Selection",
      nextShipDate:
        new Date("2026-08-22"),
      nextSelectionDeadline:
        new Date("2026-08-13"),
      autoSelectionDate:
        new Date("2026-08-15"),
      selectionEmailSentAt:
        new Date("2026-08-06"),
      selectionSubmittedAt: null,
    },

    {
      name: "Sophia Martinez",
      email:
        "sophia.martinez@subscriptionsync-demo.com",
      shopifyCustomerId:
        "demo-shopify-1002",
      appstleSubscriptionId:
        "demo-appstle-1002",
      appstlePlanId:
        "demo-twirl-plan",
      appstlePlanName:
        "Princess Subscription - Twirl",
      subscriptionStatus: "Active",
      subscriptionStartDate:
        new Date("2026-01-05"),
      nextOrderDate:
        new Date("2026-08-18"),
      workflowStatus:
        "Selection Submitted",
      nextShipDate:
        new Date("2026-08-20"),
      nextSelectionDeadline:
        new Date("2026-08-11"),
      autoSelectionDate:
        new Date("2026-08-13"),
      selectionEmailSentAt:
        new Date("2026-08-04"),
      selectionSubmittedAt:
        new Date("2026-08-07"),
    },

    {
      name: "Olivia Bennett",
      email:
        "olivia.bennett@subscriptionsync-demo.com",
      shopifyCustomerId:
        "demo-shopify-1003",
      appstleSubscriptionId:
        "demo-appstle-1003",
      appstlePlanId:
        "demo-twirl-plan",
      appstlePlanName:
        "Princess Subscription - Twirl",
      subscriptionStatus: "Active",
      subscriptionStartDate:
        new Date("2025-11-19"),
      nextOrderDate:
        new Date("2026-08-16"),
      workflowStatus:
        "Auto Selected",
      nextShipDate:
        new Date("2026-08-18"),
      nextSelectionDeadline:
        new Date("2026-08-09"),
      autoSelectionDate:
        new Date("2026-08-11"),
      selectionEmailSentAt:
        new Date("2026-08-02"),
      selectionSubmittedAt: null,
    },

    {
      name: "Ava Wilson",
      email:
        "ava.wilson@subscriptionsync-demo.com",
      shopifyCustomerId:
        "demo-shopify-1004",
      appstleSubscriptionId:
        "demo-appstle-1004",
      appstlePlanId:
        "demo-twirl-plan",
      appstlePlanName:
        "Princess Subscription - Twirl",
      subscriptionStatus: "Active",
      subscriptionStartDate:
        new Date("2026-03-01"),
      nextOrderDate:
        new Date("2026-08-24"),
      workflowStatus:
        "Waiting for Selection",
      nextShipDate:
        new Date("2026-08-26"),
      nextSelectionDeadline:
        new Date("2026-08-17"),
      autoSelectionDate:
        new Date("2026-08-19"),
      selectionEmailSentAt: null,
      selectionSubmittedAt: null,
    },

    {
      name: "Grace Anderson",
      email:
        "grace.anderson@subscriptionsync-demo.com",
      shopifyCustomerId:
        "demo-shopify-1005",
      appstleSubscriptionId:
        "demo-appstle-1005",
      appstlePlanId:
        "demo-twirl-plan",
      appstlePlanName:
        "Princess Subscription - Twirl",
      subscriptionStatus: "Active",
      subscriptionStartDate:
        new Date("2025-09-14"),
      nextOrderDate:
        new Date("2026-08-14"),
      workflowStatus:
        "Ready for Fulfillment",
      nextShipDate:
        new Date("2026-08-16"),
      nextSelectionDeadline:
        new Date("2026-08-07"),
      autoSelectionDate:
        new Date("2026-08-09"),
      selectionEmailSentAt:
        new Date("2026-07-31"),
      selectionSubmittedAt:
        new Date("2026-08-05"),
    },

    {
      name: "Mia Thompson",
      email:
        "mia.thompson@subscriptionsync-demo.com",
      shopifyCustomerId:
        "demo-shopify-1006",
      appstleSubscriptionId:
        "demo-appstle-1006",
      appstlePlanId:
        "demo-twirl-plan",
      appstlePlanName:
        "Princess Subscription - Twirl",
      subscriptionStatus: "Active",
      subscriptionStartDate:
        new Date("2026-04-10"),
      nextOrderDate:
        new Date("2026-08-28"),
      workflowStatus:
        "Waiting for Selection",
      nextShipDate:
        new Date("2026-08-30"),
      nextSelectionDeadline:
        new Date("2026-08-21"),
      autoSelectionDate:
        new Date("2026-08-23"),
      selectionEmailSentAt: null,
      selectionSubmittedAt: null,
    },

    {
      name: "Charlotte Reed",
      email:
        "charlotte.reed@subscriptionsync-demo.com",
      shopifyCustomerId:
        "demo-shopify-1007",
      appstleSubscriptionId:
        "demo-appstle-1007",
      appstlePlanId:
        "demo-twirl-plan",
      appstlePlanName:
        "Princess Subscription - Twirl",
      subscriptionStatus: "Active",
      subscriptionStartDate:
        new Date("2025-12-02"),
      nextOrderDate:
        new Date("2026-08-19"),
      workflowStatus:
        "Selection Submitted",
      nextShipDate:
        new Date("2026-08-21"),
      nextSelectionDeadline:
        new Date("2026-08-12"),
      autoSelectionDate:
        new Date("2026-08-14"),
      selectionEmailSentAt:
        new Date("2026-08-05"),
      selectionSubmittedAt:
        new Date("2026-08-08"),
    },

    {
      name: "Harper Lewis",
      email:
        "harper.lewis@subscriptionsync-demo.com",
      shopifyCustomerId:
        "demo-shopify-1008",
      appstleSubscriptionId:
        "demo-appstle-1008",
      appstlePlanId:
        "demo-twirl-plan",
      appstlePlanName:
        "Princess Subscription - Twirl",
      subscriptionStatus: "Active",
      subscriptionStartDate:
        new Date("2025-10-23"),
      nextOrderDate:
        new Date("2026-08-15"),
      workflowStatus:
        "Ready for Fulfillment",
      nextShipDate:
        new Date("2026-08-17"),
      nextSelectionDeadline:
        new Date("2026-08-08"),
      autoSelectionDate:
        new Date("2026-08-10"),
      selectionEmailSentAt:
        new Date("2026-08-01"),
      selectionSubmittedAt:
        new Date("2026-08-06"),
    },

    {
      name: "Ella Morgan",
      email:
        "ella.morgan@subscriptionsync-demo.com",
      shopifyCustomerId:
        "demo-shopify-1009",
      appstleSubscriptionId:
        "demo-appstle-1009",
      appstlePlanId:
        "demo-twirl-plan",
      appstlePlanName:
        "Princess Subscription - Twirl",
      subscriptionStatus: "Active",
      subscriptionStartDate:
        new Date("2026-05-11"),
      nextOrderDate:
        new Date("2026-09-02"),
      workflowStatus:
        "Waiting for Selection",
      nextShipDate:
        new Date("2026-09-04"),
      nextSelectionDeadline:
        new Date("2026-08-26"),
      autoSelectionDate:
        new Date("2026-08-28"),
      selectionEmailSentAt: null,
      selectionSubmittedAt: null,
    },

    {
      name: "Lily Cooper",
      email:
        "lily.cooper@subscriptionsync-demo.com",
      shopifyCustomerId:
        "demo-shopify-1010",
      appstleSubscriptionId:
        "demo-appstle-1010",
      appstlePlanId:
        "demo-twirl-plan",
      appstlePlanName:
        "Princess Subscription - Twirl",
      subscriptionStatus: "Active",
      subscriptionStartDate:
        new Date("2025-08-30"),
      nextOrderDate:
        new Date("2026-08-13"),
      workflowStatus:
        "Auto Selected",
      nextShipDate:
        new Date("2026-08-15"),
      nextSelectionDeadline:
        new Date("2026-08-06"),
      autoSelectionDate:
        new Date("2026-08-08"),
      selectionEmailSentAt:
        new Date("2026-07-30"),
      selectionSubmittedAt: null,
    },

    {
      name: "Chloe Parker",
      email:
        "chloe.parker@subscriptionsync-demo.com",
      shopifyCustomerId:
        "demo-shopify-1011",
      appstleSubscriptionId:
        "demo-appstle-1011",
      appstlePlanId:
        "demo-twirl-plan",
      appstlePlanName:
        "Princess Subscription - Twirl",
      subscriptionStatus: "Active",
      subscriptionStartDate:
        new Date("2026-03-18"),
      nextOrderDate:
        new Date("2026-08-23"),
      workflowStatus:
        "Selection Submitted",
      nextShipDate:
        new Date("2026-08-25"),
      nextSelectionDeadline:
        new Date("2026-08-16"),
      autoSelectionDate:
        new Date("2026-08-18"),
      selectionEmailSentAt:
        new Date("2026-08-09"),
      selectionSubmittedAt:
        new Date("2026-08-10"),
    },

    {
      name: "Lucy Walker",
      email:
        "lucy.walker@subscriptionsync-demo.com",
      shopifyCustomerId:
        "demo-shopify-1012",
      appstleSubscriptionId:
        "demo-appstle-1012",
      appstlePlanId:
        "demo-twirl-plan",
      appstlePlanName:
        "Princess Subscription - Twirl",
      subscriptionStatus: "Active",
      subscriptionStartDate:
        new Date("2025-07-07"),
      nextOrderDate:
        new Date("2026-08-12"),
      workflowStatus:
        "Fulfilled",
      nextShipDate:
        new Date("2026-08-12"),
      nextSelectionDeadline:
        new Date("2026-08-05"),
      autoSelectionDate:
        new Date("2026-08-07"),
      selectionEmailSentAt:
        new Date("2026-07-29"),
      selectionSubmittedAt:
        new Date("2026-08-03"),
    },
  ];

  for (const subscriber of subscribers) {
    await prisma.subscriber.create({
      data: {
        ...subscriber,
        fulfillmentProfileId,
      },
    });

    console.log(
      `✓ ${subscriber.name} — ${subscriber.workflowStatus}`,
    );
  }

  const count =
    await prisma.subscriber.count({
      where: {
        fulfillmentProfileId,
      },
    });

  console.log("");
  console.log("Subscriber seed complete!");
  console.log(
    `${count} subscribers are now assigned to ${profile.name}.`,
  );
}

main()
  .catch((error) => {
    console.error(
      "Subscriber seed failed:",
      error,
    );

    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });