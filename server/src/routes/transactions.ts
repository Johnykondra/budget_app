import { Prisma } from "@prisma/client";
import ExcelJS from "exceljs";
import { Router } from "express";
import fs from "fs";
import path from "path";
import { prisma } from "../prisma";
import { requireAuth } from "../middleware/auth";
import { getUploadDirectory, receiptUpload } from "../middleware/upload";
import { isPrismaError } from "../middleware/prismaErrors";
import { contributionSchema, frequencySchema, transactionSchema } from "../schemas/domain";
import { advanceDate, generateDueTransactions } from "../services/recurring";

const router = Router();
router.use(requireAuth);
type TransactionRow = Prisma.TransactionGetPayload<{
  include: { category: true; tags: { include: { tag: true } } };
}>;

function transactionWhere(userId: string, query: Record<string, unknown>): Prisma.TransactionWhereInput {
  const where: Prisma.TransactionWhereInput = { userId };
  if (typeof query.type === "string" && ["EXPENSE", "INCOME"].includes(query.type)) {
    where.type = query.type as "EXPENSE" | "INCOME";
  }
  if (typeof query.categoryId === "string" && query.categoryId) where.categoryId = query.categoryId;
  if (typeof query.paymentMethod === "string" && ["CASH", "CARD", "BANK_TRANSFER", "WALLET"].includes(query.paymentMethod)) {
    where.paymentMethod = query.paymentMethod as "CASH" | "CARD" | "BANK_TRANSFER" | "WALLET";
  }
  if (typeof query.from === "string" || typeof query.to === "string") {
    where.date = {};
    if (typeof query.from === "string") where.date.gte = new Date(query.from);
    if (typeof query.to === "string") where.date.lte = new Date(query.to);
  }
  if (typeof query.search === "string" && query.search.trim()) {
    where.description = { contains: query.search.trim() };
  }
  if (typeof query.tag === "string" && query.tag.trim()) {
    where.tags = { some: { tag: { name: query.tag.trim(), userId } } };
  }
  return where;
}

async function setTransactionTags(
  userId: string,
  transactionId: string,
  tagNames: string[]
): Promise<void> {
  await prisma.transactionTag.deleteMany({ where: { transactionId, userId } });
  for (const name of [...new Set(tagNames.map((tag) => tag.trim()).filter(Boolean))]) {
    const tag = await prisma.tag.upsert({
      where: { userId_name: { userId, name } },
      create: { userId, name },
      update: {}
    });
    await prisma.transactionTag.create({ data: { transactionId, tagId: tag.id, userId } });
  }
}

async function createTransaction(userId: string, input: ReturnType<typeof transactionSchema.parse>, receiptPath?: string) {
  const category = await prisma.category.findFirst({ where: { id: input.categoryId, userId, type: input.type } });
  if (!category) throw Object.assign(new Error("Category not found"), { status: 400 });
  let recurringRuleId: string | undefined;
  if (input.recurrence) {
    const frequency = frequencySchema.parse(input.recurrence);
    const rule = await prisma.recurringRule.create({
      data: {
        userId, categoryId: input.categoryId, type: input.type, amountMinor: input.amountMinor,
        currency: input.currency, subCategory: input.subCategory, paymentMethod: input.paymentMethod,
        description: input.description, frequency, startsAt: input.date,
        nextRunAt: advanceDate(input.date, frequency), endsAt: input.recurrenceEndsAt ?? undefined
      }
    });
    recurringRuleId = rule.id;
  }
  const transaction = await prisma.transaction.create({
    data: {
      userId, categoryId: input.categoryId, recurringRuleId, type: input.type,
      amountMinor: input.amountMinor, currency: input.currency, subCategory: input.subCategory,
      date: input.date, paymentMethod: input.paymentMethod, description: input.description, receiptPath
    }
  });
  await setTransactionTags(userId, transaction.id, input.tags);
  return prisma.transaction.findFirst({
    where: { id: transaction.id, userId },
    include: { category: true, tags: { include: { tag: true } } }
  });
}

router.get("/", async (req, res, next) => {
  try {
    await generateDueTransactions();
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
    const orderBy = req.query.sortBy === "amountMinor" ? "amountMinor" : "date";
    const order = req.query.order === "asc" ? "asc" : "desc";
    const where = transactionWhere(req.userId, req.query as Record<string, unknown>);
    const [data, total] = await prisma.$transaction([
      prisma.transaction.findMany({
        where,
        include: { category: true, tags: { include: { tag: true } } },
        orderBy: { [orderBy]: order },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.transaction.count({ where })
    ]);
    res.json({ data, total, page, pageSize, pages: Math.ceil(total / pageSize) });
  } catch (error) {
    next(error);
  }
});

router.post("/", receiptUpload.single("receipt"), async (req, res, next) => {
  const body = { ...req.body };
  if (typeof body.amountMinor === "string") body.amountMinor = Number(body.amountMinor);
  if (typeof body.tags === "string") {
    try { body.tags = JSON.parse(body.tags); } catch { body.tags = body.tags.split(","); }
  }
  const parsed = transactionSchema.safeParse(body);
  if (!parsed.success) {
    if (req.file) fs.rmSync(req.file.path, { force: true });
    res.status(400).json({ error: "Invalid transaction", details: parsed.error.flatten() });
    return;
  }
  try {
    const transaction = await createTransaction(req.userId, parsed.data, req.file?.filename);
    res.status(201).json({ transaction });
  } catch (error) {
    if (req.file) fs.rmSync(req.file.path, { force: true });
    if (error instanceof Error && "status" in error && error.status === 400) {
      res.status(400).json({ error: error.message });
      return;
    }
    next(error);
  }
});

router.patch("/:id", async (req, res, next) => {
  const parsed = transactionSchema.partial().safeParse(req.body);
  if (!parsed.success || Object.keys(parsed.data ?? {}).length === 0) {
    res.status(400).json({ error: "Invalid transaction update", details: parsed.success ? undefined : parsed.error.flatten() });
    return;
  }
  try {
    const existing = await prisma.transaction.findFirst({ where: { id: req.params.id, userId: req.userId } });
    if (!existing) {
      res.status(404).json({ error: "Transaction not found" });
      return;
    }
    const { tags, recurrence, recurrenceEndsAt, ...fields } = parsed.data;
    if (fields.categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: fields.categoryId, userId: req.userId, type: fields.type ?? existing.type }
      });
      if (!category) {
        res.status(400).json({ error: "Category does not belong to this account or transaction type" });
        return;
      }
    }
    await prisma.transaction.updateMany({
      where: { id: existing.id, userId: req.userId },
      data: fields as Prisma.TransactionUpdateManyMutationInput
    });
    if (tags) await setTransactionTags(req.userId, existing.id, tags);
    const transaction = await prisma.transaction.findFirst({
      where: { id: existing.id, userId: req.userId },
      include: { category: true, tags: { include: { tag: true } } }
    });
    res.json({ transaction, recurrence, recurrenceEndsAt });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const existing = await prisma.transaction.findFirst({
      where: { id: req.params.id, userId: req.userId },
      select: { receiptPath: true }
    });
    if (!existing) {
      res.status(404).json({ error: "Transaction not found" });
      return;
    }
    await prisma.transaction.deleteMany({ where: { id: req.params.id, userId: req.userId } });
    if (existing.receiptPath) fs.rmSync(path.join(getUploadDirectory(), existing.receiptPath), { force: true });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

router.get("/:id/receipt", async (req, res, next) => {
  try {
    const transaction = await prisma.transaction.findFirst({
      where: { id: req.params.id, userId: req.userId },
      select: { receiptPath: true }
    });
    if (!transaction?.receiptPath) {
      res.status(404).json({ error: "Receipt not found" });
      return;
    }
    res.sendFile(path.join(getUploadDirectory(), transaction.receiptPath));
  } catch (error) {
    next(error);
  }
});

router.get("/export/csv", async (req, res, next) => {
  try {
    const rows: TransactionRow[] = await prisma.transaction.findMany({
      where: transactionWhere(req.userId, req.query as Record<string, unknown>),
      include: { category: true, tags: { include: { tag: true } } },
      orderBy: { date: "desc" }
    });
    const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const lines = [
      ["date", "type", "amount", "currency", "category", "subCategory", "paymentMethod", "description", "tags"].map(escape).join(","),
      ...rows.map((row) => [
        row.date.toISOString().slice(0, 10), row.type, (row.amountMinor / 100).toFixed(2), row.currency,
        row.category.name, row.subCategory ?? "", row.paymentMethod, row.description ?? "",
        row.tags.map((item: { tag: { name: string } }) => item.tag.name).join("|")
      ].map(escape).join(","))
    ];
    res.type("text/csv").attachment("transactions.csv").send(`\uFEFF${lines.join("\r\n")}`);
  } catch (error) {
    next(error);
  }
});

router.get("/export/excel", async (req, res, next) => {
  try {
    const rows: TransactionRow[] = await prisma.transaction.findMany({
      where: transactionWhere(req.userId, req.query as Record<string, unknown>),
      include: { category: true, tags: { include: { tag: true } } },
      orderBy: { date: "desc" }
    });
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Transactions");
    sheet.columns = [
      { header: "Date", key: "date", width: 14 }, { header: "Type", key: "type", width: 12 },
      { header: "Amount", key: "amount", width: 14 }, { header: "Currency", key: "currency", width: 12 },
      { header: "Category", key: "category", width: 24 }, { header: "Sub-category", key: "subCategory", width: 20 },
      { header: "Payment method", key: "paymentMethod", width: 20 }, { header: "Description", key: "description", width: 40 },
      { header: "Tags", key: "tags", width: 28 }
    ];
    for (const row of rows) {
      sheet.addRow({
        date: row.date.toISOString().slice(0, 10), type: row.type, amount: row.amountMinor / 100,
        currency: row.currency, category: row.category.name, subCategory: row.subCategory,
        paymentMethod: row.paymentMethod, description: row.description,
        tags: row.tags.map((item: { tag: { name: string } }) => item.tag.name).join(", ")
      });
    }
    const buffer = await workbook.xlsx.writeBuffer();
    res.type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
      .attachment("transactions.xlsx").send(Buffer.from(buffer));
  } catch (error) {
    next(error);
  }
});

router.post("/import/preview", (req, res) => {
  if (!Array.isArray(req.body.rows) || req.body.rows.length > 2000) {
    res.status(400).json({ error: "Provide up to 2,000 mapped transaction rows" });
    return;
  }
  const preview = req.body.rows.map((row: unknown, index: number) => {
    const parsed = transactionSchema.safeParse(row);
    return parsed.success
      ? { index, valid: true, transaction: parsed.data }
      : { index, valid: false, error: parsed.error.issues[0]?.message ?? "Invalid row" };
  });
  res.json({ preview, validCount: preview.filter((row: { valid: boolean }) => row.valid).length });
});

router.post("/import", async (req, res, next) => {
  if (!Array.isArray(req.body.rows) || req.body.rows.length > 2000) {
    res.status(400).json({ error: "Provide up to 2,000 transaction rows" });
    return;
  }
  const parsedRows = req.body.rows.map((row: unknown) => transactionSchema.safeParse(row));
  const invalid = parsedRows.findIndex((row: ReturnType<typeof transactionSchema.safeParse>) => !row.success);
  if (invalid >= 0) {
    res.status(400).json({ error: `Invalid transaction at row ${invalid + 1}` });
    return;
  }
  try {
    const saved: Array<Awaited<ReturnType<typeof createTransaction>>> = [];
    for (const parsed of parsedRows) {
      if (parsed.success) saved.push(await createTransaction(req.userId, parsed.data));
    }
    res.status(201).json({ imported: saved.length });
  } catch (error) {
    if (isPrismaError(error, "P2002")) {
      res.status(409).json({ error: "One or more imported transactions already exist" });
      return;
    }
    next(error);
  }
});

export default router;
