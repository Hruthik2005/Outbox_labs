import { execSync } from 'child_process';
import path from 'path';

console.log('🚀 Running ReachInbox Project Setup Script...\n');

function run(command: string) {
  console.log(`> ${command}`);
  execSync(command, { stdio: 'inherit', cwd: path.resolve(__dirname, '..') });
}

try {
  console.log('1. Building Shared Packages...');
  run('npm run build --workspace=@reachinbox/shared');

  console.log('\n2. Generating Prisma Client for MySQL...');
  run('npx prisma generate --schema=prisma/schema.prisma');

  console.log('\n3. Building Backend API, Worker, and Web Packages...');
  run('npm run build');

  console.log('\n✨ ReachInbox Setup Completed Successfully!');
} catch (error) {
  console.error('\n❌ Setup failed:', error);
  process.exit(1);
}
