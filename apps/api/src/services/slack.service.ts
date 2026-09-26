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
