import { apiClient } from './api-client';
import {
  ApiResponse,
  EmailDto,
  ScheduleEmailRequest,
  DashboardMetrics,
  EmailQueryParams
} from '@reachinbox/shared';

export const emailApi = {
  async scheduleEmails(data: ScheduleEmailRequest) {
    const res = await apiClient.post<ApiResponse<{ campaignId: string; scheduledCount: number }>>(
      '/emails/schedule',
      data
    );
    return res.data.data!;
  },

  async getScheduled(params?: EmailQueryParams) {
    const res = await apiClient.get<ApiResponse<EmailDto[]>>('/emails/scheduled', { params });
    return {
      items: res.data.data || [],
      meta: res.data.meta
    };
  },

  async getSent(params?: EmailQueryParams) {
    const res = await apiClient.get<ApiResponse<EmailDto[]>>('/emails/sent', { params });
    return {
      items: res.data.data || [],
      meta: res.data.meta
    };
  },

  async getEmailById(id: string): Promise<EmailDto> {
    const res = await apiClient.get<ApiResponse<EmailDto>>(`/emails/${id}`);
    return res.data.data!;
  },

  async cancelEmail(id: string): Promise<void> {
    await apiClient.post(`/emails/${id}/cancel`);
  },

  async getMetrics(): Promise<DashboardMetrics> {
    const res = await apiClient.get<ApiResponse<DashboardMetrics>>('/emails/metrics');
    return res.data.data!;
  },

  async searchEmails(query: string, page = 1, limit = 20) {
    const res = await apiClient.get<ApiResponse<EmailDto[]>>('/search/emails', {
      params: { q: query, page, limit }
    });
    return {
      items: res.data.data || [],
      meta: res.data.meta
    };
  }
};
