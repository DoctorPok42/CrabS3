import { getSession } from "@/lib/auth";
import { getIp } from "@/lib/ip";
import prisma from "@/lib/prisma";
import { sendAllActiveCommunications } from "@/lib/webhook";
import { log } from "@/services/log.service";
import { sendNotificationEmail } from "@/services/mail.service";
import { LogAction, LogLevel } from "@/types/log.types";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { folderId, folderName } = await request.json();
  if (!folderId) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const files = await prisma.files.findMany({
      where: { folder_id: folderId, user_id: session.user.id },
    });
    if (!files || files.length === 0) {
      return Response.json({ error: "Folder not found or unauthorized" }, { status: 404 });
    }

    (async () => {
      await log({
        action: LogAction.UPLOAD,
        level: LogLevel.INFO,
        message: `File${files.length > 1 ? 's' : ''} uploaded successfully`,
        userId: session.user.id,
        meta: { folderName, folderId, fileCount: files.length, filesId: files.map((f) => `${f.id} | ${f.filename}`), ip: getIp(request) },
      });

      await sendNotificationEmail(session.user.email, folderId);
      if (files.some(file => file.email_recipient)) {
        await sendNotificationEmail(session.user.email, folderId);
      }

      await sendAllActiveCommunications(session.user.id, {
        content: "",
        embeds: [
          {
            title: "File uploaded",
            description: `File${files.length > 1 ? 's' : ''} uploaded successfully!`,
            fields: [
              { name: "Folder ID", value: `\`${folderId}\``, inline: true },
              { name: "Folder Name", value: `\`${folderName}\``, inline: true },
              { name: "File Count", value: files.length.toString(), inline: true },
              { name: "Files ID", value: files.map((f) => `\`${f.id}\``).join("\n"), inline: false },
              { name: "Download Link", value: `${process.env.NEXT_PUBLIC_BASE_URL}/file/${folderId}`, inline: false },
              { name: "Sender Email", value: session.user.email, inline: true },
              { name: "IP Address", value: getIp(request), inline: true },
            ],
          },
        ],
        text: `File${files.length > 1 ? 's' : ''} uploaded successfully`,
        attachments: [
          {
            contentType: "application/vnd.microsoft.card.adaptive",
            content: {
              "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
              type: "AdaptiveCard",
              version: "1.2",
              body: [
                {
                  type: "TextBlock",
                  text: `File${files.length > 1 ? 's' : ''} uploaded successfully!`,
                },
                {
                  type: "FactSet",
                  facts: [
                    { title: "Folder ID", value: `\`${folderId}\`` },
                    { title: "Folder Name", value: `\`${folderName}\`` },
                    { title: "File Count", value: files.length.toString() },
                    { title: "Files ID", value: files.map((f) => `\`${f.id}\``).join("\n") },
                    { title: "Download Link", value: `${process.env.NEXT_PUBLIC_BASE_URL}/file/${folderId}` },
                    { title: "Sender Email", value: session.user.email },
                    { title: "IP Address", value: getIp(request) },
                  ],
                },
              ],
            },
          },
        ],
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*File${files.length > 1 ? 's' : ''} uploaded successfully!`,
            },
          },
          {
            type: "section",
            fields: [
              { type: "mrkdwn", text: `*Folder ID:*\n\`${folderId}\`` },
              { type: "mrkdwn", text: `*Folder Name:*\n\`${folderName}\`` },
              { type: "mrkdwn", text: `*File Count:*\n${files.length}` },
              { type: "mrkdwn", text: `*Files ID:*\n${files.map((f) => `\`${f.id}\``).join("\n")}` },
              { type: "mrkdwn", text: `*Download Link:*\n${process.env.NEXT_PUBLIC_BASE_URL}/file/${folderId}` },
              { type: "mrkdwn", text: `*Sender Email:*\n${session.user.email}` },
              { type: "mrkdwn", text: `*IP Address:*\n${getIp(request)}` },
            ],
          },
        ],
        sections: [
          {
            activityTitle: "File uploaded",
            activitySubtitle: `File${files.length > 1 ? 's' : ''} uploaded successfully!`,
            facts: [
              { title: "Folder ID", value: `\`${folderId}\`` },
              { title: "Folder Name", value: `\`${folderName}\`` },
              { title: "File Count", value: files.length.toString() },
              { title: "Files ID", value: files.map((f) => `\`${f.id}\``).join("\n") },
              { title: "Download Link", value: `${process.env.NEXT_PUBLIC_BASE_URL}/file/${folderId}` },
              { title: "Sender Email", value: session.user.email },
              { title: "IP Address", value: getIp(request) },
            ],
          },
        ],
      });
    })();

    return Response.json({ message: "Upload finished successfully" }, { status: 200 });
  } catch (error) {
    await prisma.files.deleteMany({
      where: { folder_id: folderId, user_id: session.user.id },
    });

    await log({
      action: LogAction.UPLOAD,
      level: LogLevel.ERROR,
      message: `Error completing multipart upload: ${error}`,
      userId: session.user.id,
      meta: { folderId, ip: getIp(request) },
    });
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
