import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { Client } from '@elastic/elasticsearch';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config();

const prisma = new PrismaClient();
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: 1,
  lazyConnect: true
});

const esClient = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  tls: { rejectUnauthorized: false }
});

async function main() {
  console.log('\n============================================================');
  console.log('🔍 ReachInbox Integration Verification Suite');
  console.log('============================================================\n');

  // 1. MySQL Connectivity
  process.stdout.write('1. Testing MySQL Relational Database: ');
  try {
    await prisma.$queryRaw`SELECT 1 as ping`;
    const userCount = await prisma.user.count();
    console.log(`✅ CONNECTED (Active users in DB: ${userCount})`);
  } catch (err) {
    console.log(`❌ FAILED: ${(err as Error).message}`);
  }

  // 2. Redis Connectivity
  process.stdout.write('2. Testing Redis BullMQ Broker: ');
  try {
    await redis.connect();
    const pong = await redis.ping();
    console.log(`✅ CONNECTED (Ping response: ${pong})`);
  } catch (err) {
    console.log(`❌ FAILED: ${(err as Error).message}`);
  }

  // 3. Elasticsearch Connectivity
  process.stdout.write('3. Testing Elasticsearch Engine: ');
  try {
    const health = await esClient.cluster.health();
    console.log(`✅ CONNECTED (Cluster Status: ${health.status})`);
  } catch (err) {
    console.log(`⚠️  NOT CONNECTED / OFFLINE: ${(err as Error).message}`);
  }

  // 4. AES-256-GCM Encryption Self-Test
  process.stdout.write('4. Testing AES-256-GCM Symmetric Encryption: ');
  try {
    const testSecret = 'SuperSecretSmtpPassword123!@#';
    const rawKey = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const key = Buffer.from(rawKey.slice(0, 64), 'hex');
    const keyBuffer = key.length === 32 ? key : crypto.createHash('sha256').update(rawKey).digest();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);
    let enc = cipher.update(testSecret, 'utf8', 'hex');
    enc += cipher.final('hex');
    const tag = cipher.getAuthTag();

    const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv);
    decipher.setAuthTag(tag);
    let dec = decipher.update(enc, 'hex', 'utf8');
    dec += decipher.final('utf8');

    if (dec === testSecret) {
      console.log('✅ PASSED (Encryption & Tag Verification matches)');
    } else {
      console.log('❌ FAILED (Decrypted value mismatch)');
    }
  } catch (err) {
    console.log(`❌ FAILED: ${(err as Error).message}`);
  }

  // 5. Ethereal SMTP Connectivity
  process.stdout.write('5. Testing Ethereal SMTP Transport: ');
  try {
    const testAccount = await nodemailer.createTestAccount();
    const transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
    await transporter.verify();
    console.log(`✅ PASSED (Verified via ${testAccount.smtp.host}:${testAccount.smtp.port})`);
  } catch (err) {
    console.log(`⚠️  FAILED: ${(err as Error).message}`);
  }

  console.log('\n============================================================');
  console.log('✨ Verification run finished.');
  console.log('============================================================\n');

  await redis.quit().catch(() => {});
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Fatal error running verification:', err);
  process.exit(1);
});
