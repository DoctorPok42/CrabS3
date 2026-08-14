export type WebHookType = 'discord' | 'slack' | 'teams';

export type WebHookPayloadByType = {
  discord: DiscordWebHookPayload;
  slack: SlackWebHookPayload;
  teams: TeamsWebHookPayload;
};

export type WebHookPayload = WebHookPayloadByType[WebHookType];

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

export interface SlackWebHookPayload {
  text: string;
  blocks?: Array<{
    type: string;
    block_id?: string;
    text?: {
      type: string;
      text: string;
    };
    fields?: Array<{
      type: string;
      text: string;
    }>;
    accessory?: {
      type: string;
      image_url: string;
      alt_text: string;
    };
  }>;
}

export interface TeamsWebHookPayload {
  text: string;
  type: string;
  attachments: Array<{
    contentType: string;
    contentUrl?: string | null;
    content: TeamsAdaptiveCardPayload;
  }>,
  sections?: Array<{
    activityTitle?: string;
    activitySubtitle?: string;
    activityImage?: string;
    facts?: Array<{
      title: string;
      value: string;
    }>;
    potentialAction?: Array<{
      "@type": string;
      name: string;
      targets: Array<{
        os: string;
        uri: string;
      }>;
    }>;
  }>;
}

export interface TeamsAdaptiveCardPayload {
  $schema: string;
  type: 'AdaptiveCard';
  version: string;
  body: Array<TeamsAdaptiveCardBlock>;
}

export interface TeamsAdaptiveCardBlock {
  type: string;
  [key: string]: unknown;
}

class WebHookService {
  private readonly avatarUrl: string = "https://crabs3.doctorpok.io/icon0.svg";
  private readonly username: string = "CrabS3 Notifications";
  private readonly colorStatusMap: Record<string, number> = {
    "file uploaded": 0x1abc9c,
    "folder downloaded": 0x9b59b6,
    "file deleted": 0xe67e22,
    "virus detected": 0xe74c3c,
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

  private constructBody(payload: WebHookPayload): DiscordWebHookPayload | SlackWebHookPayload | TeamsAdaptiveCardPayload {
    switch (this.instanceType) {
      case 'discord':
        return {
          ...(payload as DiscordWebHookPayload),
          username: (payload as DiscordWebHookPayload).username || this.username,
          avatar_url: (payload as DiscordWebHookPayload).avatar_url || this.avatarUrl,
          embeds: (payload as DiscordWebHookPayload).embeds?.map(embed => ({
            ...embed,
            color: embed.color || this.colorStatusMap[embed.title?.toLocaleLowerCase() || ""] || 0xcccccc,
          })) || [],
        };
      case 'slack':
        return {
          ...(payload as SlackWebHookPayload),
        };
      case 'teams':
        return (payload as TeamsWebHookPayload).attachments?.[0]?.content ?? {
          $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
          type: "AdaptiveCard" as const,
          version: "1.2",
          body: (payload as TeamsWebHookPayload).attachments?.[0]?.content?.body,
        };
    }
  }

  public async sendWebHook(url: string, payload: WebHookPayload): Promise<void> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(this.constructBody(payload)),
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
