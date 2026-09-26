import { prisma } from '../config/database.js';
import { User } from '@prisma/client';

export class UserRepository {
  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { googleId } });
  }

  async upsertGoogleUser(data: {
    googleId: string;
    email: string;
    name: string;
    avatarUrl?: string;
  }): Promise<User> {
    return prisma.user.upsert({
      where: { googleId: data.googleId },
      update: {
        name: data.name,
        email: data.email,
        avatarUrl: data.avatarUrl
      },
      create: {
        googleId: data.googleId,
        email: data.email,
        name: data.name,
        avatarUrl: data.avatarUrl
      }
    });
  }
}

export const userRepository = new UserRepository();
