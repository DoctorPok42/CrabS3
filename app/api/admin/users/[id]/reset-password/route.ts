import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import bcrypt from "bcrypt";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user.isAdmin) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { pathname } = new URL(request.url);
    const id = Number(pathname.split("/").slice(-3)[1]);

    const { newPassword } = await request.json();
    if (typeof newPassword !== "string" || newPassword.length < 6) {
      return Response.json({ error: "Invalid password. Must be at least 6 characters long." }, { status: 400 });
    }

    const user = await prisma.users.findUnique({
      where: { id: id }
    });
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.users.update({
      where: { id: id },
      data: { passwordHash: hashedPassword },
    });

    return Response.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Error resetting password:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
