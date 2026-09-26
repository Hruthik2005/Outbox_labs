import { apiClient } from './api-client';
import {
  ApiResponse,
  SenderDto,
  CreateSenderRequest,
  UpdateSenderRequest,
  TestSmtpRequest
} from '@reachinbox/shared';

export const senderApi = {
  async list(): Promise<SenderDto[]> {
    const res = await apiClient.get<ApiResponse<SenderDto[]>>('/senders');
    return res.data.data || [];
  },

  async testConnection(data: TestSmtpRequest): Promise<boolean> {
    const res = await apiClient.post<ApiResponse<{ connected: boolean }>>('/senders/test', data);
    return res.data.data?.connected || false;
  },

  async create(data: CreateSenderRequest): Promise<SenderDto> {
    const res = await apiClient.post<ApiResponse<SenderDto>>('/senders', data);
    return res.data.data!;
  },

  async update(id: string, data: UpdateSenderRequest): Promise<SenderDto> {
    const res = await apiClient.patch<ApiResponse<SenderDto>>(`/senders/${id}`, data);
    return res.data.data!;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/senders/${id}`);
  }
};
