import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'support@verifactu.business' },
    update: {},
    create: {
      email: 'support@verifactu.business',
      name: 'Admin Verifactu',
      role: 'ADMIN',
    },
  });

  console.log('✅ Admin user created:', admin.email);

  // Create a test company with owner
  const testUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      name: 'Test User',
      role: 'USER',
    },
  });

  const testCompany = await prisma.company.upsert({
    where: { taxId: 'B12345678' },
    update: {},
    create: {
      name: 'Test Company SL',
      taxId: 'B12345678',
      ownerUserId: testUser.id,
    },
  });

  console.log('✅ Test company created:', testCompany.name);

  // Create subscription for test company
  const subscription = await prisma.subscription.create({
    data: {
      userId: testUser.id,
      companyId: testCompany.id,
      status: 'TRIAL',
    },
  });

  console.log('✅ Test subscription created:', subscription.status);

  console.log('🎉 Seeding completed!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seeding failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
