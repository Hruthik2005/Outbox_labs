import { WebClient } from '@slack/web-api';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

export function generateSlackAuthUrl(state: string): string {
  const scopes = ['chat:write', 'incoming-webhook'];
  const params = new URLSearchParams({
    client_id: env.SLACK_CLIENT_ID,
    scope: scopes.join(','),
    redirect_uri: env.SLACK_CALLBACK_URL,
    state
  });
  return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
}

export interface SlackTokenResponse {
  teamId: string;
  teamName: string;
  accessToken: string;
  scopes: string;
  channelId?: string;
  channelName?: string;
  webhookUrl?: string;
}

export async function exchangeSlackCode(code: string): Promise<SlackTokenResponse> {
  const client = new WebClient();
  const res = await client.oauth.v2.access({
    client_id: env.SLACK_CLIENT_ID,
    client_secret: env.SLACK_CLIENT_SECRET,
    code,
    redirect_uri: env.SLACK_CALLBACK_URL
  });

  if (!res.ok || !res.access_token) {
    logger.error({ res }, 'Slack OAuth code exchange failed');
    throw new Error(`Slack OAuth error: ${res.error || 'Failed to exchange authorization code'}`);
  }

  return {
    teamId: res.team?.id || '',
    teamName: res.team?.name || 'Slack Workspace',
    accessToken: res.access_token,
    scopes: res.scope || 'chat:write',
    channelId: res.incoming_webhook?.channel_id,
    channelName: res.incoming_webhook?.channel,
    webhookUrl: res.incoming_webhook?.url
  };
}

export async function postSlackMessage(
  accessToken: string,
  channelId: string,
  text: string,
  blocks?: unknown[]
): Promise<boolean> {
  try {
    const client = new WebClient(accessToken);
    await client.chat.postMessage({
      channel: channelId,
      text,
      // @ts-expect-error Slack web api blocks typing
      blocks
    });
    return true;
  } catch (error) {
    logger.error({ error, channelId }, 'Failed to post Slack message');
    return false;
  }
}
