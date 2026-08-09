import webhookService, { DiscordWebHookPayload, SlackWebHookPayload, TeamsWebHookPayload, WebHookType } from "@/services/webhook.service";
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

export async function sendAllActiveCommunications(userId: number, payload: DiscordWebHookPayload | SlackWebHookPayload | TeamsWebHookPayload) {
  const user = await getActiveCommunication(userId);
  if (!user) return;

  const communications = user.communications;
  if (!communications || communications.length === 0) return;

  for (const communication of communications) {
    await webhookService.getInstance(communication.type as WebHookType).sendWebHook(communication.url, payload);
  }
}

export async function createCommunication(userId: number, type: WebHookType, url: string) {
  if (!userId || !type || !url) return null;

  return await prisma.communication.upsert({
    where: { user_id_type: { user_id: userId, type } },
    update: {
      url,
      active: true,
    },
    create: {
      type,
      url,
      user_id: userId,
      active: true,
    }
  })
}

export async function deleteCommunication(communicationId: number) {
  return await prisma.communication.update({
    where: { id: communicationId },
    data: { active: false, url: "" }
  })
}
