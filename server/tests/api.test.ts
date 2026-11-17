import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/prisma";

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const emailA = `data-a-${suffix}@example.com`;
const emailB = `data-b-${suffix}@example.com`;

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: [emailA, emailB] } } });
  await prisma.$disconnect();
});

describe("tenant-scoped finance APIs", () => {
  it("creates transactions and prevents another account from reading or using their categories", async () => {
    const accountA = await request(app).post("/api/auth/register").send({ email: emailA, password: "A-secure-pass-123" });
    const accountB = await request(app).post("/api/auth/register").send({ email: emailB, password: "A-secure-pass-123" });
    expect(accountA.status).toBe(201);
    expect(accountB.status).toBe(201);

    const categories = await request(app)
      .get("/api/categories")
      .set("Authorization", `Bearer ${accountA.body.token}`);
    const rent = categories.body.categories.find((category: { name: string; type: string }) => category.name === "Rent" && category.type === "EXPENSE");
    const created = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${accountA.body.token}`)
      .send({
        type: "EXPENSE", amountMinor: 1250, currency: "AED", categoryId: rent.id,
        date: "2026-01-03T12:00:00.000Z", paymentMethod: "CARD", description: "Test lunch", tags: ["test"]
      });

    expect(created.status).toBe(201);
    const usdTransaction = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${accountA.body.token}`)
      .send({
        type: "EXPENSE", amountMinor: 1250, currency: "USD", categoryId: rent.id,
        date: "2026-01-04T12:00:00.000Z", paymentMethod: "CARD", description: "USD transaction"
      });
    expect(usdTransaction.status).toBe(201);

    const unsupportedCurrency = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${accountA.body.token}`)
      .send({
        type: "EXPENSE", amountMinor: 1250, currency: "ZZZ", categoryId: rent.id,
        date: "2026-01-05T12:00:00.000Z", paymentMethod: "CARD"
      });
    expect(unsupportedCurrency.status).toBe(400);

    const otherAccountList = await request(app)
      .get("/api/transactions")
      .set("Authorization", `Bearer ${accountB.body.token}`);
    expect(otherAccountList.body.total).toBe(0);

    const crossAccountCreate = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${accountB.body.token}`)
      .send({
        type: "EXPENSE", amountMinor: 1250, currency: "AED", categoryId: rent.id,
        date: "2026-01-03T12:00:00.000Z", paymentMethod: "CARD", description: "Not allowed"
      });
    expect(crossAccountCreate.status).toBe(400);

    const crossAccountDelete = await request(app)
      .delete(`/api/categories/${rent.id}`)
      .set("Authorization", `Bearer ${accountB.body.token}`);
    expect(crossAccountDelete.status).toBe(404);
  });
});
