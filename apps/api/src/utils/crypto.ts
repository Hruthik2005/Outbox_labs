import crypto from 'crypto';
import { env } from '../config/env.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

/**
 * Encrypt a string using AES-256-GCM.
 * The encryption key is derived or sliced from ENCRYPTION_KEY env var (32 bytes).
 */
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = Buffer.from(env.ENCRYPTION_KEY.slice(0, 64), 'hex');
  const cipher = crypto.createCipheriv(ALGORITHM, key.length === 32 ? key : crypto.createHash('sha256').update(env.ENCRYPTION_KEY).digest(), iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();

  // Format: iv:tag:encrypted
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt a string encrypted with encrypt().
 */
export function decrypt(cipherText: string): string {
  const parts = cipherText.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }

  const [ivHex, tagHex, encryptedText] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const key = Buffer.from(env.ENCRYPTION_KEY.slice(0, 64), 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key.length === 32 ? key : crypto.createHash('sha256').update(env.ENCRYPTION_KEY).digest(), iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Sign session token or generate tamper-proof state tokens
 */
export function signToken(payload: object): string {
  const data = JSON.stringify(payload);
  const hmac = crypto.createHmac('sha256', env.SESSION_SECRET);
  hmac.update(data);
  const signature = hmac.digest('base64url');
  return `${Buffer.from(data).toString('base64url')}.${signature}`;
}

export function verifyToken<T>(token: string): T | null {
  try {
    const [encodedData, signature] = token.split('.');
    if (!encodedData || !signature) return null;

    const data = Buffer.from(encodedData, 'base64url').toString('utf8');
    const hmac = crypto.createHmac('sha256', env.SESSION_SECRET);
    hmac.update(data);
    const expectedSignature = hmac.digest('base64url');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }

    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}
