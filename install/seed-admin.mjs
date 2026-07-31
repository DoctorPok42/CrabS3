import { PrismaClient } from "./app/generated/prisma/index.js";
import bcrypt from "bcrypt";
import crypto from "node:crypto";

const prisma = new PrismaClient();

function generatePassword(length = 20) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#%^&*";
  return Array.from(crypto.randomFillSync(new Uint32Array(length)))
    .map((n) => alphabet[n % alphabet.length])
    .join("");
}

async function main() {
  const existingAdmin = await prisma.users.findFirst({ where: { isAdmin: true } });
  if (existingAdmin) {
    console.log(`SKIP: an admin already exists (${existingAdmin.email})`);
    return;
  }

  const email = process.env.SEED_ADMIN_EMAIL || "admin@crabs3.local";
  const name = process.env.SEED_ADMIN_NAME || "Admin";
  const password = generatePassword();
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.users.create({
    data: { name, email, passwordHash, isAdmin: true },
  });

  console.log(`ADMIN_EMAIL=${email}`);
  console.log(`ADMIN_PASSWORD=${password}`);
  console.log(`ADMIN_ID=${user.id}`);
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
