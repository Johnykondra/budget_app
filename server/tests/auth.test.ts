import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/prisma";

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const email = `auth-test-${suffix}@example.com`;

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email } });
  await prisma.$disconnect();
});

describe("authentication API", () => {
  it("registers, authenticates, and returns the current user", async () => {
    const registration = await request(app)
      .post("/api/auth/register")
      .send({ email, password: "A-secure-pass-123" });

    expect(registration.status).toBe(201);
    expect(registration.body.user.email).toBe(email);
    expect(typeof registration.body.token).toBe("string");

    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: email.toUpperCase(), password: "A-secure-pass-123" });

    expect(login.status).toBe(200);
    const me = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${login.body.token}`);
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(email);
  });

  it("rejects invalid credentials and unauthenticated profile requests", async () => {
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email, password: "incorrect-password" });
    expect(login.status).toBe(401);

    const me = await request(app).get("/api/auth/me");
    expect(me.status).toBe(401);
  });
});
