import { Prisma } from "@prisma/client";
import { Router } from "express";
import { prisma } from "../prisma";
import { requireAuth } from "../middleware/auth";
import { contributionSchema, goalSchema } from "../schemas/domain";

const router = Router();
router.use(requireAuth);
type GoalWithContributions = Prisma.GoalGetPayload<{ include: { contributions: true } }>;

async function getGoal(userId: string, goalId: string) {
  const goal: GoalWithContributions | null = await prisma.goal.findFirst({
    where: { id: goalId, userId },
    include: { contributions: { orderBy: { date: "desc" } } }
  });
  if (!goal) return null;
  const contributedMinor = goal.contributions.reduce((sum: number, item: { amountMinor: number }) => sum + item.amountMinor, 0);
  return {
    ...goal,
    contributedMinor,
    progress: goal.targetMinor ? Math.min(100, Math.round((contributedMinor / goal.targetMinor) * 100)) : 0
  };
}

router.get("/", async (req, res, next) => {
  try {
    const goals: GoalWithContributions[] = await prisma.goal.findMany({
      where: { userId: req.userId },
      include: { contributions: { orderBy: { date: "desc" } } },
      orderBy: { createdAt: "desc" }
    });
    res.json({
      goals: goals.map((goal) => {
        const contributedMinor = goal.contributions.reduce((sum: number, item: { amountMinor: number }) => sum + item.amountMinor, 0);
        return { ...goal, contributedMinor, progress: Math.min(100, Math.round((contributedMinor / goal.targetMinor) * 100)) };
      })
    });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  const parsed = goalSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid goal", details: parsed.error.flatten() });
    return;
  }
  try {
    const goal = await prisma.goal.create({ data: { ...parsed.data, userId: req.userId } });
    res.status(201).json({ goal: { ...goal, contributedMinor: 0, progress: 0 } });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", async (req, res, next) => {
  const parsed = goalSchema.partial().safeParse(req.body);
  if (!parsed.success || Object.keys(parsed.data ?? {}).length === 0) {
    res.status(400).json({ error: "Invalid goal update", details: parsed.success ? undefined : parsed.error.flatten() });
    return;
  }
  try {
    const result = await prisma.goal.updateMany({
      where: { id: req.params.id, userId: req.userId },
      data: parsed.data
    });
    if (!result.count) {
      res.status(404).json({ error: "Goal not found" });
      return;
    }
    res.json({ goal: await getGoal(req.userId, req.params.id) });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const result = await prisma.goal.deleteMany({ where: { id: req.params.id, userId: req.userId } });
    if (!result.count) {
      res.status(404).json({ error: "Goal not found" });
      return;
    }
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

router.post("/:id/contributions", async (req, res, next) => {
  const parsed = contributionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid contribution", details: parsed.error.flatten() });
    return;
  }
  try {
    const goal = await prisma.goal.findFirst({ where: { id: req.params.id, userId: req.userId } });
    if (!goal) {
      res.status(404).json({ error: "Goal not found" });
      return;
    }
    const contribution = await prisma.goalContribution.create({
      data: { ...parsed.data, goalId: goal.id }
    });
    res.status(201).json({ contribution, goal: await getGoal(req.userId, goal.id) });
  } catch (error) {
    next(error);
  }
});

export default router;
