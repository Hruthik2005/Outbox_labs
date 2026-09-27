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

  async register(data: { name: string; email: string; password: string }): Promise<{ token: string; user: UserProfile }> {
    const res = await apiClient.post<ApiResponse<{ token: string; user: UserProfile }>>('/auth/register', data);
    if (res.data.data?.token) {
      localStorage.setItem('reachinbox_token', res.data.data.token);
    }
    return res.data.data!;
  },

  async login(data: { email: string; password: string }): Promise<{ token: string; user: UserProfile }> {
    const res = await apiClient.post<ApiResponse<{ token: string; user: UserProfile }>>('/auth/login', data);
    if (res.data.data?.token) {
      localStorage.setItem('reachinbox_token', res.data.data.token);
    }
    return res.data.data!;
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
    localStorage.removeItem('reachinbox_token');
  }
};
