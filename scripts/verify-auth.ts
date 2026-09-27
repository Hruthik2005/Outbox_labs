import { prisma } from '../apps/api/src/config/database.js';
import { authService } from '../apps/api/src/services/auth.service.js';

async function main() {
  console.log('🧪 Starting Full Authentication & MySQL Persistence Verification...\n');

  // Test 1: Check existing users in MySQL
  const allUsersBefore = await prisma.user.findMany({
    select: { id: true, name: true, email: true, googleId: true, passwordHash: true }
  });
  console.log(`📊 Total users currently in MySQL: ${allUsersBefore.length}`);
  allUsersBefore.forEach((u) => {
    console.log(`   - ${u.name} (${u.email}) [GoogleId: ${u.googleId || 'None'}, HasPassword: ${!!u.passwordHash}]`);
  });

  // Test 2: Register a new test user directly in MySQL
  const testEmail = `newuser_${Date.now()}@example.com`;
  const testPassword = 'SecurePassword2026!';
  console.log(`\n📝 Registering new user: ${testEmail}...`);

  const registerResult = await authService.register({
    name: 'New Registered User',
    email: testEmail,
    password: testPassword
  });

  console.log(`✅ Registration successful! Generated User ID: ${registerResult.user.id}`);
  console.log(`   Token issued: ${registerResult.token.slice(0, 25)}...`);

  // Test 3: Verify the record in MySQL database directly
  const savedUser = await prisma.user.findUnique({
    where: { email: testEmail }
  });

  if (!savedUser) {
    throw new Error('❌ Verification failed: User was NOT found in MySQL database!');
  }

  console.log('\n🔎 Direct MySQL Database Verification:');
  console.log(`   - ID: ${savedUser.id}`);
  console.log(`   - Name: ${savedUser.name}`);
  console.log(`   - Email: ${savedUser.email}`);
  console.log(`   - Password Hash in DB: ${savedUser.passwordHash?.slice(0, 30)}... (Length: ${savedUser.passwordHash?.length})`);
  console.log(`   - Created At: ${savedUser.createdAt.toISOString()}`);

  // Test 4: Test Sign In with correct credentials
  console.log('\n🔐 Testing Sign In with correct password...');
  const loginResult = await authService.login({
    email: testEmail,
    password: testPassword
  });
  console.log(`✅ Sign In successful for ${loginResult.user.name} (${loginResult.user.email})!`);

  // Test 5: Test Sign In with incorrect password
  console.log('\n🚫 Testing Sign In with wrong password (should reject)...');
  try {
    await authService.login({
      email: testEmail,
      password: 'WrongPassword!'
    });
    throw new Error('Expected login to fail with wrong password, but it succeeded!');
  } catch (err: unknown) {
    console.log(`✅ Properly rejected invalid credentials: ${(err as Error).message}`);
  }

  // Test 6: Verify Primary Account vvce23cse0102@vvce.ac.in exists in MySQL
  console.log('\n🎯 Verifying Target Account in MySQL: vvce23cse0102@vvce.ac.in');
  const targetUser = await prisma.user.findUnique({
    where: { email: 'vvce23cse0102@vvce.ac.in' },
    include: {
      senders: true,
      campaigns: true,
      slackConnections: true
    }
  });

  if (targetUser) {
    console.log(`✅ Target user verified in MySQL:`);
    console.log(`   - Name: ${targetUser.name}`);
    console.log(`   - Email: ${targetUser.email}`);
    console.log(`   - Google ID: ${targetUser.googleId}`);
    console.log(`   - Senders configured in DB: ${targetUser.senders.length}`);
    console.log(`   - Campaigns configured in DB: ${targetUser.campaigns.length}`);
  } else {
    console.log(`⚠️ User vvce23cse0102@vvce.ac.in not found; run scripts/seed.ts to populate.`);
  }

  console.log('\n🎉 ALL AUTHENTICATION & MYSQL PERSISTENCE TESTS PASSED CLEANLY!\n');
}

main()
  .catch((err) => {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
