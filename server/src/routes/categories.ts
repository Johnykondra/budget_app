import { Router } from "express";
import { prisma } from "../prisma";
import { requireAuth } from "../middleware/auth";
import { isPrismaError } from "../middleware/prismaErrors";
import { categorySchema } from "../schemas/domain";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      where: { userId: req.userId },
      orderBy: [{ type: "asc" }, { name: "asc" }]
    });
    res.json({ categories });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid category", details: parsed.error.flatten() });
    return;
  }
  try {
    const category = await prisma.category.create({
      data: { ...parsed.data, userId: req.userId, isDefault: false }
    });
    res.status(201).json({ category });
  } catch (error) {
    if (isPrismaError(error, "P2002")) {
      res.status(409).json({ error: "A category with this name and type already exists" });
      return;
    }
    next(error);
  }
});

router.patch("/:id", async (req, res, next) => {
  const parsed = categorySchema.partial().safeParse(req.body);
  if (!parsed.success || Object.keys(parsed.data ?? {}).length === 0) {
    res.status(400).json({ error: "Invalid category update", details: parsed.success ? undefined : parsed.error.flatten() });
    return;
  }
  try {
    const result = await prisma.category.updateMany({
      where: { id: req.params.id, userId: req.userId },
      data: parsed.data
    });
    if (!result.count) {
      res.status(404).json({ error: "Category not found" });
      return;
    }
    const category = await prisma.category.findFirst({ where: { id: req.params.id, userId: req.userId } });
    res.json({ category });
  } catch (error) {
    if (isPrismaError(error, "P2002")) {
      res.status(409).json({ error: "A category with this name and type already exists" });
      return;
    }
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const result = await prisma.category.deleteMany({
      where: { id: req.params.id, userId: req.userId, isDefault: false }
    });
    if (!result.count) {
      res.status(404).json({ error: "Custom category not found" });
      return;
    }
    res.status(204).end();
  } catch (error) {
    if (isPrismaError(error, "P2003")) {
      res.status(409).json({ error: "Category is in use and cannot be deleted" });
      return;
    }
    next(error);
  }
});

export default router;
