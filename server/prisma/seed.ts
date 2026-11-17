import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient, TransactionType } from "@prisma/client";

const prisma = new PrismaClient();
const email = "demo@example.com";
const password = "Budget123!";

const defaults: Array<{ type: TransactionType; name: string; color: string }> = [
  { type: "EXPENSE", name: "Rent", color: "#7c3aed" },
  { type: "EXPENSE", name: "Groceries", color: "#10b981" },
  { type: "EXPENSE", name: "Utilities", color: "#f59e0b" },
  { type: "EXPENSE", name: "Transport/Fuel", color: "#3b82f6" },
  { type: "EXPENSE", name: "Dining", color: "#ef4444" },
  { type: "EXPENSE", name: "Shopping", color: "#ec4899" },
  { type: "EXPENSE", name: "Health", color: "#06b6d4" },
  { type: "EXPENSE", name: "Education", color: "#8b5cf6" },
  { type: "EXPENSE", name: "Entertainment", color: "#f97316" },
  { type: "EXPENSE", name: "Remittance/Family Support", color: "#14b8a6" },
  { type: "EXPENSE", name: "Subscriptions", color: "#6366f1" },
  { type: "EXPENSE", name: "Other", color: "#64748b" },
  { type: "INCOME", name: "Salary", color: "#16a34a" },
  { type: "INCOME", name: "Freelance", color: "#0891b2" },
  { type: "INCOME", name: "Bonus", color: "#ca8a04" },
  { type: "INCOME", name: "Investment", color: "#2563eb" },
  { type: "INCOME", name: "Refund", color: "#9333ea" },
  { type: "INCOME", name: "Other", color: "#64748b" }
];

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash }
  });
  const categories = new Map<string, string>();
  for (const item of defaults) {
    const category = await prisma.category.upsert({
      where: { userId_type_name: { userId: user.id, type: item.type, name: item.name } },
      update: { color: item.color, isDefault: true },
      create: { ...item, userId: user.id, isDefault: true }
    });
    categories.set(`${item.type}:${item.name}`, category.id);
  }

  await prisma.transaction.deleteMany({ where: { userId: user.id } });
  await prisma.budget.deleteMany({ where: { userId: user.id } });
  await prisma.goal.deleteMany({ where: { userId: user.id } });
  await prisma.recurringRule.deleteMany({ where: { userId: user.id } });

  const sample: Array<{ type: TransactionType; category: string; amount: number; day: number; paymentMethod: "CASH" | "CARD" | "BANK_TRANSFER" | "WALLET"; description: string }> = [
    { type: "INCOME", category: "Salary", amount: 18500, day: 1, paymentMethod: "BANK_TRANSFER", description: "Monthly salary" },
    { type: "EXPENSE", category: "Rent", amount: 6200, day: 2, paymentMethod: "BANK_TRANSFER", description: "Apartment rent" },
    { type: "EXPENSE", category: "Groceries", amount: 486.75, day: 4, paymentMethod: "CARD", description: "Weekly groceries" },
    { type: "EXPENSE", category: "Transport/Fuel", amount: 210, day: 6, paymentMethod: "CARD", description: "Fuel" },
    { type: "EXPENSE", category: "Dining", amount: 126.5, day: 9, paymentMethod: "CARD", description: "Lunch with friends" },
    { type: "EXPENSE", category: "Utilities", amount: 398.2, day: 11, paymentMethod: "CARD", description: "DEWA bill" },
    { type: "INCOME", category: "Freelance", amount: 2400, day: 14, paymentMethod: "BANK_TRANSFER", description: "Design project" },
    { type: "EXPENSE", category: "Remittance/Family Support", amount: 1200, day: 16, paymentMethod: "BANK_TRANSFER", description: "Family support" },
    { type: "EXPENSE", category: "Subscriptions", amount: 89.99, day: 18, paymentMethod: "CARD", description: "Streaming and cloud apps" },
    { type: "EXPENSE", category: "Shopping", amount: 349.5, day: 21, paymentMethod: "CARD", description: "Home essentials" },
    { type: "EXPENSE", category: "Groceries", amount: 312.4, day: 23, paymentMethod: "WALLET", description: "Market run" },
    { type: "EXPENSE", category: "Health", amount: 145, day: 25, paymentMethod: "CARD", description: "Pharmacy" },
    { type: "EXPENSE", category: "Entertainment", amount: 180, day: 27, paymentMethod: "CARD", description: "Cinema night" }
  ];
  const today = new Date();
  for (let monthOffset = 2; monthOffset >= 0; monthOffset--) {
    const monthStart = new Date(today.getFullYear(), today.getMonth() - monthOffset, 1, 12);
    for (const entry of sample) {
      const monthEndDay = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
      const date = new Date(monthStart.getFullYear(), monthStart.getMonth(), Math.min(entry.day, monthEndDay), 12);
      if (date > today) continue;
      await prisma.transaction.create({
        data: {
          userId: user.id,
          categoryId: categories.get(`${entry.type}:${entry.category}`)!,
          type: entry.type,
          amountMinor: Math.round(entry.amount * 100),
          currency: "AED",
          date,
          paymentMethod: entry.paymentMethod,
          description: monthOffset === 0 ? entry.description : `${entry.description} · ${monthStart.toLocaleString("en", { month: "short" })}`
        }
      });
    }
  }

  const now = new Date();
  await prisma.budget.create({
    data: { userId: user.id, categoryId: null, year: now.getFullYear(), month: now.getMonth() + 1, amountMinor: 1200000, currency: "AED" }
  });
  const goal = await prisma.goal.create({
    data: { userId: user.id, name: "Weekend in Oman", targetMinor: 250000, currency: "AED", targetDate: new Date(now.getFullYear(), now.getMonth() + 3, 1) }
  });
  await prisma.goalContribution.createMany({
    data: [
      { goalId: goal.id, amountMinor: 35000, date: new Date(now.getFullYear(), now.getMonth() - 1, 5) },
      { goalId: goal.id, amountMinor: 25000, date: new Date(now.getFullYear(), now.getMonth(), 5) }
    ]
  });
  console.log(`Seeded ${email} with 3 months of sample transactions. Password: ${password}`);
}

main().catch((error: unknown) => {
  console.error("Database seed failed", error);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
