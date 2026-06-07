import prisma from "../src/models/prismaClient";

async function main() {}

main()
  .then(async () => {
    console.log("Seeding finished");
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
