import crypto from 'crypto';
import { userRepository } from '../repositories/user.repository.js';
import { generateGoogleAuthUrl, verifyGoogleAuthCode } from '../integrations/google/google-oauth.client.js';
import { signToken } from '../utils/crypto.js';
import { UserProfile } from '@reachinbox/shared';

export class AuthService {
  private stateCache = new Set<string>();

  getGoogleLoginUrl(): { url: string; state: string } {
    const state = crypto.randomBytes(16).toString('hex');
    this.stateCache.add(state);

    // Expire state after 10 minutes
    setTimeout(() => this.stateCache.delete(state), 10 * 60 * 1000);

    const url = generateGoogleAuthUrl(state);
    return { url, state };
  }

  async handleGoogleCallback(code: string, state: string): Promise<{ token: string; user: UserProfile }> {
    if (!state || !this.stateCache.has(state)) {
      throw new Error('Invalid or expired OAuth state parameter');
    }
    this.stateCache.delete(state);

    const googleProfile = await verifyGoogleAuthCode(code);

    const user = await userRepository.upsertGoogleUser({
      googleId: googleProfile.googleId,
      email: googleProfile.email,
      name: googleProfile.name,
      avatarUrl: googleProfile.avatarUrl
    });

    const token = signToken({
      userId: user.id,
      email: user.email
    });

    return {
      token,
      user: {
        id: user.id,
        googleId: user.googleId,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString()
      }
    };
  }

  async getProfile(userId: string): Promise<UserProfile | null> {
    const user = await userRepository.findById(userId);
    if (!user) return null;

    return {
      id: user.id,
      googleId: user.googleId,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString()
    };
  }
}

export const authService = new AuthService();
