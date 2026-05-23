import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";
import { log } from "@/services/log.service";
import { LogAction, LogLevel } from "@/types/log.types";

export async function POST(request: Request) {
  const { secretId, password } = await request.json();

  if (!secretId || typeof secretId !== 'string') {
    return new Response(JSON.stringify({ error: 'Invalid input' }), { status: 400 });
  }

  await log({
    level: LogLevel.DEBUG,
    action: LogAction.UPLOAD,
    message: "Secret retrieval request",
    meta: { secretId, hasPassword: !!password }
  });

  try {
    const secret = await prisma.secrets.findUnique({
      where: { id: secretId },
    });
    if (!secret) {
      return new Response(JSON.stringify({ error: 'Secret not found' }), { status: 404 });
    }

    if (secret.expires_at! < new Date()) {
      return new Response(JSON.stringify({ error: 'Secret has expired' }), { status: 410 });
    }

    if (secret.view_count! >= secret.max_views!) {
      return new Response(JSON.stringify({ error: 'Secret has been viewed too many times' }), { status: 410 });
    }

    if (secret.password_hash) {
      if (!password || typeof password !== 'string') {
        return new Response(JSON.stringify({ error: 'Password is required' }), { status: 400 });
      }

      const isPasswordValid = await bcrypt.compare(password, secret.password_hash);
      if (!isPasswordValid) {
        return new Response(JSON.stringify({ error: 'Incorrect password' }), { status: 401 });
      }
    }

    const newCount = secret.view_count! + 1
    if (newCount >= secret.max_views) {
      await prisma.secrets.delete({
        where: { id: secretId },
      });
    } else {
      await prisma.secrets.update({
        where: { id: secretId },
        data: { view_count: newCount },
      });
    }

    return new Response(JSON.stringify({ content: secret.content }), { status: 200 });
  } catch (error) {
    console.error('Error retrieving secret:', error);
    await log({
      level: LogLevel.ERROR,
      action: LogAction.UPLOAD,
      message: 'Failed to retrieve secret',
      meta: { error: error instanceof Error ? error.message : String(error) }
    });
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}
