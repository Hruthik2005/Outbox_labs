import { EmailStatus, CampaignStatus, EmailEventType, OutboxEventType } from '../constants/index.js';

export interface UserProfile {
  id: string;
  googleId?: string | null;
  name: string;
  email: string;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SenderDto {
  id: string;
  userId: string;
  name: string;
  email: string;
  host: string;
  port: number;
  hourlyLimit: number;
  minimumDelaySeconds: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignDto {
  id: string;
  userId: string;
  senderId: string;
  subject: string;
  body: string;
  startAt: string;
  minimumDelaySeconds: number;
  hourlyLimit: number;
  totalRecipients: number;
  status: CampaignStatus;
  createdAt: string;
  updatedAt: string;
  sender?: SenderDto;
}

export interface EmailDto {
  id: string;
  userId: string;
  campaignId: string;
  senderId: string;
  recipient: string;
  subject: string;
  body?: string;
  scheduledAt: string;
  sentAt?: string | null;
  status: EmailStatus;
  idempotencyKey: string;
  bullJobId?: string | null;
  attemptCount: number;
  lastError?: string | null;
  providerMessageId?: string | null;
  etherealPreviewUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  campaign?: CampaignDto;
  sender?: SenderDto;
}

export interface EmailJobData {
  emailId: string;
  campaignId: string;
  userId: string;
  senderId: string;
  recipient: string;
  subject: string;
  body: string;
  idempotencyKey: string;
  attemptNumber: number;
  scheduledAt: string;
}

export interface EmailJobResult {
  success: boolean;
  emailId: string;
  providerMessageId?: string;
  previewUrl?: string;
  rescheduled?: boolean;
  rescheduledFor?: string;
  error?: string;
}

export interface SlackConnectionDto {
  id: string;
  userId: string;
  teamId: string;
  teamName: string;
  scopes: string;
  connectedAt: string;
  updatedAt: string;
}

export interface EmailEventDto {
  id: string;
  emailId: string;
  eventType: EmailEventType;
  details?: Record<string, unknown> | null;
  createdAt: string;
}

export interface OutboxEventDto {
  id: string;
  eventType: OutboxEventType;
  aggregateId: string;
  payload: Record<string, unknown>;
  publishedAt?: string | null;
  createdAt: string;
}

export interface ElasticsearchEmailDocument {
  id: string;
  userId: string;
  campaignId: string;
  senderId: string;
  senderEmail: string;
  recipient: string;
  subject: string;
  status: EmailStatus;
  scheduledAt: string;
  sentAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    hasNextPage?: boolean;
    requestId?: string;
  };
}

export interface DashboardMetrics {
  totalScheduled: number;
  totalSent: number;
  totalFailed: number;
  totalProcessing: number;
  activeSendersCount: number;
  slackConnected: boolean;
}
