// prisma/seed.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Clean test data first so seeds don't duplicate records
  await prisma.activityLog.deleteMany();
  await prisma.shipment.deleteMany();
  await prisma.selection.deleteMany();
  await prisma.preferenceSubmission.deleteMany();
  await prisma.subscriber.deleteMany();
  await prisma.assignedProduct.deleteMany();

  const twirlTier = await prisma.tier.upsert({
    where: { id: "tier-twirl" },
    update: {
      name: "Twirl",
      description: "Sample Twirl subscription tier",
      isActive: true,
    },
    create: {
      id: "tier-twirl",
      name: "Twirl",
      description: "Sample Twirl subscription tier",
      isActive: true,
    },
  });

  const adventureTier = await prisma.tier.upsert({
    where: { id: "tier-adventure" },
    update: {
      name: "Adventure",
      description: "Sample Adventure subscription tier",
      isActive: true,
    },
    create: {
      id: "tier-adventure",
      name: "Adventure",
      description: "Sample Adventure subscription tier",
      isActive: true,
    },
  });

  await prisma.assignedProduct.createMany({
    data: [
      {
        tierId: twirlTier.id,
        sku: "50012-BELLE-XS",
        productName: "50012 Belle XS",
        forceInclude: false,
      },
      {
        tierId: twirlTier.id,
        sku: "50013-ARIEL-S",
        productName: "50013 Ariel S",
        forceInclude: false,
      },
      {
        tierId: twirlTier.id,
        sku: "50014-CINDERELLA-M",
        productName: "50014 Cinderella M",
        forceInclude: false,
      },
      {
        tierId: adventureTier.id,
        sku: "70021-PIRATE-SET",
        productName: "70021 Pirate Adventure Set",
        forceInclude: false,
      },
      {
        tierId: adventureTier.id,
        sku: "70022-DRAGON-CAPE",
        productName: "70022 Dragon Cape",
        forceInclude: false,
      },
    ],
  });

  const anna = await prisma.subscriber.create({
    data: {
      name: "Anna Jones",
      email: "anna@email.com",
      status: "Shipped",
      subscriptionStartDate: new Date("2026-09-21"),
      nextShipDate: new Date("2026-10-21"),
      nextSelectionDeadline: new Date("2026-10-18"),
      autoSelectionDate: new Date("2026-10-19"),
      tierId: twirlTier.id,
    },
  });

  await prisma.selection.create({
    data: {
      subscriberId: anna.id,
      month: "October 2026",
      productName: "50012 Belle XS",
      status: "Customer Selected",
      source: "Quick Submit",
    },
  });

  await prisma.shipment.create({
    data: {
      subscriberId: anna.id,
      shipDate: new Date("2026-10-21"),
      status: "Shipped",
      productName: "50012 Belle XS",
      trackingUrl: "https://tracking.example.com",
      notes: "Seeded test shipment",
    },
  });

  await prisma.subscriber.createMany({
    data: [
      {
        name: "Weston Clark",
        email: "weston@email.com",
        status: "Needs Review",
        subscriptionStartDate: new Date("2026-09-22"),
        nextShipDate: new Date("2026-10-22"),
        nextSelectionDeadline: new Date("2026-10-19"),
        tierId: adventureTier.id,
      },
      {
        name: "Sadie Brown",
        email: "sadie.brown@email.com",
        status: "Pending Selection",
        subscriptionStartDate: new Date("2026-09-23"),
        nextShipDate: new Date("2026-10-23"),
        nextSelectionDeadline: new Date("2026-10-20"),
        tierId: twirlTier.id,
      },
    ],
  });

  await prisma.activityLog.createMany({
    data: [
      {
        eventType: "Seed",
        description: "Created sample tiers, products, subscribers, selections, and shipments.",
        status: "Success",
        user: "System",
        source: "Prisma Seed",
      },
      {
        eventType: "Order",
        description: "Seeded shipped order for Anna Jones.",
        status: "Success",
        user: "System",
        source: "Prisma Seed",
      },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });