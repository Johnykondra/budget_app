import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../prisma";
import { requireAuth, signToken } from "../middleware/auth";
import { isPrismaError } from "../middleware/prismaErrors";
import { loginSchema, registerSchema } from "../schemas/auth";

const router = Router();

const defaultCategories = [
  { type: "EXPENSE" as const, name: "Rent", color: "#7c3aed" },
  { type: "EXPENSE" as const, name: "Groceries", color: "#10b981" },
  { type: "EXPENSE" as const, name: "Utilities", color: "#f59e0b" },
  { type: "EXPENSE" as const, name: "Transport/Fuel", color: "#3b82f6" },
  { type: "EXPENSE" as const, name: "Dining", color: "#ef4444" },
  { type: "EXPENSE" as const, name: "Shopping", color: "#ec4899" },
  { type: "EXPENSE" as const, name: "Health", color: "#06b6d4" },
  { type: "EXPENSE" as const, name: "Education", color: "#8b5cf6" },
  { type: "EXPENSE" as const, name: "Entertainment", color: "#f97316" },
  { type: "EXPENSE" as const, name: "Remittance/Family Support", color: "#14b8a6" },
  { type: "EXPENSE" as const, name: "Subscriptions", color: "#6366f1" },
  { type: "EXPENSE" as const, name: "Other", color: "#64748b" },
  { type: "INCOME" as const, name: "Salary", color: "#16a34a" },
  { type: "INCOME" as const, name: "Freelance", color: "#0891b2" },
  { type: "INCOME" as const, name: "Bonus", color: "#ca8a04" },
  { type: "INCOME" as const, name: "Investment", color: "#2563eb" },
  { type: "INCOME" as const, name: "Refund", color: "#9333ea" },
  { type: "INCOME" as const, name: "Other", color: "#64748b" }
];

router.post("/register", async (req, res, next) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid registration details", details: parsed.error.flatten() });
    return;
  }

  try {
    const email = parsed.data.email.toLowerCase();
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        categories: { create: defaultCategories.map((category) => ({ ...category, isDefault: true })) }
      },
      select: { id: true, email: true, createdAt: true }
    });

    res.status(201).json({ user, token: signToken(user.id) });
  } catch (error) {
    if (isPrismaError(error, "P2002")) {
      res.status(409).json({ error: "An account with this email already exists" });
      return;
    }
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid login details", details: parsed.error.flatten() });
    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
    const passwordMatches = user ? await bcrypt.compare(parsed.data.password, user.passwordHash) : false;
    if (!user || !passwordMatches) {
      res.status(401).json({ error: "Email or password is incorrect" });
      return;
    }
    res.json({
      user: { id: user.id, email: user.email, createdAt: user.createdAt },
      token: signToken(user.id)
    });
  } catch (error) {
    next(error);
  }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, createdAt: true }
    });
    if (!user) {
      res.status(401).json({ error: "Account no longer exists" });
      return;
    }
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

export default router;
