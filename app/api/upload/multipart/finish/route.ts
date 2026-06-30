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

  const { folderId } = await request.json();
  if (!folderId) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const files = await prisma.files.findMany({
      where: { folder_id: folderId, user_id: session.userId },
    });
    if (!files || files.length === 0) {
      return Response.json({ error: "Folder not found or unauthorized" }, { status: 404 });
    }

    (async () => {
      await log({
        action: LogAction.UPLOAD,
        level: LogLevel.INFO,
        message: `File${files.length > 1 ? 's' : ''} uploaded successfully`,
        userId: session.userId,
        meta: { folderId, fileCount: files.length, filesId: files.map((f) => `${f.id} | ${f.filename}`), ip: getIp(request) },
      });

      await sendNotificationEmail(session.email, folderId);
      if (files.some(file => file.email_recipient)) {
        await sendNotificationEmail(session.email, folderId);
      }

      await sendAllActiveCommunications(session.userId, {
        content: "",
        embeds: [
          {
            title: "File uploaded",
            description: `File${files.length > 1 ? 's' : ''} uploaded successfully!`,
            fields: [
              { name: "Folder ID", value: `\`${folderId}\``, inline: true },
              { name: "File Count", value: files.length.toString(), inline: true },
              { name: "Files ID", value: files.map((f) => `\`${f.id}\``).join("\n"), inline: false },
              { name: "Download Link", value: `${process.env.BASE_URL}/file/${folderId}`, inline: false },
              { name: "Sender Email", value: session.email, inline: true },
              { name: "IP Address", value: getIp(request), inline: true },
            ],
          },
        ],
      });
    })();

    return Response.json({ message: "Upload finished successfully" }, { status: 200 });
  } catch (error) {
    await prisma.files.deleteMany({
      where: { folder_id: folderId, user_id: session.userId },
    });

    await log({
      action: LogAction.UPLOAD,
      level: LogLevel.ERROR,
      message: `Error completing multipart upload: ${error}`,
      userId: session.userId,
      meta: { folderId, ip: getIp(request) },
    });
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
