import webhookService, { DiscordWebHookPayload, WebHookType } from "@/services/webhook.service";
import prisma from "./prisma";

export async function getActiveCommunication(userId: number) {
  return await prisma.users.findUnique(
    {
      where: { id: userId },
      select: {
        communications: {
          where: { active: true },
        }
      }
    }
  )
}

export async function sendAllActiveCommunications(userId: number, payload: DiscordWebHookPayload) {
  const user = await getActiveCommunication(userId);
  if (!user) return;

  const communications = user.communications;
  if (!communications || communications.length === 0) return;

  for (const communication of communications) {
    await webhookService.getInstance(communication.type as WebHookType).sendWebHook(communication.url, payload);
  }
}

export async function createCommunication(userId: number, type: WebHookType, url: string) {
  return await prisma.communication.upsert({
    where: { user_id_type: { user_id: userId, type } },
    update: {
      url,
    },
    create: {
      type,
      url,
      user_id: userId,
    }
  })
}

export async function deleteCommunication(communicationId: number) {
  return await prisma.communication.update({
    where: { id: communicationId },
    data: { active: false, url: "" }
  })
}
