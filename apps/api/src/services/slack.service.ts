import crypto from 'crypto';
import { prisma } from '../config/database.js';
import { generateSlackAuthUrl, exchangeSlackCode } from '../integrations/slack/slack-oauth.client.js';
import { encrypt, decrypt } from '../utils/crypto.js';
import { SlackConnectionDto } from '@reachinbox/shared';

export class SlackService {
  private stateCache = new Set<string>();

  getSlackConnectUrl(userId: string): { url: string; state: string } {
    const rawState = `${userId}:${crypto.randomBytes(16).toString('hex')}`;
    this.stateCache.add(rawState);

    setTimeout(() => this.stateCache.delete(rawState), 10 * 60 * 1000);

    const url = generateSlackAuthUrl(rawState);
    return { url, state: rawState };
  }

  async handleSlackCallback(code: string, state: string): Promise<SlackConnectionDto> {
    if (!state || !this.stateCache.has(state)) {
      throw new Error('Invalid or expired Slack OAuth state');
    }
    this.stateCache.delete(state);

    const [userId] = state.split(':');
    if (!userId) {
      throw new Error('Invalid state payload');
    }

    const tokenData = await exchangeSlackCode(code);
    const encryptedAccessToken = encrypt(tokenData.accessToken);

    const connection = await prisma.slackConnection.upsert({
      where: { userId },
      update: {
        teamId: tokenData.teamId,
        teamName: tokenData.teamName,
        channelId: tokenData.channelId,
        channelName: tokenData.channelName,
        encryptedAccessToken,
        scopes: tokenData.scopes,
        updatedAt: new Date()
      },
      create: {
        userId,
        teamId: tokenData.teamId,
        teamName: tokenData.teamName,
        channelId: tokenData.channelId,
        channelName: tokenData.channelName,
        encryptedAccessToken,
        scopes: tokenData.scopes
      }
    });

    return {
      id: connection.id,
      userId: connection.userId,
      teamId: connection.teamId,
      teamName: connection.teamName,
      scopes: connection.scopes,
      connectedAt: connection.connectedAt.toISOString(),
      updatedAt: connection.updatedAt.toISOString()
    };
  }

  async getConnectionStatus(userId: string): Promise<{ connected: boolean; connection?: SlackConnectionDto }> {
    const connection = await prisma.slackConnection.findUnique({
      where: { userId }
    });

    if (!connection) {
      return { connected: false };
    }

    return {
      connected: true,
      connection: {
        id: connection.id,
        userId: connection.userId,
        teamId: connection.teamId,
        teamName: connection.teamName,
        scopes: connection.scopes,
        connectedAt: connection.connectedAt.toISOString(),
        updatedAt: connection.updatedAt.toISOString()
      }
    };
  }

  async disconnect(userId: string): Promise<boolean> {
    const connection = await prisma.slackConnection.findUnique({ where: { userId } });
    if (!connection) return false;

    await prisma.slackConnection.delete({ where: { userId } });
    return true;
  }

  async sendTestNotification(userId: string): Promise<{ success: boolean; message: string }> {
    const connection = await prisma.slackConnection.findUnique({ where: { userId } });
    if (!connection) {
      return { success: false, message: 'No Slack workspace connected for this user' };
    }

    try {
      const accessToken = decrypt(connection.encryptedAccessToken);
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const userEmail = user?.email || 'vvce23cse0102@vvce.ac.in';
      const text = `✅ ReachInbox Slack Integration Verified for ${userEmail}`;

      const blocks = [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🔔 ReachInbox Slack Integration Test',
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Status:*\n✅ Connected & Verified`
            },
            {
              type: 'mrkdwn',
              text: `*Target Account:*\n${userEmail}`
            },
            {
              type: 'mrkdwn',
              text: `*Workspace:*\n${connection.teamName}`
            },
            {
              type: 'mrkdwn',
              text: `*Channel:*\n${connection.channelName || connection.channelId || '#general'}`
            }
          ]
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: '⚡ Real-time alerts will automatically notify this channel when email rate limits are triggered.'
            }
          ]
        }
      ];

      if (accessToken.startsWith('http')) {
        await fetch(accessToken, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, blocks })
        });
      } else {
        const { WebClient } = await import('@slack/web-api');
        const client = new WebClient(accessToken);
        const channel = connection.channelId || '#general';
        await client.chat.postMessage({
          channel,
          text,
          blocks: blocks as never
        });
      }

      return { success: true, message: `Test message posted to Slack workspace (${connection.teamName})` };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return { success: false, message: `Slack delivery failed: ${errorMsg}` };
    }
  }

  async connectWebhook(userId: string, webhookUrl: string, channelName?: string): Promise<SlackConnectionDto> {
    const encryptedAccessToken = encrypt(webhookUrl);
    const connection = await prisma.slackConnection.upsert({
      where: { userId },
      update: {
        teamId: 'webhook_team',
        teamName: 'Custom Slack Workspace',
        channelId: channelName || '#general',
        channelName: channelName || '#general',
        encryptedAccessToken,
        scopes: 'incoming-webhook',
        updatedAt: new Date()
      },
      create: {
        userId,
        teamId: 'webhook_team',
        teamName: 'Custom Slack Workspace',
        channelId: channelName || '#general',
        channelName: channelName || '#general',
        encryptedAccessToken,
        scopes: 'incoming-webhook'
      }
    });

    return {
      id: connection.id,
      userId: connection.userId,
      teamId: connection.teamId,
      teamName: connection.teamName,
      scopes: connection.scopes,
      connectedAt: connection.connectedAt.toISOString(),
      updatedAt: connection.updatedAt.toISOString()
    };
  }

  async getDecryptedToken(userId: string) {
    const connection = await prisma.slackConnection.findUnique({ where: { userId } });
    if (!connection) return null;

    return {
      accessToken: decrypt(connection.encryptedAccessToken),
      channelId: connection.channelId,
      teamName: connection.teamName
    };
  }
}

export const slackService = new SlackService();
