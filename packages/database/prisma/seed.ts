/**
 * Database Seed Script (Prototype)
 * 
 * Creates demo data for local development:
 * - 1 Superadmin user
 * - 2 Organizations
 * - 3 Users with different roles
 * - 15+ Animals with varied risk levels
 * - Sample photos, transfers, and join requests
 * 
 * Run with: npm run db:seed
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Helper to hash passwords
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Helper to get date X days ago
function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

// Random helper
function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  console.log('🌱 Seeding database...\n');

  // Clear existing data
  await prisma.transferRequest.deleteMany();
  await prisma.outcomeEvent.deleteMany();
  await prisma.intakeEvent.deleteMany();
  await prisma.animalPhoto.deleteMany();
  await prisma.riskProfile.deleteMany();
  await prisma.animal.deleteMany();
  await prisma.joinRequest.deleteMany();
  await prisma.userOrganization.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  // ============================================================================
  // ORGANIZATIONS
  // ============================================================================
  console.log('Creating organizations...');

  const happyPaws = await prisma.organization.create({
    data: {
      name: 'Happy Paws Shelter',
      slug: 'happy-paws',
      type: 'PRIVATE_SHELTER',
      status: 'ACTIVE',
      address: '123 Main Street',
      city: 'Springfield',
      state: 'IL',
      zipCode: '62701',
      latitude: 39.7817,
      longitude: -89.6501,
      phone: '(555) 123-4567',
      email: 'info@happypaws.org',
      website: 'https://happypaws.org',
      capacity: 150,
    },
  });

  const secondChance = await prisma.organization.create({
    data: {
      name: 'Second Chance Rescue',
      slug: 'second-chance',
      type: 'RESCUE',
      status: 'ACTIVE',
      address: '456 Oak Avenue',
      city: 'Chicago',
      state: 'IL',
      zipCode: '60601',
      latitude: 41.8781,
      longitude: -87.6298,
      phone: '(555) 234-5678',
      email: 'info@secondchance.org',
      website: 'https://secondchance.org',
      capacity: 50,
    },
  });

  console.log(`  ✓ Created: ${happyPaws.name}`);
  console.log(`  ✓ Created: ${secondChance.name}\n`);

  // ============================================================================
  // USERS
  // ============================================================================
  console.log('Creating users...');

  // Superadmin (global, not tied to org)
  const superadmin = await prisma.user.create({
    data: {
      email: 'superadmin@shelterlink.org',
      passwordHash: await hashPassword('admin123'),
      name: 'Super Admin',
      globalRole: 'SUPERADMIN',
      status: 'ACTIVE',
    },
  });

  // Admin at Happy Paws
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@happypaws.org',
      passwordHash: await hashPassword('password123'),
      name: 'Sarah Johnson',
      phone: '(555) 111-1111',
      globalRole: 'PUBLIC',
      status: 'ACTIVE',
    },
  });

  await prisma.userOrganization.create({
    data: {
      userId: adminUser.id,
      organizationId: happyPaws.id,
      role: 'ADMIN',
      isPrimary: true,
    },
  });

  // Staff at Happy Paws
  const staffUser = await prisma.user.create({
    data: {
      email: 'volunteer@happypaws.org',
      passwordHash: await hashPassword('password123'),
      name: 'Mike Thompson',
      globalRole: 'PUBLIC',
      status: 'ACTIVE',
    },
  });

  await prisma.userOrganization.create({
    data: {
      userId: staffUser.id,
      organizationId: happyPaws.id,
      role: 'VOLUNTEER',
      isPrimary: true,
    },
  });

  // Admin at Second Chance
  const rescueAdmin = await prisma.user.create({
    data: {
      email: 'admin@secondchance.org',
      passwordHash: await hashPassword('password123'),
      name: 'Lisa Chen',
      globalRole: 'PUBLIC',
      status: 'ACTIVE',
    },
  });

  await prisma.userOrganization.create({
    data: {
      userId: rescueAdmin.id,
      organizationId: secondChance.id,
      role: 'ADMIN',
      isPrimary: true,
    },
  });

  console.log(`  ✓ Superadmin: superadmin@shelterlink.org / admin123`);
  console.log(`  ✓ Admin:      admin@happypaws.org / password123`);
  console.log(`  ✓ Volunteer:  volunteer@happypaws.org / password123`);
  console.log(`  ✓ Rescue:     admin@secondchance.org / password123\n`);

  // ============================================================================
  // ANIMALS
  // ============================================================================
  console.log('Creating animals...');

  const animals = [
    // CRITICAL risk - long stay dogs
    {
      name: 'Shadow',
      species: 'DOG',
      breedPrimary: 'German Shepherd',
      breedSecondary: 'Labrador',
      sex: 'MALE',
      ageCategory: 'SENIOR',
      size: 'LARGE',
      colorPrimary: 'Black',
      description: 'Shadow is a gentle giant who loves long walks and belly rubs. He is looking for a quiet home where he can spend his golden years.',
      specialNeeds: 'Requires daily medication for arthritis',
      intakeDaysAgo: 90,
      status: 'AVAILABLE',
    },
    {
      name: 'Midnight',
      species: 'CAT',
      breedPrimary: 'Domestic Shorthair',
      sex: 'FEMALE',
      ageCategory: 'ADULT',
      size: 'MEDIUM',
      colorPrimary: 'Black',
      description: 'Midnight is a beautiful black cat with mesmerizing green eyes. She loves to cuddle and would make a perfect companion.',
      intakeDaysAgo: 75,
      status: 'AVAILABLE',
    },
    {
      name: 'Duke',
      species: 'DOG',
      breedPrimary: 'Pit Bull',
      breedSecondary: 'Mastiff',
      sex: 'MALE',
      ageCategory: 'ADULT',
      size: 'EXTRA_LARGE',
      colorPrimary: 'Brindle',
      description: 'Duke is a big lovable goofball who thinks he\'s a lap dog. Great with kids!',
      intakeDaysAgo: 65,
      status: 'AVAILABLE',
    },

    // HIGH risk
    {
      name: 'Whiskers',
      species: 'CAT',
      breedPrimary: 'Persian',
      sex: 'MALE',
      ageCategory: 'GERIATRIC',
      size: 'MEDIUM',
      colorPrimary: 'White',
      description: 'Whiskers is a dignified senior gentleman who enjoys a peaceful environment.',
      specialNeeds: 'Needs regular grooming',
      intakeDaysAgo: 45,
      status: 'AVAILABLE',
    },
    {
      name: 'Bear',
      species: 'DOG',
      breedPrimary: 'Great Dane',
      sex: 'MALE',
      ageCategory: 'ADULT',
      size: 'EXTRA_LARGE',
      colorPrimary: 'Black',
      description: 'Bear is gentle despite his imposing size. He loves children and other dogs.',
      intakeDaysAgo: 50,
      status: 'AVAILABLE',
    },

    // ELEVATED risk
    {
      name: 'Luna',
      species: 'DOG',
      breedPrimary: 'Husky',
      breedSecondary: 'Malamute',
      sex: 'FEMALE',
      ageCategory: 'YOUNG',
      size: 'LARGE',
      colorPrimary: 'Gray',
      colorSecondary: 'White',
      description: 'Luna is an energetic and playful pup who needs an active family.',
      intakeDaysAgo: 35,
      status: 'AVAILABLE',
    },
    {
      name: 'Oliver',
      species: 'CAT',
      breedPrimary: 'Maine Coon',
      sex: 'MALE',
      ageCategory: 'SENIOR',
      size: 'LARGE',
      colorPrimary: 'Orange',
      description: 'Oliver is a majestic fluffball who rules the cat room with a velvet paw.',
      intakeDaysAgo: 28,
      status: 'AVAILABLE',
    },

    // MODERATE risk
    {
      name: 'Bella',
      species: 'DOG',
      breedPrimary: 'Golden Retriever',
      sex: 'FEMALE',
      ageCategory: 'ADULT',
      size: 'LARGE',
      colorPrimary: 'Golden',
      description: 'Bella is the perfect family dog - friendly, patient, and loves everyone.',
      goodWithChildren: true,
      goodWithDogs: true,
      goodWithCats: true,
      intakeDaysAgo: 18,
      status: 'AVAILABLE',
    },
    {
      name: 'Mochi',
      species: 'CAT',
      breedPrimary: 'Scottish Fold',
      sex: 'FEMALE',
      ageCategory: 'YOUNG',
      size: 'SMALL',
      colorPrimary: 'Cream',
      description: 'Mochi is an adorable kitten with the cutest folded ears you\'ve ever seen.',
      intakeDaysAgo: 14,
      status: 'AVAILABLE',
    },
    {
      name: 'Rocky',
      species: 'DOG',
      breedPrimary: 'Boxer',
      sex: 'MALE',
      ageCategory: 'ADULT',
      size: 'LARGE',
      colorPrimary: 'Fawn',
      description: 'Rocky is an athletic, loyal companion who would excel in an active home.',
      intakeDaysAgo: 21,
      status: 'AVAILABLE',
    },

    // LOW risk - new arrivals
    {
      name: 'Daisy',
      species: 'DOG',
      breedPrimary: 'Beagle',
      sex: 'FEMALE',
      ageCategory: 'BABY',
      size: 'SMALL',
      colorPrimary: 'Tricolor',
      description: 'Daisy is an adorable beagle puppy with boundless energy and curiosity.',
      intakeDaysAgo: 5,
      status: 'AVAILABLE',
    },
    {
      name: 'Simba',
      species: 'CAT',
      breedPrimary: 'Abyssinian',
      sex: 'MALE',
      ageCategory: 'YOUNG',
      size: 'MEDIUM',
      colorPrimary: 'Ruddy',
      description: 'Simba is a playful, intelligent cat who loves interactive toys.',
      intakeDaysAgo: 7,
      status: 'AVAILABLE',
    },
    {
      name: 'Coco',
      species: 'DOG',
      breedPrimary: 'French Bulldog',
      sex: 'FEMALE',
      ageCategory: 'YOUNG',
      size: 'SMALL',
      colorPrimary: 'Brindle',
      description: 'Coco is a charming Frenchie who loves cuddles and short walks.',
      intakeDaysAgo: 3,
      status: 'AVAILABLE',
    },

    // Other species
    {
      name: 'Thumper',
      species: 'RABBIT',
      breedPrimary: 'Holland Lop',
      sex: 'MALE',
      ageCategory: 'ADULT',
      size: 'SMALL',
      colorPrimary: 'Gray',
      description: 'Thumper is a friendly rabbit who enjoys being held and petted.',
      intakeDaysAgo: 20,
      status: 'AVAILABLE',
    },
    {
      name: 'Patches',
      species: 'GUINEA_PIG',
      breedPrimary: 'American',
      sex: 'FEMALE',
      ageCategory: 'ADULT',
      size: 'TINY',
      colorPrimary: 'Brown',
      colorSecondary: 'White',
      description: 'Patches loves vegetables and making happy squeaking sounds!',
      intakeDaysAgo: 15,
      status: 'AVAILABLE',
    },

    // Animals at Second Chance Rescue
    {
      name: 'Max',
      species: 'DOG',
      breedPrimary: 'Border Collie',
      sex: 'MALE',
      ageCategory: 'ADULT',
      size: 'MEDIUM',
      colorPrimary: 'Black',
      colorSecondary: 'White',
      description: 'Max is incredibly intelligent and needs mental stimulation.',
      intakeDaysAgo: 12,
      status: 'IN_FOSTER',
      orgIndex: 1, // Second Chance
    },
    {
      name: 'Ginger',
      species: 'CAT',
      breedPrimary: 'Tabby',
      sex: 'FEMALE',
      ageCategory: 'SENIOR',
      size: 'MEDIUM',
      colorPrimary: 'Orange',
      description: 'Ginger is a sweet senior lady looking for a quiet forever home.',
      intakeDaysAgo: 30,
      status: 'AVAILABLE',
      orgIndex: 1,
    },
  ];

  const orgs = [happyPaws, secondChance];
  const createdAnimals = [];

  for (const animalData of animals) {
    const org = orgs[animalData.orgIndex ?? 0];
    
    const animal = await prisma.animal.create({
      data: {
        organizationId: org.id,
        name: animalData.name,
        species: animalData.species,
        breedPrimary: animalData.breedPrimary,
        breedSecondary: animalData.breedSecondary ?? null,
        sex: animalData.sex,
        ageCategory: animalData.ageCategory,
        size: animalData.size,
        colorPrimary: animalData.colorPrimary,
        colorSecondary: animalData.colorSecondary ?? null,
        status: animalData.status,
        description: animalData.description,
        specialNeeds: animalData.specialNeeds ?? null,
        goodWithChildren: animalData.goodWithChildren ?? null,
        goodWithDogs: animalData.goodWithDogs ?? null,
        goodWithCats: animalData.goodWithCats ?? null,
        intakeDate: daysAgo(animalData.intakeDaysAgo),
        daysInShelter: animalData.intakeDaysAgo,
        isPublic: true,
        adoptionFee: animalData.species === 'DOG' ? 25000 : 15000, // $250 / $150 in cents
      },
    });

    // Create intake event
    await prisma.intakeEvent.create({
      data: {
        animalId: animal.id,
        organizationId: org.id,
        intakeType: randomItem(['STRAY', 'OWNER_SURRENDER', 'TRANSFER_IN']),
        intakeDate: animal.intakeDate,
        condition: 'HEALTHY',
        processedBy: 'System Import',
      },
    });

    // Calculate and create risk profile
    const urgencyScore = calculateRiskScore(animalData);
    const riskSeverity = getSeverity(urgencyScore);
    const riskReasons = getRiskReasons(animalData);

    await prisma.riskProfile.create({
      data: {
        animalId: animal.id,
        urgencyScore,
        riskSeverity,
        riskReasons: JSON.stringify(riskReasons),
        lengthOfStay: animalData.intakeDaysAgo,
        isSenior: ['SENIOR', 'GERIATRIC'].includes(animalData.ageCategory),
        hasSpecialNeeds: Boolean(animalData.specialNeeds),
      },
    });

    createdAnimals.push(animal);
  }

  console.log(`  ✓ Created ${createdAnimals.length} animals with risk profiles\n`);

  // ============================================================================
  // TRANSFER REQUEST
  // ============================================================================
  console.log('Creating sample transfer request...');

  await prisma.transferRequest.create({
    data: {
      animalId: createdAnimals[0].id, // Shadow
      fromOrganizationId: happyPaws.id,
      toOrganizationId: secondChance.id,
      status: 'PENDING',
      urgency: 'HIGH',
      reason: 'Shadow needs specialized senior care that Second Chance can provide.',
      requestedByName: 'Sarah Johnson',
    },
  });

  console.log('  ✓ Created pending transfer request\n');

  // ============================================================================
  // JOIN REQUEST
  // ============================================================================
  console.log('Creating sample join request...');

  await prisma.joinRequest.create({
    data: {
      organizationName: 'Midwest Humane Society',
      organizationType: 'MUNICIPAL_SHELTER',
      contactName: 'John Davis',
      contactEmail: 'jdavis@midwesthumane.org',
      contactPhone: '(555) 345-6789',
      city: 'Decatur',
      state: 'IL',
      message: 'We would love to join ShelterLink to help find homes for our animals.',
      estimatedAnimals: 200,
      status: 'PENDING',
    },
  });

  console.log('  ✓ Created pending join request\n');

  console.log('✅ Database seeded successfully!\n');
  console.log('Demo accounts:');
  console.log('  Superadmin: superadmin@shelterlink.org / admin123');
  console.log('  Admin:      admin@happypaws.org / password123');
  console.log('  Volunteer:  volunteer@happypaws.org / password123');
}

// Simple risk score calculation for seed data
function calculateRiskScore(animal: any): number {
  let score = 0;
  
  // Length of stay (40%)
  const losRatio = animal.intakeDaysAgo / 30;
  if (losRatio >= 2) score += 40;
  else if (losRatio >= 1) score += 25;
  else score += losRatio * 20;

  // Senior (20%)
  if (['SENIOR', 'GERIATRIC'].includes(animal.ageCategory)) score += 20;

  // Special needs (20%)
  if (animal.specialNeeds) score += 20;

  // Large breed dog (10%)
  if (animal.species === 'DOG' && ['LARGE', 'EXTRA_LARGE'].includes(animal.size)) score += 10;

  // Black animal (10%)
  if (animal.colorPrimary?.toLowerCase() === 'black') score += 10;

  return Math.min(100, Math.round(score));
}

function getSeverity(score: number): string {
  if (score >= 80) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 40) return 'ELEVATED';
  if (score >= 20) return 'MODERATE';
  return 'LOW';
}

function getRiskReasons(animal: any): string[] {
  const reasons: string[] = [];
  if (animal.intakeDaysAgo >= 30) reasons.push('LONG_LOS');
  if (['SENIOR', 'GERIATRIC'].includes(animal.ageCategory)) reasons.push('SENIOR');
  if (animal.specialNeeds) reasons.push('SPECIAL_NEEDS');
  if (animal.species === 'DOG' && ['LARGE', 'EXTRA_LARGE'].includes(animal.size)) reasons.push('LARGE_BREED');
  if (animal.colorPrimary?.toLowerCase() === 'black') reasons.push('BLACK_ANIMAL');
  return reasons;
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
