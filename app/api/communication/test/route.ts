import { getSession } from "@/lib/auth";
import { sendOneCommunication } from "@/lib/webhook";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const userId = session.user?.id;
    const requestBody = await request.json();
    const { type } = requestBody;
    if (!type) {
      return new Response(JSON.stringify({ error: "Missing type" }), { status: 400 });
    }

    const payload = {
      content: "",
      embeds: [
        {
          title: "Test Communication",
          description: `This is a test message sent from CrabS3 for ${type} webhook.`,
        },
      ],
      text: `This is a test message sent from CrabS3 for ${type} webhook.`,
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
                text: `This is a test message sent from CrabS3 for ${type} webhook.`,
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
            text: `*Test Communication*`,
          },
        },
      ],
      sections: [
        {
          activityTitle: "Test Communication",
          activitySubtitle: `This is a test message sent from CrabS3 for ${type} webhook.`,
        },
      ],
    }

    sendOneCommunication(userId, type, payload);

    return new Response(JSON.stringify({ message: "Test communication sent successfully" }), { status: 200 });
  } catch (error) {
    console.error("Error sending test communication:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}
