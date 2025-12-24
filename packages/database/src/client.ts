/**
 * Shelter Link Database Client
 * 
 * Exports the Prisma client with extensions for common operations
 */

import { PrismaClient } from '@prisma/client';

// Extend PrismaClient with custom methods
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'info', 'warn', 'error']
      : ['error'],
  }).$extends({
    // Add computed fields
    result: {
      animal: {
        // Computed age from birth date
        age: {
          needs: { birthDate: true, birthDateEstimated: true },
          compute(animal) {
            const dob = animal.birthDate ?? animal.birthDateEstimated;
            if (!dob) return null;
            const now = new Date();
            const years = Math.floor(
              (now.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
            );
            const months = Math.floor(
              ((now.getTime() - dob.getTime()) % (365.25 * 24 * 60 * 60 * 1000)) /
              (30.44 * 24 * 60 * 60 * 1000)
            );
            return { years, months };
          },
        },
        // Full breed description
        breedDisplay: {
          needs: { breedPrimary: true, breedSecondary: true, breedDescription: true },
          compute(animal) {
            if (animal.breedDescription) return animal.breedDescription;
            if (animal.breedSecondary) {
              return `${animal.breedPrimary} / ${animal.breedSecondary} Mix`;
            }
            return animal.breedPrimary ?? 'Unknown';
          },
        },
      },
      riskProfile: {
        // Human-readable urgency level
        urgencyLabel: {
          needs: { urgencyScore: true },
          compute(profile) {
            if (profile.urgencyScore >= 80) return 'Critical';
            if (profile.urgencyScore >= 60) return 'High';
            if (profile.urgencyScore >= 40) return 'Elevated';
            if (profile.urgencyScore >= 20) return 'Moderate';
            return 'Low';
          },
        },
      },
    },
    // Add model-level methods
    model: {
      animal: {
        /**
         * Find animals at elevated risk
         */
        async findAtRisk(organizationId?: string) {
          const where = {
            riskProfile: {
              urgencyScore: { gte: 60 },
            },
            status: {
              in: ['IN_SHELTER', 'IN_FOSTER', 'IN_MEDICAL', 'AVAILABLE'] as const,
            },
            ...(organizationId ? { organizationId } : {}),
          };
          
          return prisma.animal.findMany({
            where,
            include: {
              riskProfile: true,
              organization: {
                select: { id: true, name: true, slug: true },
              },
            },
            orderBy: {
              riskProfile: { urgencyScore: 'desc' },
            },
          });
        },
        
        /**
         * Find seniors (7+ years for dogs, 10+ for cats)
         */
        async findSeniors(organizationId?: string) {
          const now = new Date();
          const dogSeniorDate = new Date(now.getFullYear() - 7, now.getMonth(), now.getDate());
          const catSeniorDate = new Date(now.getFullYear() - 10, now.getMonth(), now.getDate());
          
          return prisma.animal.findMany({
            where: {
              ...(organizationId ? { organizationId } : {}),
              status: {
                in: ['IN_SHELTER', 'IN_FOSTER', 'IN_MEDICAL', 'AVAILABLE'] as const,
              },
              OR: [
                {
                  species: 'DOG',
                  birthDate: { lte: dogSeniorDate },
                },
                {
                  species: 'DOG',
                  birthDateEstimated: { lte: dogSeniorDate },
                },
                {
                  species: 'CAT',
                  birthDate: { lte: catSeniorDate },
                },
                {
                  species: 'CAT',
                  birthDateEstimated: { lte: catSeniorDate },
                },
                {
                  ageCategory: { in: ['SENIOR', 'GERIATRIC'] },
                },
              ],
            },
            include: {
              riskProfile: true,
              organization: {
                select: { id: true, name: true, slug: true },
              },
            },
            orderBy: [
              { riskProfile: { urgencyScore: 'desc' } },
              { intakeDate: 'asc' },
            ],
          });
        },
        
        /**
         * Find animals with special needs
         */
        async findSpecialNeeds(organizationId?: string) {
          return prisma.animal.findMany({
            where: {
              ...(organizationId ? { organizationId } : {}),
              status: {
                in: ['IN_SHELTER', 'IN_FOSTER', 'IN_MEDICAL', 'AVAILABLE'] as const,
              },
              riskProfile: {
                hasSpecialNeeds: true,
              },
            },
            include: {
              riskProfile: true,
              medicalRecords: {
                where: { affectsAdoptability: true },
                orderBy: { date: 'desc' },
                take: 5,
              },
              organization: {
                select: { id: true, name: true, slug: true },
              },
            },
            orderBy: [
              { riskProfile: { urgencyScore: 'desc' } },
              { intakeDate: 'asc' },
            ],
          });
        },
      },
    },
  });
};

// Type for the extended client
type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

// Global singleton for development hot reloading
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
