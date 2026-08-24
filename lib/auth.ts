import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import bcrypt from "bcrypt";
import { Settings } from "@/services/settings.service";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: number, email: string, isAdmin: boolean) {
  const expiresAtSetting = await Settings.sessionDurationHours() * 60 * 60 * 1000;
  const expiresAt = new Date(Date.now() + (expiresAtSetting || 48 * 60 * 60 * 1000));

  const session = await prisma.session.create({
    data: { userId, expiresAt, email, isAdmin },
  });

  const cookieStore = await cookies();
  cookieStore.set("session", session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });

  return session;
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await prisma.session.delete({ where: { token } });
    }

    cookieStore.set("session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: new Date(0),
    });
    return null;
  }

  return session;
}

export async function deleteSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { token } });
    cookieStore.delete("session");
  }
}
