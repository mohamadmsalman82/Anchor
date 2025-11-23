import { prisma } from '../config/database';

async function main() {
  const users = await prisma.user.findMany({ take: 1 });
  console.log(users);
}

main();

