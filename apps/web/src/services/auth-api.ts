import { apiClient } from './api-client';
import { ApiResponse, UserProfile } from '@reachinbox/shared';

export const authApi = {
  async getGoogleUrl(): Promise<{ url: string; state: string }> {
    const res = await apiClient.get<ApiResponse<{ url: string; state: string }>>('/auth/google/url');
    return res.data.data!;
  },

  async getMe(): Promise<UserProfile> {
    const res = await apiClient.get<ApiResponse<UserProfile>>('/auth/me');
    return res.data.data!;
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
    localStorage.removeItem('reachinbox_token');
  }
};
