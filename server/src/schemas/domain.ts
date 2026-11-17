import { z } from "zod";

export const transactionTypeSchema = z.enum(["EXPENSE", "INCOME"]);
export const paymentMethodSchema = z.enum(["CASH", "CARD", "BANK_TRANSFER", "WALLET"]);
export const frequencySchema = z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]);
export const currencySchema = z.enum(["AED", "USD", "EUR", "GBP", "INR", "SAR", "PKR", "CAD", "AUD", "CNY"]);

export const categorySchema = z.object({
  type: transactionTypeSchema,
  name: z.string().trim().min(1).max(40),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional()
});

export const transactionSchema = z.object({
  type: transactionTypeSchema,
  amountMinor: z.number().int().positive().max(2_000_000_000),
  currency: currencySchema.default("AED"),
  categoryId: z.string().min(1),
  subCategory: z.string().trim().max(60).optional().nullable(),
  date: z.coerce.date(),
  paymentMethod: paymentMethodSchema,
  description: z.string().trim().max(500).optional().nullable(),
  tags: z.array(z.string().trim().min(1).max(24)).max(12).default([]),
  recurrence: frequencySchema.optional(),
  recurrenceEndsAt: z.coerce.date().optional().nullable()
});

export const budgetSchema = z.object({
  categoryId: z.string().min(1).nullable().optional(),
  year: z.number().int().min(2000).max(2200),
  month: z.number().int().min(1).max(12),
  amountMinor: z.number().int().positive().max(2_000_000_000),
  currency: z.string().trim().length(3).default("AED")
});

export const goalSchema = z.object({
  name: z.string().trim().min(1).max(80),
  targetMinor: z.number().int().positive().max(2_000_000_000),
  currency: z.string().trim().length(3).default("AED"),
  targetDate: z.coerce.date().optional().nullable()
});

export const contributionSchema = z.object({
  amountMinor: z.number().int().positive().max(2_000_000_000),
  date: z.coerce.date().optional(),
  note: z.string().trim().max(250).optional().nullable()
});
