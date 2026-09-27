import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config();

const prisma = new PrismaClient();

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

function encrypt(text: string): string {
  const iv = crypto.randomBytes(12);
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex');
  const cipher = crypto.createCipheriv('aes-256-gcm', key.length === 32 ? key : crypto.createHash('sha256').update(ENCRYPTION_KEY).digest(), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

async function main() {
  console.log('🌱 Starting ReachInbox Database Seeding...');

  // 1. Create or update Demo User
  const user = await prisma.user.upsert({
    where: { id: 'user_reachinbox_demo_01' },
    update: {
      email: 'vvce23cse0102@vvce.ac.in',
      name: 'Hruthik (VVCE)',
      googleId: 'google_oauth_vvce23cse0102'
    },
    create: {
      id: 'user_reachinbox_demo_01',
      googleId: 'google_oauth_vvce23cse0102',
      name: 'Hruthik (VVCE)',
      email: 'vvce23cse0102@vvce.ac.in',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'
    }
  });

  console.log(`✅ Demo User ready: ${user.name} (${user.email})`);

  // 2. Generate or use Ethereal SMTP Credentials
  let etherealUser = process.env.ETHEREAL_USER;
  let etherealPass = process.env.ETHEREAL_PASS;
  let etherealHost = process.env.ETHEREAL_HOST || 'smtp.ethereal.email';
  let etherealPort = parseInt(process.env.ETHEREAL_PORT || '587', 10);

  if (!etherealUser || !etherealPass) {
    try {
      console.log('📬 Creating real Ethereal SMTP test account for local testing...');
      const testAccount = await nodemailer.createTestAccount();
      etherealUser = testAccount.user;
      etherealPass = testAccount.pass;
      etherealHost = testAccount.smtp.host;
      etherealPort = testAccount.smtp.port;
      console.log(`✨ Generated Ethereal Credentials: User=${etherealUser}`);
    } catch {
      etherealUser = 'ethereal_dev_user@ethereal.email';
      etherealPass = 'ethereal_dev_password';
    }
  }

  // 3. Create or find Default Sender Account
  let sender = await prisma.sender.findFirst({ where: { userId: user.id } });
  if (!sender) {
    sender = await prisma.sender.create({
      data: {
        userId: user.id,
        name: 'ReachInbox Outreach Team',
        email: etherealUser,
        host: etherealHost,
        port: etherealPort,
        encryptedUsername: encrypt(etherealUser),
        encryptedPassword: encrypt(etherealPass),
        secure: false,
        hourlyLimit: 100,
        minimumDelaySeconds: 2,
        isActive: true
      }
    });
  }

  console.log(`✅ Sender account ready: ${sender.name} (${sender.email}) on ${sender.host}:${sender.port}`);

  // 4. Create Initial Campaign if none exists
  let campaign = await prisma.campaign.findFirst({ where: { userId: user.id } });
  if (!campaign) {
    campaign = await prisma.campaign.create({
      data: {
        userId: user.id,
        senderId: sender.id,
        subject: 'Welcome to ReachInbox Email Scheduler',
        body: '<p>Hello,</p><p>This is a scheduled demonstration outreach email processed with BullMQ and MySQL.</p>',
        startAt: new Date(),
        minimumDelaySeconds: 2,
        hourlyLimit: 100,
        totalRecipients: 3,
        status: 'SCHEDULED'
      }
    });
  }

  // 5. Create Sample Email Records
  const recipients = ['sarah.connor@example.com', 'alex.rivera@enterprise.org', 'jordan.lee@techcorp.io'];

  for (let i = 0; i < recipients.length; i++) {
    const r = recipients[i];
    const emailId = crypto.randomUUID();
    const isPast = i === 0;
    const idempotencyKey = crypto.createHash('sha256').update(`${campaign.id}:${r}:${i}`).digest('hex');

    const existingEmail = await prisma.email.findUnique({ where: { idempotencyKey } });
    if (!existingEmail) {
      await prisma.email.create({
        data: {
          id: emailId,
          userId: user.id,
          campaignId: campaign.id,
          senderId: sender.id,
          recipient: r,
          subject: campaign.subject,
          body: campaign.body,
          scheduledAt: new Date(Date.now() + (i * 2000)),
          status: isPast ? 'SENT' : 'SCHEDULED',
          idempotencyKey,
          bullJobId: emailId,
          sentAt: isPast ? new Date() : null,
          providerMessageId: isPast ? `<msg-${emailId}@reachinbox.test>` : null,
          etherealPreviewUrl: isPast ? 'https://ethereal.email/message/WaQKMgKddxQDoou...preview' : null
        }
      });
    }
  }

  console.log('✅ Seed email records inserted.');
  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
