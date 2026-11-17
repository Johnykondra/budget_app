import { RecurrenceFrequency } from "@prisma/client";
import { prisma } from "../prisma";
import { isPrismaError } from "../middleware/prismaErrors";

export function advanceDate(date: Date, frequency: RecurrenceFrequency): Date {
  const next = new Date(date);
  if (frequency === "DAILY") next.setDate(next.getDate() + 1);
  if (frequency === "WEEKLY") next.setDate(next.getDate() + 7);
  if (frequency === "MONTHLY") {
    const day = next.getDate();
    next.setDate(1);
    next.setMonth(next.getMonth() + 1);
    const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    next.setDate(Math.min(day, lastDay));
  }
  if (frequency === "YEARLY") {
    const month = next.getMonth();
    const day = next.getDate();
    next.setDate(1);
    next.setFullYear(next.getFullYear() + 1);
    next.setMonth(month);
    next.setDate(Math.min(day, new Date(next.getFullYear(), month + 1, 0).getDate()));
  }
  return next;
}

export async function generateDueTransactions(now = new Date()): Promise<number> {
  const dueRules = await prisma.recurringRule.findMany({
    where: { isActive: true, nextRunAt: { lte: now } },
    take: 100,
    orderBy: { nextRunAt: "asc" }
  });
  let generated = 0;
  for (const rule of dueRules) {
    const current = await prisma.recurringRule.findFirst({
        where: { id: rule.id, userId: rule.userId, isActive: true, nextRunAt: { lte: now } }
    });
    if (!current) continue;
    let nextRunAt = current.nextRunAt;
    let count = 0;
    while (nextRunAt <= now && count < 366) {
      if (!current.endsAt || nextRunAt <= current.endsAt) {
        try {
          await prisma.transaction.create({
            data: {
              userId: current.userId,
              categoryId: current.categoryId,
              recurringRuleId: current.id,
              type: current.type,
              amountMinor: current.amountMinor,
              currency: current.currency,
              subCategory: current.subCategory,
              date: nextRunAt,
              occurrenceDate: nextRunAt,
              paymentMethod: current.paymentMethod,
              description: current.description
            }
        });
        generated += 1;
        } catch (error) {
        if (!isPrismaError(error, "P2002")) throw error;
        }
      }
      nextRunAt = advanceDate(nextRunAt, current.frequency);
      count += 1;
    }
    await prisma.recurringRule.update({
        where: { id: current.id },
        data: { nextRunAt, isActive: !current.endsAt || nextRunAt <= current.endsAt }
    });
  }
  return generated;
}
