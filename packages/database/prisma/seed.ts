/**
 * Database Seed Script
 * 
 * Populates the database with sample data for development and testing.
 * Run with: npx prisma db seed
 * 
 * This script creates:
 * - 3 organizations (1 main shelter + 2 partners)
 * - 3 locations for the main shelter
 * - 3 users with different roles
 * - 45 animals with risk profiles
 * - 5 transfer requests between organizations
 */

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================================
// UUID CONSTANTS
// ============================================================================
// Fixed UUIDs for consistent seed data
const ORG_001 = '00000000-0000-0000-0000-000000000001';
const ORG_002 = '00000000-0000-0000-0000-000000000002';
const ORG_003 = '00000000-0000-0000-0000-000000000003';

const LOC_001 = '00000000-0000-0000-0001-000000000001';
const LOC_002 = '00000000-0000-0000-0001-000000000002';
const LOC_003 = '00000000-0000-0000-0001-000000000003';

const USER_001 = '00000000-0000-0000-0002-000000000001';
const USER_002 = '00000000-0000-0000-0002-000000000002';
const USER_003 = '00000000-0000-0000-0002-000000000003';

// Helper to generate consistent IDs
const generateId = () => crypto.randomUUID();

// Helper to get random date in past
const daysAgo = (days: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

// Helper to get random item from array
const randomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// Helper to get random number in range
const randomInt = (min: number, max: number): number => 
  Math.floor(Math.random() * (max - min + 1)) + min;

// ============================================================================
// ORGANIZATION DATA
// ============================================================================

const organizations = [
  {
    id: ORG_001,
    name: 'Happy Paws Shelter',
    slug: 'happy-paws',
    type: 'PRIVATE_SHELTER' as const,
    status: 'ACTIVE' as const,
    address: {
      street: '123 Main Street',
      city: 'Springfield',
      state: 'IL',
      zip: '62701',
      country: 'US',
    },
    latitude: 39.7817,
    longitude: -89.6501,
    timezone: 'America/Chicago',
    phone: '(555) 123-4567',
    email: 'info@happypaws.org',
    website: 'https://happypaws.org',
  },
  {
    id: ORG_002,
    name: 'Second Chance Rescue',
    slug: 'second-chance',
    type: 'RESCUE' as const,
    status: 'ACTIVE' as const,
    address: {
      street: '456 Oak Avenue',
      city: 'Chicago',
      state: 'IL',
      zip: '60601',
      country: 'US',
    },
    latitude: 41.8781,
    longitude: -87.6298,
    timezone: 'America/Chicago',
    phone: '(555) 234-5678',
    email: 'info@secondchance.org',
    website: 'https://secondchance.org',
  },
  {
    id: ORG_003,
    name: 'Midwest Humane Society',
    slug: 'midwest-humane',
    type: 'PRIVATE_SHELTER' as const,
    status: 'ACTIVE' as const,
    address: {
      street: '789 Elm Street',
      city: 'Indianapolis',
      state: 'IN',
      zip: '46201',
      country: 'US',
    },
    latitude: 39.7684,
    longitude: -86.1581,
    timezone: 'America/Indiana/Indianapolis',
    phone: '(555) 345-6789',
    email: 'info@midwesthumane.org',
    website: 'https://midwesthumane.org',
  },
];

// ============================================================================
// LOCATION DATA
// ============================================================================

const locations = [
  {
    id: LOC_001,
    organizationId: ORG_001,
    name: 'Main Building',
    type: 'KENNEL' as const,
    capacity: { DOG: 50 },
    occupancy: { DOG: 35 },
  },
  {
    id: LOC_002,
    organizationId: ORG_001,
    name: 'Cat House',
    type: 'CATTERY' as const,
    capacity: { CAT: 30 },
    occupancy: { CAT: 22 },
  },
  {
    id: LOC_003,
    organizationId: ORG_001,
    name: 'Small Animal Wing',
    type: 'MAIN_BUILDING' as const,
    capacity: { RABBIT: 10, GUINEA_PIG: 10, BIRD: 5 },
    occupancy: { RABBIT: 4, GUINEA_PIG: 4, BIRD: 0 },
  },
];

// ============================================================================
// USER DATA
// ============================================================================

const users = [
  {
    id: USER_001,
    email: 'admin@happypaws.org',
    passwordHash: '$2b$10$dummyHashForDevelopmentOnly', // "password123" in production use proper hashing
    name: 'Sarah Johnson',
    role: 'ADMIN' as const,
    organizationId: ORG_001,
  },
  {
    id: USER_002,
    email: 'staff@happypaws.org',
    passwordHash: '$2b$10$dummyHashForDevelopmentOnly',
    name: 'Mike Chen',
    role: 'STAFF' as const,
    organizationId: ORG_001,
  },
  {
    id: USER_003,
    email: 'volunteer@happypaws.org',
    passwordHash: '$2b$10$dummyHashForDevelopmentOnly',
    name: 'Emily Davis',
    role: 'VOLUNTEER' as const,
    organizationId: ORG_001,
  },
];

// ============================================================================
// ANIMAL DATA
// ============================================================================

const dogNames = ['Max', 'Bella', 'Charlie', 'Luna', 'Buddy', 'Daisy', 'Rocky', 'Molly', 'Duke', 'Sadie'];
const catNames = ['Luna', 'Oliver', 'Milo', 'Cleo', 'Leo', 'Nala', 'Simba', 'Willow', 'Felix', 'Chloe'];
const dogBreeds = ['Golden Retriever', 'Labrador', 'German Shepherd', 'Pit Bull Mix', 'Beagle', 'Boxer', 'Husky', 'Australian Shepherd'];
const catBreeds = ['Domestic Shorthair', 'Siamese', 'Maine Coon', 'Persian', 'Tabby', 'Calico', 'Tuxedo'];
const colors = ['Black', 'White', 'Brown', 'Golden', 'Gray', 'Orange', 'Cream', 'Brindle', 'Spotted'];

// Generate 45 animals
const generateAnimals = () => {
  const animals: any[] = [];
  
  // Dogs (20)
  for (let i = 0; i < 20; i++) {
    const daysInShelter = randomInt(1, 120);
    const weightLb = randomInt(20, 80);
    animals.push({
      id: generateId(),
      name: dogNames[i % dogNames.length] + (i >= 10 ? ` ${Math.floor(i / 10) + 1}` : ''),
      species: 'DOG',
      breedPrimary: randomItem(dogBreeds),
      sex: i % 2 === 0 ? 'MALE' : 'FEMALE',
      weightKg: weightLb * 0.453592, // Convert pounds to kg
      colorPrimary: randomItem(colors),
      status: 'IN_SHELTER',
      intakeDate: daysAgo(daysInShelter),
      organizationId: ORG_001,
      locationId: LOC_001,
      photoUrl: `https://picsum.photos/seed/dog${i}/400/300`,
      daysInShelter,
    });
  }
  
  // Cats (15)
  for (let i = 0; i < 15; i++) {
    const daysInShelter = randomInt(1, 90);
    const weightLb = randomInt(6, 15);
    animals.push({
      id: generateId(),
      name: catNames[i % catNames.length] + (i >= 10 ? ` ${Math.floor(i / 10) + 1}` : ''),
      species: 'CAT',
      breedPrimary: randomItem(catBreeds),
      sex: i % 2 === 0 ? 'MALE' : 'FEMALE',
      weightKg: weightLb * 0.453592, // Convert pounds to kg
      colorPrimary: randomItem(colors),
      status: 'IN_SHELTER',
      intakeDate: daysAgo(daysInShelter),
      organizationId: ORG_001,
      locationId: LOC_002,
      photoUrl: `https://picsum.photos/seed/cat${i}/400/300`,
      daysInShelter,
    });
  }
  
  // Small animals (10)
  const smallAnimals = [
    { species: 'RABBIT', names: ['Thumper', 'Cinnamon', 'Snowball', 'Oreo'] },
    { species: 'GUINEA_PIG', names: ['Peanut', 'Butterscotch', 'Patches', 'Squeaky'] },
    { species: 'BIRD', names: ['Sunny', 'Sky'] },
  ];
  
  let smallIdx = 36;
  for (const { species, names } of smallAnimals) {
    for (const name of names) {
      const daysInShelter = randomInt(1, 60);
      const weightLb = species === 'BIRD' ? 0.1 : randomInt(1, 4);
      animals.push({
        id: generateId(),
        name,
        species,
        breedPrimary: species === 'RABBIT' ? 'Holland Lop' : species === 'GUINEA_PIG' ? 'American' : 'Parakeet',
        sex: smallIdx % 2 === 0 ? 'MALE' : 'FEMALE',
        weightKg: weightLb * 0.453592, // Convert pounds to kg
        colorPrimary: randomItem(['White', 'Brown', 'Gray', 'Mixed']),
        status: 'IN_SHELTER',
        intakeDate: daysAgo(daysInShelter),
        organizationId: ORG_001,
        locationId: LOC_003,
        photoUrl: `https://picsum.photos/seed/${species.toLowerCase()}${smallIdx}/400/300`,
        daysInShelter,
      });
    }
  }
  
  return animals;
};

// ============================================================================
// RISK PROFILE DATA
// ============================================================================

const calculateRiskProfile = (animal: any) => {
  let urgencyScore = 0;
  const riskReasons: string[] = [];
  
  // Length of Stay Score (0-40 points)
  let losScore = 0;
  if (animal.daysInShelter >= 90) {
    losScore = 40;
    riskReasons.push('In shelter 90+ days (critical)');
  } else if (animal.daysInShelter >= 60) {
    losScore = 30;
    riskReasons.push('In shelter 60+ days');
  } else if (animal.daysInShelter >= 30) {
    losScore = 20;
    riskReasons.push('In shelter 30+ days');
  }
  
  // Random medical/behavioral scores for variety
  const medicalScore = randomInt(0, 10);
  const behavioralScore = randomInt(0, 10);
  
  if (medicalScore >= 7) riskReasons.push('Medical needs');
  if (behavioralScore >= 7) riskReasons.push('Behavioral challenges');
  
  urgencyScore = losScore + (medicalScore * 3) + (behavioralScore * 3);
  
  let riskSeverity: 'CRITICAL' | 'HIGH' | 'ELEVATED' | 'MODERATE' | 'LOW';
  if (urgencyScore >= 80) riskSeverity = 'CRITICAL';
  else if (urgencyScore >= 60) riskSeverity = 'HIGH';
  else if (urgencyScore >= 40) riskSeverity = 'ELEVATED';
  else if (urgencyScore >= 20) riskSeverity = 'MODERATE';
  else riskSeverity = 'LOW';
  
  return {
    animalId: animal.id,
    urgencyScore,
    riskSeverity,
    riskReasons,
    lengthOfStay: animal.daysInShelter,
    medicalScore,
    behavioralScore,
  };
};

// ============================================================================
// TRANSFER DATA
// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================

async function main() {
  console.log('🌱 Starting database seed...\n');
  
  // Clear existing data (in reverse order of dependencies)
  console.log('🗑️  Clearing existing data...');
  await prisma.transferRequest.deleteMany();
  await prisma.riskProfile.deleteMany();
  await prisma.animal.deleteMany();
  await prisma.userOrganization.deleteMany();
  await prisma.user.deleteMany();
  await prisma.location.deleteMany();
  await prisma.organization.deleteMany();
  
  // Seed Organizations
  console.log('🏢 Creating organizations...');
  for (const org of organizations) {
    await prisma.organization.create({
      data: org as any,
    });
  }
  console.log(`   ✓ Created ${organizations.length} organizations`);
  
  // Seed Locations
  console.log('📍 Creating locations...');
  for (const loc of locations) {
    await prisma.location.create({
      data: loc as any,
    });
  }
  console.log(`   ✓ Created ${locations.length} locations`);
  
  // Seed Users
  console.log('👤 Creating users...');
  for (const user of users) {
    const { organizationId, role, ...userData } = user;
    const createdUser = await prisma.user.create({
      data: userData as any,
    });
    await prisma.userOrganization.create({
      data: {
        userId: createdUser.id,
        organizationId,
        role,
      } as any,
    });
  }
  console.log(`   ✓ Created ${users.length} users`);
  
  // Seed Animals
  console.log('🐾 Creating animals...');
  const animals = generateAnimals();
  for (const animal of animals) {
    const { daysInShelter, photoUrl, ...animalData } = animal;
    await prisma.animal.create({
      data: {
        ...animalData,
        media: photoUrl ? {
          create: {
            type: 'PHOTO',
            url: photoUrl,
            isPrimary: true,
          },
        } : undefined,
      } as any,
    });
  }
  console.log(`   ✓ Created ${animals.length} animals`);
  
  // Seed Risk Profiles
  console.log('⚠️  Calculating risk profiles...');
  for (const animal of animals) {
    const riskProfile = calculateRiskProfile(animal);
    await prisma.riskProfile.create({
      data: riskProfile as any,
    });
  }
  console.log(`   ✓ Created ${animals.length} risk profiles`);
  
  // Seed Transfers
  console.log('🔄 Creating transfer requests...');
  // Use actual animal IDs from created animals
  const transferData = [
    {
      animalId: animals[0].id,
      fromOrganizationId: ORG_001,
      toOrganizationId: ORG_002,
      status: 'PENDING',
      reason: 'Capacity relief - shelter at 95% capacity',
      transportNotes: `${animals[0].name} is a friendly dog who needs more space to run.`,
      requestedAt: daysAgo(3),
    },
    {
      animalId: animals[4].id,
      fromOrganizationId: ORG_002,
      toOrganizationId: ORG_001,
      status: 'APPROVED',
      reason: 'Medical resources available at destination',
      medicalSummary: `${animals[4].name} needs specialized care.`,
      requestedAt: daysAgo(7),
      respondedAt: daysAgo(5),
    },
    {
      animalId: animals[9].id,
      fromOrganizationId: ORG_001,
      toOrganizationId: ORG_003,
      status: 'IN_TRANSIT',
      reason: 'Breed-specific rescue placement',
      transportNotes: `${animals[9].name} is being transferred to a breed-specific rescue.`,
      requestedAt: daysAgo(14),
      respondedAt: daysAgo(10),
      scheduledDate: daysAgo(1),
    },
    {
      animalId: animals[20].id,
      fromOrganizationId: ORG_003,
      toOrganizationId: ORG_001,
      status: 'COMPLETED',
      reason: 'Foster availability',
      transportNotes: `${animals[20].name} has been successfully transferred and is now in foster care.`,
      requestedAt: daysAgo(21),
      respondedAt: daysAgo(18),
      completedAt: daysAgo(14),
    },
    {
      animalId: animals[24].id,
      fromOrganizationId: ORG_001,
      toOrganizationId: ORG_002,
      status: 'PENDING',
      reason: 'Behavioral resources needed',
      behavioralSummary: `${animals[24].name} needs specialized behavioral training.`,
      requestedAt: daysAgo(1),
    },
  ];
  
  for (const transfer of transferData) {
    await prisma.transferRequest.create({
      data: transfer as any,
    });
  }
  console.log(`   ✓ Created ${transferData.length} transfer requests`);
  
  console.log('\n✅ Database seeded successfully!');
  console.log('\n📊 Summary:');
  console.log(`   Organizations: ${organizations.length}`);
  console.log(`   Locations: ${locations.length}`);
  console.log(`   Users: ${users.length}`);
  console.log(`   Animals: ${animals.length}`);
  console.log(`   Risk Profiles: ${animals.length}`);
  console.log(`   Transfers: 5`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
