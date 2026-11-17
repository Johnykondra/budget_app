import { Prisma } from "@prisma/client";
import { Router } from "express";
import { prisma } from "../prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);
type ReportTransaction = Prisma.TransactionGetPayload<{ include: { category: true } }>;

function dateRange(year: number, month?: number): { start: Date; end: Date } {
  return month
    ? { start: new Date(year, month - 1, 1), end: new Date(year, month, 1) }
    : { start: new Date(year, 0, 1), end: new Date(year + 1, 0, 1) };
}

router.get("/summary", async (req, res, next) => {
  try {
    const period = req.query.period === "year" ? "year" : "month";
    const now = new Date();
    const year = Number(req.query.year) || now.getFullYear();
    const month = Number(req.query.month) || now.getMonth() + 1;
    if (year < 2000 || year > 2200 || (period === "month" && (month < 1 || month > 12))) {
      res.status(400).json({ error: "Invalid report period" });
      return;
    }
    const { start, end } = dateRange(year, period === "month" ? month : undefined);
    const where = { userId: req.userId, date: { gte: start, lt: end } };
    const transactions: ReportTransaction[] = await prisma.transaction.findMany({
      where,
      include: { category: true },
      orderBy: { date: "asc" }
    });
    const incomeMinor = transactions.filter((row) => row.type === "INCOME").reduce((sum, row) => sum + row.amountMinor, 0);
    const expenseMinor = transactions.filter((row) => row.type === "EXPENSE").reduce((sum, row) => sum + row.amountMinor, 0);
    const grouped = new Map<string, { categoryId: string; name: string; color: string; amountMinor: number }>();
    for (const row of transactions.filter((item) => item.type === "EXPENSE")) {
      const item = grouped.get(row.categoryId) ?? {
        categoryId: row.categoryId, name: row.category.name, color: row.category.color, amountMinor: 0
      };
      item.amountMinor += row.amountMinor;
      grouped.set(row.categoryId, item);
    }
    const byCategory = [...grouped.values()].sort((a, b) => b.amountMinor - a.amountMinor);
    const savingsRate = incomeMinor > 0 ? Math.round(((incomeMinor - expenseMinor) / incomeMinor) * 100) : 0;
    const trend = new Map<string, { period: string; incomeMinor: number; expenseMinor: number }>();
    for (const row of transactions) {
      const key = period === "year"
        ? `${row.date.getFullYear()}-${String(row.date.getMonth() + 1).padStart(2, "0")}`
        : row.date.toISOString().slice(0, 10);
      const item = trend.get(key) ?? { period: key, incomeMinor: 0, expenseMinor: 0 };
      if (row.type === "INCOME") item.incomeMinor += row.amountMinor;
      else item.expenseMinor += row.amountMinor;
      trend.set(key, item);
    }
    res.json({
      period, year, month: period === "month" ? month : undefined, incomeMinor, expenseMinor,
      balanceMinor: incomeMinor - expenseMinor, savingsRate, byCategory,
      trend: [...trend.values()],
      recentTransactions: transactions.slice(-8).reverse()
    });
  } catch (error) {
    next(error);
  }
});

router.get("/monthly", async (req, res, next) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const { start, end } = dateRange(year);
    const transactions = await prisma.transaction.findMany({
      where: { userId: req.userId, date: { gte: start, lt: end } },
      select: { date: true, type: true, amountMinor: true }
    });
    const months = Array.from({ length: 12 }, (_, index) => ({
      month: index + 1, incomeMinor: 0, expenseMinor: 0
    }));
    for (const row of transactions) {
      const item = months[row.date.getMonth()];
      if (row.type === "INCOME") item.incomeMinor += row.amountMinor;
      else item.expenseMinor += row.amountMinor;
    }
    res.json({ year, months });
  } catch (error) {
    next(error);
  }
});

export default router;
