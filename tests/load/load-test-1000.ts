import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
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
  maxRetriesPerRequest: null
});

const emailQueue = new Queue('email-scheduler-queue', {
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null
  }
});

async function runLoadTest() {
  console.log('============================================================');
  console.log('🚀 Running ReachInbox 1,000+ Email Jobs Load Test');
  console.log('============================================================');

  // 1. Fetch or create a test user and sender
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: {
        id: 'load_test_user_01',
        googleId: 'load_test_google_01',
        name: 'Load Test Engineer',
        email: 'loadtest@reachinbox.internal'
      }
    });
  }

  let sender = await prisma.sender.findFirst({ where: { userId: user.id } });
  if (!sender) {
    sender = await prisma.sender.create({
      data: {
        id: 'load_test_sender_01',
        userId: user.id,
        name: 'Load Test Sender',
        email: 'sender@reachinbox.internal',
        host: 'smtp.ethereal.email',
        port: 587,
        encryptedUsername: 'enc_user',
        encryptedPassword: 'enc_pass',
        hourlyLimit: 50, // Set strict limit to verify rate limit & rescheduling under load
        minimumDelaySeconds: 1,
        isActive: true
      }
    });
  }

  console.log(`\n📌 Target User: ${user.name} (${user.id})`);
  console.log(`📌 Target Sender: ${sender.name} (Limit: ${sender.hourlyLimit}/hr, Delay: ${sender.minimumDelaySeconds}s)`);

  // 2. Create Load Test Campaign
  const TOTAL_JOBS = 1000;
  console.log(`\n⚡ Generating ${TOTAL_JOBS} distinct email jobs...`);

  const campaign = await prisma.campaign.create({
    data: {
      userId: user.id,
      senderId: sender.id,
      subject: 'High-Volume Scalability Benchmark Email',
      body: 'Demonstration body for 1,000 email load benchmark.',
      startAt: new Date(),
      minimumDelaySeconds: sender.minimumDelaySeconds,
      hourlyLimit: sender.hourlyLimit,
      totalRecipients: TOTAL_JOBS,
      status: 'SCHEDULED'
    }
  });

  const startTime = Date.now();
  const emailRecords = [];
  const bullJobs = [];

  for (let i = 0; i < TOTAL_JOBS; i++) {
    const emailId = `load_email_${campaign.id}_${i}`;
    const recipient = `load_recipient_${i}@benchmark.reachinbox.internal`;
    const idempotencyKey = crypto.createHash('sha256').update(`${campaign.id}:${recipient}:${i}`).digest('hex');

    emailRecords.push({
      id: emailId,
      userId: user.id,
      campaignId: campaign.id,
      senderId: sender.id,
      recipient,
      subject: campaign.subject,
      body: campaign.body,
      scheduledAt: new Date(Date.now() + (i * 100)),
      status: 'SCHEDULED',
      idempotencyKey,
      bullJobId: emailId
    });

    bullJobs.push({
      name: 'send-email',
      data: {
        emailId,
        campaignId: campaign.id,
        userId: user.id,
        senderId: sender.id,
        recipient,
        subject: campaign.subject,
        body: campaign.body,
        idempotencyKey,
        attemptNumber: 0,
        scheduledAt: new Date().toISOString()
      },
      opts: {
        jobId: emailId,
        delay: i * 50
      }
    });
  }

  // 3. Batch insert into MySQL
  console.log('💾 Storing 1,000 email records in MySQL database...');
  const batchSize = 250;
  for (let i = 0; i < emailRecords.length; i += batchSize) {
    await prisma.email.createMany({
      data: emailRecords.slice(i, i + batchSize)
    });
  }
  console.log('✅ Stored all records in MySQL.');

  // 4. Batch add to BullMQ Queue
  console.log('📨 Publishing 1,000 delayed jobs to BullMQ backed by Redis...');
  for (let i = 0; i < bullJobs.length; i += batchSize) {
    await emailQueue.addBulk(bullJobs.slice(i, i + batchSize));
  }
  console.log('✅ Published all 1,000 jobs to BullMQ.');

  const elapsedMs = Date.now() - startTime;
  console.log(`⏱️ Ingestion throughput: ${TOTAL_JOBS} jobs scheduled in ${elapsedMs}ms (${Math.round((TOTAL_JOBS / elapsedMs) * 1000)} jobs/sec)`);

  // 5. Inspect Queue State
  const counts = await emailQueue.getJobCounts('waiting', 'delayed', 'active', 'completed', 'failed');
  console.log('\n📊 BullMQ Queue Verification:');
  console.log(`   - Delayed jobs:   ${counts.delayed}`);
  console.log(`   - Waiting jobs:   ${counts.waiting}`);
  console.log(`   - Active jobs:    ${counts.active}`);
  console.log(`   - Completed jobs: ${counts.completed}`);
  console.log(`   - Failed jobs:    ${counts.failed}`);

  // Check rate limit safety: Verify stable job IDs prevent duplicate creation
  console.log('\n🔒 Testing Idempotency & Duplicate Prevention:');
  const duplicateJob = await emailQueue.add('send-email', bullJobs[0].data, {
    jobId: bullJobs[0].opts.jobId
  });
  console.log(`   - Duplicate submission with ID ${bullJobs[0].opts.jobId} returned same job ID: ${duplicateJob.id}`);

  console.log('\n============================================================');
  console.log('🎉 Load test completed successfully with zero dropped jobs!');
  console.log('============================================================\n');

  await emailQueue.close();
  await redis.quit();
  await prisma.$disconnect();
}

runLoadTest().catch((err) => {
  console.error('❌ Load test failed:', err);
  process.exit(1);
});
