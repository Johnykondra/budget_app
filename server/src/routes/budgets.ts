import { Prisma } from "@prisma/client";
import { Router } from "express";
import { prisma } from "../prisma";
import { requireAuth } from "../middleware/auth";
import { budgetSchema } from "../schemas/domain";

const router = Router();
router.use(requireAuth);
type BudgetWithCategory = Prisma.BudgetGetPayload<{ include: { category: true } }>;

function monthRange(year: number, month: number): { start: Date; end: Date } {
  return { start: new Date(year, month - 1, 1), end: new Date(year, month, 1) };
}

async function budgetStatus(userId: string, budget: {
  id: string; categoryId: string | null; year: number; month: number; amountMinor: number; currency: string;
  category?: { name: string; color: string } | null;
}) {
  const { start, end } = monthRange(budget.year, budget.month);
  const spent = await prisma.transaction.aggregate({
    where: {
      userId, type: "EXPENSE", currency: budget.currency,
      date: { gte: start, lt: end },
      ...(budget.categoryId ? { categoryId: budget.categoryId } : {})
    },
    _sum: { amountMinor: true }
  });
  const spentMinor = spent._sum.amountMinor ?? 0;
  const percent = budget.amountMinor ? Math.round((spentMinor / budget.amountMinor) * 100) : 0;
  return {
    ...budget, spentMinor, percent,
    warning: percent >= 100 ? "OVER_BUDGET" : percent >= 80 ? "NEAR_LIMIT" : null
  };
}

router.get("/", async (req, res, next) => {
  try {
    const now = new Date();
    const year = Number(req.query.year) || now.getFullYear();
    const month = Number(req.query.month) || now.getMonth() + 1;
    if (month < 1 || month > 12 || year < 2000 || year > 2200) {
      res.status(400).json({ error: "Invalid budget month" });
      return;
    }
    const budgets: BudgetWithCategory[] = await prisma.budget.findMany({
      where: { userId: req.userId, year, month },
      include: { category: true },
      orderBy: { categoryId: "asc" }
    });
    const status = await Promise.all(budgets.map((budget) => budgetStatus(req.userId, budget)));
    res.json({ budgets: status, year, month });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  const parsed = budgetSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid budget", details: parsed.error.flatten() });
    return;
  }
  try {
    const input = parsed.data;
    if (input.categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: input.categoryId, userId: req.userId, type: "EXPENSE" }
      });
      if (!category) {
        res.status(400).json({ error: "Budget category must be an expense category from this account" });
        return;
      }
    }
    const existing = await prisma.budget.findFirst({
      where: { userId: req.userId, categoryId: input.categoryId ?? null, year: input.year, month: input.month }
    });
    const budget = existing
      ? await prisma.budget.update({ where: { id: existing.id }, data: input })
      : await prisma.budget.create({ data: { ...input, userId: req.userId } });
    const withCategory = await prisma.budget.findFirst({ where: { id: budget.id }, include: { category: true } });
    if (!withCategory) {
      res.status(500).json({ error: "Budget could not be loaded after saving" });
      return;
    }
    res.status(existing ? 200 : 201).json({ budget: await budgetStatus(req.userId, withCategory) });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", async (req, res, next) => {
  const parsed = budgetSchema.partial().safeParse(req.body);
  if (!parsed.success || Object.keys(parsed.data ?? {}).length === 0) {
    res.status(400).json({ error: "Invalid budget update", details: parsed.success ? undefined : parsed.error.flatten() });
    return;
  }
  try {
    const existing = await prisma.budget.findFirst({ where: { id: req.params.id, userId: req.userId } });
    if (!existing) {
      res.status(404).json({ error: "Budget not found" });
      return;
    }
    const categoryId = parsed.data.categoryId === undefined ? existing.categoryId : parsed.data.categoryId;
    if (categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: categoryId, userId: req.userId, type: "EXPENSE" }
      });
      if (!category) {
        res.status(400).json({ error: "Budget category must be an expense category from this account" });
        return;
      }
    }
    await prisma.budget.updateMany({
      where: { id: req.params.id, userId: req.userId },
      data: { ...parsed.data, categoryId }
    });
    const budget = await prisma.budget.findFirst({ where: { id: req.params.id, userId: req.userId }, include: { category: true } });
    if (!budget) {
      res.status(404).json({ error: "Budget not found" });
      return;
    }
    res.json({ budget: await budgetStatus(req.userId, budget) });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const result = await prisma.budget.deleteMany({ where: { id: req.params.id, userId: req.userId } });
    if (!result.count) {
      res.status(404).json({ error: "Budget not found" });
      return;
    }
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

export default router;
