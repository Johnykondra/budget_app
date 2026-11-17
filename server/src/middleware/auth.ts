import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

type TokenPayload = jwt.JwtPayload & { sub: string };

export function signToken(userId: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 24) {
    throw new Error("JWT_SECRET must be set to at least 24 characters");
  }
  return jwt.sign({ sub: userId }, secret, { expiresIn: "7d" });
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authorization = req.header("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
  const secret = process.env.JWT_SECRET;

  if (!token || !secret || secret.length < 24) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const payload = jwt.verify(token, secret);
    if (typeof payload === "string" || typeof payload.sub !== "string") {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }
    req.userId = (payload as TokenPayload).sub;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
