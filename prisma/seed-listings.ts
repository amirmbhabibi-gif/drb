import { ListingStatus, ListingType, PharmacyVerificationStatus, PrismaClient, UserStatus } from '@prisma/client';

const prisma = new PrismaClient();

const samplePharmacies = [
  { name: 'داروخانه سپید', licenseNumber: 'TEH-1001' },
  { name: 'داروخانه مهر', licenseNumber: 'ISF-2002' },
  { name: 'داروخانه سلامت', licenseNumber: 'SHZ-3003' },
  { name: 'داروخانه آریا', licenseNumber: 'MHD-4004' },
] as const;

type SampleListing = {
  type: ListingType;
  rawText: string;
  metadata: Record<string, unknown>;
};

const sampleListings: SampleListing[] = [
  {
    type: ListingType.OFFER,
    rawText: 'آموکسی‌سیلین ۵۰۰ کپسول، ۵ جعبه، تاریخ انقضا خرداد ۱۴۰۵، بسته‌بندی سالم و پلمپ',
    metadata: {
      urgencyLevel: 2,
      expiryDate: '2026-06-21',
      condition: 'پلمپ و سالم',
      quantity: { value: 5, unit: 'جعبه' },
      location: { city: 'تهران', province: 'تهران', country: 'IR' },
    },
  },
  {
    type: ListingType.NEED,
    rawText: 'نیاز فوری به متفورمین ۱۰۰۰ میلی‌گرم، حداقل ۱۰ جعبه، ترجیحاً نزدیک غرب تهران',
    metadata: {
      urgencyLevel: 5,
      quantity: { value: 10, unit: 'جعبه' },
      location: { city: 'تهران', province: 'تهران', country: 'IR' },
    },
  },
  {
    type: ListingType.OFFER,
    rawText: 'سرم نرمال سالین ۰.۹٪، ۲۰ عدد، تاریخ انقضا آذر ۱۴۰۵',
    metadata: {
      urgencyLevel: 1,
      expiryDate: '2026-12-01',
      quantity: { value: 20, unit: 'عدد' },
      location: { city: 'اصفهان', province: 'اصفهان', country: 'IR' },
    },
  },
  {
    type: ListingType.NEED,
    rawText: 'به دنبال لووتیروکسین ۱۰۰ میکروگرم، ۳۰ عدد برای بیماران ثابت',
    metadata: {
      urgencyLevel: 4,
      quantity: { value: 30, unit: 'عدد' },
      location: { city: 'شیراز', province: 'فارس', country: 'IR' },
    },
  },
  {
    type: ListingType.OFFER,
    rawText: 'پماد بتامتازون ۰.۱٪، ۸ عدد، تاریخ انقضا مهر ۱۴۰۵، نگهداری در دمای اتاق',
    metadata: {
      urgencyLevel: 2,
      expiryDate: '2026-10-15',
      condition: 'سالم',
      quantity: { value: 8, unit: 'عدد' },
      location: { city: 'مشهد', province: 'خراسان رضوی', country: 'IR' },
      preferredExchangeType: 'sale',
    },
  },
  {
    type: ListingType.NEED,
    rawText: 'نیاز به انسولین گلارژین، ۵ قلم، فوری برای بیمار دیابتی',
    metadata: {
      urgencyLevel: 5,
      quantity: { value: 5, unit: 'قلم' },
      location: { city: 'تبریز', province: 'آذربایجان شرقی', country: 'IR' },
    },
  },
  {
    type: ListingType.OFFER,
    rawText: 'ویتامین D3 قطره‌ای، ۱۲ عدد، انقضا فروردین ۱۴۰۶',
    metadata: {
      urgencyLevel: 1,
      expiryDate: '2027-03-20',
      quantity: { value: 12, unit: 'عدد' },
      location: { city: 'کرج', province: 'البرز', country: 'IR' },
    },
  },
  {
    type: ListingType.NEED,
    rawText: 'آسپرین ۸۰ میلی‌گرم، ۵۰ بسته، برای طرح توزیع',
    metadata: {
      urgencyLevel: 3,
      quantity: { value: 50, unit: 'بسته' },
      location: { city: 'اهواز', province: 'خوزستان', country: 'IR' },
    },
  },
];

async function ensureSamplePharmacies() {
  const pharmacyIds: string[] = [];

  for (const sample of samplePharmacies) {
    let pharmacy = await prisma.pharmacy.findFirst({
      where: { licenseNumber: sample.licenseNumber, deletedAt: null },
    });

    if (!pharmacy) {
      pharmacy = await prisma.pharmacy.create({
        data: {
          name: sample.name,
          licenseNumber: sample.licenseNumber,
          verified: true,
          verificationStatus: PharmacyVerificationStatus.VERIFIED,
          licenseDocumentName: 'seed-sample.pdf',
          licenseSubmittedAt: new Date(),
          reviewedAt: new Date(),
        },
      });
    }

    pharmacyIds.push(pharmacy.id);
  }

  return pharmacyIds;
}

async function main() {
  const pharmacyIds = await ensureSamplePharmacies();

  const existingCount = await prisma.listing.count({
    where: {
      deletedAt: null,
      pharmacyId: { in: pharmacyIds },
    },
  });

  if (existingCount >= sampleListings.length) {
    console.log(`Sample listings already present (${existingCount}). Skipping duplicate seed.`);
    return;
  }

  let created = 0;

  for (let index = 0; index < sampleListings.length; index += 1) {
    const sample = sampleListings[index];
    const pharmacyId = pharmacyIds[index % pharmacyIds.length];

    const duplicate = await prisma.listing.findFirst({
      where: {
        pharmacyId,
        rawText: sample.rawText,
        deletedAt: null,
      },
    });

    if (duplicate) {
      continue;
    }

    await prisma.listing.create({
      data: {
        pharmacyId,
        type: sample.type,
        rawText: sample.rawText,
        metadata: sample.metadata,
        status: ListingStatus.ACTIVE,
      },
    });

    created += 1;
  }

  const total = await prisma.listing.count({ where: { deletedAt: null } });
  console.log(`Created ${created} sample listing(s). Total active listings: ${total}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
