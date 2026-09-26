import { describe, it, expect } from 'vitest';
import crypto from 'crypto';

const ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

function encrypt(text: string): string {
  const iv = crypto.randomBytes(12);
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex');
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

function decrypt(cipherText: string): string {
  const [ivHex, tagHex, encryptedText] = cipherText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function generateIdempotencyKey(campaignId: string, recipient: string, time: number): string {
  return crypto.createHash('sha256').update(`${campaignId}:${recipient}:${time}`).digest('hex');
}

describe('Idempotency and Security Primitives', () => {
  it('should encrypt and decrypt sensitive SMTP credentials reliably', () => {
    const originalPassword = 'super_secret_smtp_password_9876!';
    const encrypted = encrypt(originalPassword);
    expect(encrypted).not.toBe(originalPassword);
    expect(encrypted.split(':')).toHaveLength(3);

    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(originalPassword);
  });

  it('should generate stable deterministic idempotency keys for duplicate prevention', () => {
    const campaignId = 'camp_123';
    const recipient = 'user@example.com';
    const time = 1717000000000;

    const key1 = generateIdempotencyKey(campaignId, recipient, time);
    const key2 = generateIdempotencyKey(campaignId, recipient, time);
    const key3 = generateIdempotencyKey(campaignId, 'different@example.com', time);

    expect(key1).toBe(key2);
    expect(key1).not.toBe(key3);
    expect(key1).toHaveLength(64); // SHA-256 hex string
  });
});
