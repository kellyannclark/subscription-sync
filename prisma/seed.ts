// prisma/seed.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const twirlTier = await prisma.tier.upsert({
    where: { id: "tier-twirl" },
    update: {},
    create: {
      id: "tier-twirl",
      name: "Twirl",
      description: "Sample Twirl subscription tier",
      isActive: true,
    },
  });

  const adventureTier = await prisma.tier.upsert({
    where: { id: "tier-adventure" },
    update: {},
    create: {
      id: "tier-adventure",
      name: "Adventure",
      description: "Sample Adventure subscription tier",
      isActive: true,
    },
  });

  await prisma.subscriber.createMany({
    data: [
      {
        name: "Anna Jones",
        email: "anna@email.com",
        status: "Order Ready",
        subscriptionStartDate: new Date("2026-09-21"),
        nextShipDate: new Date("2026-10-21"),
        nextSelectionDeadline: new Date("2026-10-18"),
        tierId: twirlTier.id,
      },
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