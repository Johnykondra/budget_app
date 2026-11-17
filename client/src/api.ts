import axios from "axios";
import { z } from "zod";

export const api = axios.create({ baseURL: "/api" });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("budget-token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const currencyOptions = [
  { code: "AED", label: "AED - UAE dirham" },
  { code: "USD", label: "USD - US dollar" },
  { code: "EUR", label: "EUR - Euro" },
  { code: "GBP", label: "GBP - Pound sterling" },
  { code: "INR", label: "INR - Indian rupee" },
  { code: "SAR", label: "SAR - Saudi riyal" },
  { code: "PKR", label: "PKR - Pakistani rupee" },
  { code: "CAD", label: "CAD - Canadian dollar" },
  { code: "AUD", label: "AUD - Australian dollar" },
  { code: "CNY", label: "CNY - Chinese yuan" }
] as const;

export const transactionFormSchema = z.object({
  type: z.enum(["EXPENSE", "INCOME"]),
  amount: z.coerce.number().positive("Enter an amount above zero"),
  currency: z.enum(["AED", "USD", "EUR", "GBP", "INR", "SAR", "PKR", "CAD", "AUD", "CNY"]).default("AED"),
  categoryId: z.string().min(1, "Choose a category"),
  date: z.string().min(1, "Choose a date"),
  paymentMethod: z.enum(["CASH", "CARD", "BANK_TRANSFER", "WALLET"]),
  subCategory: z.string().max(60).optional(),
  description: z.string().max(500).optional(),
  tags: z.string().optional()
});

export const authFormSchema = z.object({
  email: z.string().trim().email("Enter a valid email address").max(254),
  password: z.string().min(8, "Password must be at least 8 characters").max(72)
});
export const categoryFormSchema = z.object({
  name: z.string().trim().min(1, "Enter a category name").max(40),
  type: z.enum(["EXPENSE", "INCOME"]),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/)
});
export const budgetFormSchema = z.object({
  categoryId: z.string(),
  amount: z.coerce.number().positive("Enter a budget amount above zero")
});
export const goalFormSchema = z.object({
  name: z.string().trim().min(1, "Enter a goal name").max(80),
  target: z.coerce.number().positive("Enter a target above zero"),
  targetDate: z.string()
});
export const contributionFormSchema = z.object({
  amount: z.coerce.number().positive("Enter a contribution above zero")
});

export type Transaction = {
  id: string;
  type: "EXPENSE" | "INCOME";
  amountMinor: number;
  currency: string;
  categoryId: string;
  category: { id: string; name: string; color: string };
  subCategory?: string | null;
  date: string;
  paymentMethod: string;
  description?: string | null;
  tags: Array<{ tag: { name: string } }>;
  receiptPath?: string | null;
};

export type Category = {
  id: string;
  type: "EXPENSE" | "INCOME";
  name: string;
  color: string;
  isDefault: boolean;
};

export type Budget = {
  id: string;
  categoryId: string | null;
  category?: { name: string; color: string } | null;
  year: number;
  month: number;
  amountMinor: number;
  spentMinor: number;
  percent: number;
  warning: "OVER_BUDGET" | "NEAR_LIMIT" | null;
  currency: string;
};

export type Goal = {
  id: string;
  name: string;
  targetMinor: number;
  contributedMinor: number;
  progress: number;
  targetDate?: string | null;
  contributions: Array<{ id: string; amountMinor: number; date: string; note?: string | null }>;
  currency: string;
};

export function money(minor: number, currency = "AED"): string {
  return new Intl.NumberFormat("en-AE", {
    style: "currency", currency, maximumFractionDigits: 2
  }).format(minor / 100);
}

export function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.error ?? error.message;
  }
  return error instanceof Error ? error.message : "Something went wrong";
}
