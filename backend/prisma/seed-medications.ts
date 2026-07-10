import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const sampleMedications = [
  {
    name: 'آموکسی‌سیلین ۵۰۰ میلی‌گرم',
    genericName: 'Amoxicillin',
    form: 'کپسول',
    strength: '500mg',
    atcCode: 'J01CA04',
  },
  {
    name: 'متفورمین ۱۰۰۰ میلی‌گرم',
    genericName: 'Metformin',
    form: 'قرص',
    strength: '1000mg',
    atcCode: 'A10BA02',
  },
  {
    name: 'لووتیروکسین ۱۰۰ میکروگرم',
    genericName: 'Levothyroxine',
    form: 'قرص',
    strength: '100mcg',
    atcCode: 'H03AA01',
  },
  {
    name: 'انسولین گلارژین',
    genericName: 'Insulin Glargine',
    form: 'پن',
    strength: '100 IU/ml',
    atcCode: 'A10AE04',
  },
  {
    name: 'سرم نرمال سالین ۰.۹٪',
    genericName: 'Sodium Chloride',
    form: 'سرم',
    strength: '0.9%',
    atcCode: 'B05BB01',
  },
  {
    name: 'آتورواستاتین ۲۰ میلی‌گرم',
    genericName: 'Atorvastatin',
    form: 'قرص',
    strength: '20mg',
    atcCode: 'C10AA05',
  },
  {
    name: 'آسپرین ۸۰ میلی‌گرم',
    genericName: 'Acetylsalicylic Acid',
    form: 'قرص',
    strength: '80mg',
    atcCode: 'B01AC06',
  },
  {
    name: 'امپرازول ۲۰ میلی‌گرم',
    genericName: 'Omeprazole',
    form: 'کپسول',
    strength: '20mg',
    atcCode: 'A02BC01',
  },
] as const;

async function main(): Promise<void> {
  console.log('Seeding medications...');

  for (const med of sampleMedications) {
    const existing = await prisma.medication.findFirst({
      where: { name: med.name, deletedAt: null },
    });

    if (existing) {
      console.log(`  Skipping existing: ${med.name}`);
      continue;
    }

    await prisma.medication.create({ data: med });
    console.log(`  Created: ${med.name}`);
  }

  console.log('Medication seed complete.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
