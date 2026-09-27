import { apiClient } from './api-client';
import { ApiResponse, SlackConnectionDto } from '@reachinbox/shared';

export const slackApi = {
  async getConnectUrl(): Promise<{ url: string; state: string }> {
    const res = await apiClient.get<ApiResponse<{ url: string; state: string }>>('/slack/connect');
    return res.data.data!;
  },

  async getStatus(): Promise<{ connected: boolean; connection?: SlackConnectionDto }> {
    const res = await apiClient.get<ApiResponse<{ connected: boolean; connection?: SlackConnectionDto }>>('/slack/status');
    return res.data.data!;
  },

  async disconnect(): Promise<void> {
    await apiClient.post('/slack/disconnect');
  },

  async sendTestAlert(): Promise<{ message: string }> {
    const res = await apiClient.post<ApiResponse<{ message: string }>>('/slack/test');
    return res.data.data!;
  }
};
