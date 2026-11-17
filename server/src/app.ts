import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import authRouter from "./routes/auth";
import categoriesRouter from "./routes/categories";
import transactionsRouter from "./routes/transactions";
import budgetsRouter from "./routes/budgets";
import reportsRouter from "./routes/reports";
import goalsRouter from "./routes/goals";
import { errorHandler, notFound } from "./middleware/errors";

export const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173" }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});
app.use("/api/auth", authRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/transactions", transactionsRouter);
app.use("/api/budgets", budgetsRouter);
app.use("/api/goals", goalsRouter);
app.use("/api/reports", reportsRouter);
app.use(notFound);
app.use(errorHandler);
