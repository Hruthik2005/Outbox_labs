import { senderRepository } from '../repositories/sender.repository.js';
import { testSmtpConnection } from '../integrations/smtp/ethereal.client.js';
import { encrypt, decrypt } from '../utils/crypto.js';
import { CreateSenderRequest, UpdateSenderRequest, TestSmtpRequest, SenderDto } from '@reachinbox/shared';

export class SenderService {
  async listSenders(userId: string): Promise<SenderDto[]> {
    const senders = await senderRepository.findByUserId(userId);
    return senders.map((s) => ({
      id: s.id,
      userId: s.userId,
      name: s.name,
      email: s.email,
      host: s.host,
      port: s.port,
      hourlyLimit: s.hourlyLimit,
      minimumDelaySeconds: s.minimumDelaySeconds,
      isActive: s.isActive,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString()
    }));
  }

  async testConnection(data: TestSmtpRequest): Promise<boolean> {
    return testSmtpConnection({
      host: data.host,
      port: data.port,
      secure: data.secure,
      auth: {
        user: data.username,
        pass: data.password
      }
    });
  }

  async createSender(userId: string, data: CreateSenderRequest): Promise<SenderDto> {
    let effectiveUsername = data.username.trim();

    // 1. Verify SMTP connection before storing
    let isValid = await testSmtpConnection({
      host: data.host,
      port: data.port,
      secure: data.secure,
      auth: {
        user: effectiveUsername,
        pass: data.password
      }
    });

    // If initial verification failed but email is provided and differs from username, test with email
    if (!isValid && data.email && data.email.includes('@') && effectiveUsername !== data.email.trim()) {
      const fallbackOk = await testSmtpConnection({
        host: data.host,
        port: data.port,
        secure: data.secure,
        auth: {
          user: data.email.trim(),
          pass: data.password
        }
      });
      if (fallbackOk) {
        effectiveUsername = data.email.trim();
        isValid = true;
      }
    }

    if (!isValid) {
      throw new Error(
        'SMTP connection verification failed. Please verify that SMTP Username is your full email address (e.g. napoleon.schaefer@ethereal.email) and your password is correct.'
      );
    }

    // 2. Encrypt credentials with AES-256-GCM
    const encryptedUsername = encrypt(effectiveUsername);
    const encryptedPassword = encrypt(data.password);

    const sender = await senderRepository.create({
      userId,
      name: data.name,
      email: data.email,
      host: data.host,
      port: data.port,
      encryptedUsername,
      encryptedPassword,
      secure: data.secure,
      hourlyLimit: data.hourlyLimit,
      minimumDelaySeconds: data.minimumDelaySeconds,
      isActive: true
    });

    return {
      id: sender.id,
      userId: sender.userId,
      name: sender.name,
      email: sender.email,
      host: sender.host,
      port: sender.port,
      hourlyLimit: sender.hourlyLimit,
      minimumDelaySeconds: sender.minimumDelaySeconds,
      isActive: sender.isActive,
      createdAt: sender.createdAt.toISOString(),
      updatedAt: sender.updatedAt.toISOString()
    };
  }

  async updateSender(userId: string, id: string, data: UpdateSenderRequest): Promise<SenderDto> {
    const existing = await senderRepository.findById(id, userId);
    if (!existing) {
      throw new Error('Sender not found or unauthorized');
    }

    const updatePayload: Record<string, unknown> = { ...data };
    if (data.username) {
      updatePayload.encryptedUsername = encrypt(data.username);
      delete updatePayload.username;
    }
    if (data.password) {
      updatePayload.encryptedPassword = encrypt(data.password);
      delete updatePayload.password;
    }

    const updated = await senderRepository.update(id, userId, updatePayload);
    return {
      id: updated.id,
      userId: updated.userId,
      name: updated.name,
      email: updated.email,
      host: updated.host,
      port: updated.port,
      hourlyLimit: updated.hourlyLimit,
      minimumDelaySeconds: updated.minimumDelaySeconds,
      isActive: updated.isActive,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString()
    };
  }

  async deleteSender(userId: string, id: string): Promise<boolean> {
    const existing = await senderRepository.findById(id, userId);
    if (!existing) {
      throw new Error('Sender not found or unauthorized');
    }

    await senderRepository.delete(id, userId);
    return true;
  }

  async getDecryptedCredentials(senderId: string) {
    const sender = await senderRepository.findById(senderId);
    if (!sender) return null;

    return {
      id: sender.id,
      name: sender.name,
      email: sender.email,
      host: sender.host,
      port: sender.port,
      secure: sender.secure,
      username: decrypt(sender.encryptedUsername),
      password: decrypt(sender.encryptedPassword),
      hourlyLimit: sender.hourlyLimit,
      minimumDelaySeconds: sender.minimumDelaySeconds,
      isActive: sender.isActive
    };
  }
}

export const senderService = new SenderService();
