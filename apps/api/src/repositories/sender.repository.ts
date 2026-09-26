import { prisma } from '../config/database.js';
import { Sender } from '@prisma/client';

export class SenderRepository {
  async findById(id: string, userId?: string): Promise<Sender | null> {
    return prisma.sender.findFirst({
      where: {
        id,
        ...(userId ? { userId } : {})
      }
    });
  }

  async findByUserId(userId: string): Promise<Sender[]> {
    return prisma.sender.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async create(data: {
    userId: string;
    name: string;
    email: string;
    host: string;
    port: number;
    encryptedUsername: string;
    encryptedPassword: string;
    secure: boolean;
    hourlyLimit: number;
    minimumDelaySeconds: number;
    isActive: boolean;
  }): Promise<Sender> {
    return prisma.sender.create({ data });
  }

  async update(
    id: string,
    userId: string,
    data: Partial<{
      name: string;
      email: string;
      host: string;
      port: number;
      encryptedUsername: string;
      encryptedPassword: string;
      secure: boolean;
      hourlyLimit: number;
      minimumDelaySeconds: number;
      isActive: boolean;
    }>
  ): Promise<Sender> {
    return prisma.sender.update({
      where: { id, userId },
      data
    });
  }

  async delete(id: string, userId: string): Promise<Sender> {
    return prisma.sender.delete({
      where: { id, userId }
    });
  }
}

export const senderRepository = new SenderRepository();
