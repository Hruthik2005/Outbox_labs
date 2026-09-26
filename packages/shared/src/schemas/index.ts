import { z } from 'zod';

export const ScheduleEmailRequestSchema = z.object({
  senderId: z.string().min(1, 'Sender is required'),
  subject: z.string().min(1, 'Subject is required').max(255, 'Subject is too long'),
  body: z.string().min(1, 'Email body is required'),
  recipients: z.array(z.string().email('Invalid email address')).min(1, 'At least one recipient is required'),
  startAt: z.string().datetime({ message: 'Start time must be a valid ISO 8601 string' }),
  minimumDelaySeconds: z.number().int().min(0).max(3600).default(2),
  hourlyLimit: z.number().int().min(1).max(10000).default(100)
});

export type ScheduleEmailRequest = z.infer<typeof ScheduleEmailRequestSchema>;

export const CreateSenderSchema = z.object({
  name: z.string().min(1, 'Sender name is required').max(100),
  email: z.string().email('Invalid sender email address'),
  host: z.string().min(1, 'SMTP host is required'),
  port: z.number().int().min(1).max(65535).default(587),
  username: z.string().min(1, 'SMTP username is required'),
  password: z.string().min(1, 'SMTP password is required'),
  secure: z.boolean().default(false),
  hourlyLimit: z.number().int().min(1).max(10000).default(100),
  minimumDelaySeconds: z.number().int().min(0).max(3600).default(2)
});

export type CreateSenderRequest = z.infer<typeof CreateSenderSchema>;

export const UpdateSenderSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  host: z.string().min(1).optional(),
  port: z.number().int().min(1).max(65535).optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  secure: z.boolean().optional(),
  hourlyLimit: z.number().int().min(1).max(10000).optional(),
  minimumDelaySeconds: z.number().int().min(0).max(3600).optional(),
  isActive: z.boolean().optional()
});

export type UpdateSenderRequest = z.infer<typeof UpdateSenderSchema>;

export const TestSmtpSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  username: z.string().min(1),
  password: z.string().min(1),
  secure: z.boolean().default(false)
});

export type TestSmtpRequest = z.infer<typeof TestSmtpSchema>;

export const EmailQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
  campaignId: z.string().optional(),
  senderId: z.string().optional(),
  search: z.string().optional()
});

export type EmailQueryParams = z.infer<typeof EmailQuerySchema>;

export const SearchQuerySchema = z.object({
  q: z.string().min(1, 'Search query must not be empty'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export type SearchQueryParams = z.infer<typeof SearchQuerySchema>;
