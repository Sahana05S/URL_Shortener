import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seed() {
  const email = process.env.DEMO_EMAIL?.trim().toLowerCase();
  const password = process.env.DEMO_PASSWORD;
  const name = process.env.DEMO_NAME?.trim() || "Demo User";

  if (!email || !password || password.startsWith("replace-with")) {
    console.log("Demo seed skipped: configure DEMO_EMAIL and DEMO_PASSWORD.");
    return;
  }
  if (password.length < 10) {
    throw new Error("DEMO_PASSWORD must be at least 10 characters.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: { name, passwordHash },
    create: { name, email, passwordHash },
  });

  await prisma.link.upsert({
    where: { shortCode: "linkora-demo" },
    update: { userId: user.id },
    create: {
      shortCode: "linkora-demo",
      destinationUrl: "https://katomaran.com/",
      publicStats: true,
      userId: user.id,
    },
  });

  console.log(`Demo data ready for ${email}.`);
}

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

