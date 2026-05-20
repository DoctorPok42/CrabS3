export type WebHookType = 'discord'

export interface DiscordWebHookPayload {
  content: string;
  username?: string;
  avatar_url?: string;
  embeds?: Array<{
    title?: string;
    description?: string;
    url?: string;
    color?: number;
    fields?: Array<{
      name: string;
      value: string;
      inline?: boolean;
    }>;
  }>;
}

class WebHookService {
  private readonly avatarUrl: string = "https://crabs3.doctorpok.io/favicon.png";
  private readonly username: string = "CrabS3 Notifications";
  private readonly colorStatusMap: Record<string, number> = {
    "File uploaded": 0x1abc9c,
    "File downloaded": 0x9b59b6,
    "File deleted": 0xe74c3c,
  };

  private static instance: WebHookService;
  private instanceType: WebHookType = 'discord';

  public getInstance(type: WebHookType): WebHookService {
    if (WebHookService.instance?.instanceType !== type) {
      WebHookService.instance = new WebHookService();
      WebHookService.instance.instanceType = type;
    }
    return WebHookService.instance;
  }

  public async sendWebHook(url: string, payload: DiscordWebHookPayload): Promise<void> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...payload,
          username: payload.username || this.username,
          avatar_url: payload.avatar_url || this.avatarUrl,
          embeds: payload.embeds?.map(embed => ({
            ...embed,
            color: embed.color || this.colorStatusMap[embed.title || ""] || 0xcccccc,
          })) || [],
        }),
      });
      if (!response.ok) {
        throw new Error(`Failed to send webhook: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error sending webhook:', error);
    }
  }
}

export default new WebHookService().getInstance('discord');
