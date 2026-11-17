import { app } from "./app";
import { prisma } from "./prisma";
import { generateDueTransactions } from "./services/recurring";

const port = Number(process.env.PORT ?? 4000);
const server = app.listen(port, () => {
  console.log(`Budget Tracker API listening on http://localhost:${port}`);
  void generateDueTransactions().catch((error: unknown) => console.error("Recurring transaction generation failed", error));
});
const recurringTimer = setInterval(() => {
  void generateDueTransactions().catch((error: unknown) => console.error("Recurring transaction generation failed", error));
}, 60_000);

async function shutdown(): Promise<void> {
  clearInterval(recurringTimer);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
