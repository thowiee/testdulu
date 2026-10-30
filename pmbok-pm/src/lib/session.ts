import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "./db";

const COOKIE_NAME = "pm_session";
const SESSION_SECRET = process.env.SESSION_SECRET ?? "pmbok-pm-demo-secret";
const MAX_AGE_SECONDS = 60 * 60 * 12;

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  jobTitle: string | null;
  initials: string;
  color: string;
};

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 32).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, digest] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !digest) return false;
  const derived = scryptSync(password, salt, 32);
  const expected = Buffer.from(digest, "hex");
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

function signPayload(userId: string): string {
  return createHmac("sha256", SESSION_SECRET).update(userId).digest("hex").slice(0, 32);
}

export async function createSession(userId: string): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NAME, `${userId}.${signPayload(userId)}`, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionUser | null> {
  const raw = (await cookies()).get(COOKIE_NAME)?.value;
  if (!raw) return null;

  const [userId, signature] = raw.split(".");
  if (!userId || !signature || signature !== signPayload(userId)) return null;

  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, jobTitle: true, initials: true, color: true },
  });
}
