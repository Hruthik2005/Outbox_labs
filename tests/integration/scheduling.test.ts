import { describe, it, expect } from 'vitest';
import { ScheduleEmailRequestSchema, CreateSenderSchema } from '@reachinbox/shared';

describe('Email Scheduling and Schema Validation', () => {
  it('should validate a correct email scheduling payload', () => {
    const validData = {
      senderId: 'sender_123',
      subject: 'Valid Outreach Subject',
      body: 'Hello, this is a test email body.',
      recipients: ['user1@example.com', 'user2@example.com'],
      startAt: new Date(Date.now() + 60000).toISOString(),
      minimumDelaySeconds: 2,
      hourlyLimit: 100
    };

    const parsed = ScheduleEmailRequestSchema.safeParse(validData);
    expect(parsed.success).toBe(true);
  });

  it('should reject invalid recipient email addresses', () => {
    const invalidData = {
      senderId: 'sender_123',
      subject: 'Invalid Email Test',
      body: 'Test content',
      recipients: ['not-an-email', 'valid@example.com'],
      startAt: new Date().toISOString()
    };

    const parsed = ScheduleEmailRequestSchema.safeParse(invalidData);
    expect(parsed.success).toBe(false);
  });

  it('should reject missing subject or empty recipients', () => {
    const emptyRecipients = {
      senderId: 'sender_123',
      subject: 'Valid Subject',
      body: 'Body text',
      recipients: [],
      startAt: new Date().toISOString()
    };

    const parsed = ScheduleEmailRequestSchema.safeParse(emptyRecipients);
    expect(parsed.success).toBe(false);
  });

  it('should validate sender creation settings', () => {
    const validSender = {
      name: 'Sales Sender',
      email: 'sales@example.com',
      host: 'smtp.ethereal.email',
      port: 587,
      username: 'sales_user',
      password: 'secret_password_123',
      secure: false,
      hourlyLimit: 100,
      minimumDelaySeconds: 2
    };

    const parsed = CreateSenderSchema.safeParse(validSender);
    expect(parsed.success).toBe(true);
  });
});
