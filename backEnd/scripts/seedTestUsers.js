import "dotenv/config";
import mongoose from "mongoose";
import { generateHash } from "../src/util/security/hash.js";
import { generateEncrypt } from "../src/util/security/crypt.js";
import User from "../src/DB/model/User.model.js";

const TEST_PASSWORD = "123456";

const TEST_USERS = [
  { name: "Owner", email: "owner@test.com", phone: "01000000001", role: "Owner" },
  { name: "Administrator", email: "admin@test.com", phone: "01000000002", role: "Administrator" },
  { name: "General Manager", email: "gm@test.com", phone: "01000000003", role: "General Manager" },
  { name: "Branch Manager", email: "bm@test.com", phone: "01000000004", role: "Branch Manager" },
  { name: "Cook Ahmed", email: "cook1@test.com", phone: "01000000005", role: "Cook" },
  { name: "Cook Sara", email: "cook2@test.com", phone: "01000000006", role: "Cook" },
  { name: "Waiter Mohamed", email: "waiter1@test.com", phone: "01000000007", role: "Order Taker" },
  { name: "Waiter Ali", email: "waiter2@test.com", phone: "01000000008", role: "Order Taker" },
  { name: "Waiter Hassan", email: "waiter3@test.com", phone: "01000000009", role: "Order Taker" },
  { name: "Cashier Omar", email: "cashier1@test.com", phone: "01000000010", role: "Cashier" },
  { name: "Cashier Nour", email: "cashier2@test.com", phone: "01000000011", role: "Cashier" },
  { name: "Host Samir", email: "host1@test.com", phone: "01000000012", role: "Host" },
  { name: "Test User", email: "user@test.com", phone: "01000000013", role: "User" },
];

async function seed() {
  if (!process.env.DB_URL) {
    console.error("Missing DB_URL env");
    process.exit(1);
  }

  await mongoose.connect(process.env.DB_URL, { maxPoolSize: 5, serverSelectionTimeoutMS: 10000 });
  console.log("Connected to DB");

  const hashedPassword = await generateHash({ plainText: TEST_PASSWORD });
  let created = 0, skipped = 0;

  for (const u of TEST_USERS) {
    const existing = await User.findOne({ email: u.email });
    if (existing) {
      console.log(`  SKIP ${u.email} (already exists)`);
      skipped++;
      continue;
    }

    const encryptedPhone = await generateEncrypt({ text: u.phone });
    await User.create({
      name: u.name,
      email: u.email,
      phone: encryptedPhone,
      password: hashedPassword,
      role: u.role,
      confirmEmail: true,
      isDone: true,
      employeeStatus: "available",
      shift: { clockedIn: true, clockedInAt: new Date() },
    });
    console.log(`  OK   ${u.email} (${u.role})`);
    created++;
  }

  console.log(`\nDone. Created: ${created}, Skipped: ${skipped}`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
