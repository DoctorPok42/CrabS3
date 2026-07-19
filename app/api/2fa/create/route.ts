import { generateTwoFactorSecret } from "@/lib/2fa";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const body = await request.json();
    const { email } = body;

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), { status: 400 });
    }

    const user = await prisma.users.findUnique({
      where: { email },
    });
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
    }

    const { secret, uri } = generateTwoFactorSecret(email);
    if (!secret || !uri) {
      return new Response(JSON.stringify({ error: 'Failed to generate 2FA secret' }), { status: 500 });
    }

    await prisma.users.update({
      where: { email },
      data: { twoFactorEnabled: true, twoFactorSecret: secret },
    });

    return new Response(JSON.stringify({ message: '2FA secret generated successfully', secret, uri }), { status: 200 });
  } catch (error) {
    console.error('Error in 2FA creation route:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}