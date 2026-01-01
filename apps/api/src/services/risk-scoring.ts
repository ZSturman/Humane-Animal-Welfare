/**
 * Risk Scoring Service (Simplified for Prototype)
 * 
 * Calculates urgency scores for animals based on 5 key factors.
 * For full 470-line version with ML features, see: _archive/services/risk-scoring.full.ts
 * 
 * Simplified Factors:
 *   1. Length of Stay (40%) - Days in shelter vs target
 *   2. Senior Status (20%) - Senior/geriatric animals
 *   3. Special Needs (20%) - Animals with special requirements
 *   4. Large Breed (10%) - Large dogs are harder to place
 *   5. Black Animal Bias (10%) - Documented adoption bias
 * 
 * TODO: Production - Integrate full risk scoring from _archive/services/risk-scoring.full.ts:
 *   - Medical score based on health records
 *   - Behavioral score from assessments
 *   - Shelter capacity pressure
 *   - ML-based adoptability prediction
 *   - Historical data analysis
 *   - Kennel stress detection
 */

import { PrismaClient } from '@prisma/client';
import { createLogger } from '../lib/logger.js';

const logger = createLogger('risk-scoring');
const prisma = new PrismaClient();

// Risk severity levels
export type RiskSeverity = 'CRITICAL' | 'HIGH' | 'ELEVATED' | 'MODERATE' | 'LOW';

// Risk reasons that can be identified
export type RiskReason = 
  | 'LONG_LOS'
  | 'APPROACHING_TARGET_LOS'
  | 'SENIOR'
  | 'SPECIAL_NEEDS'
  | 'LARGE_BREED'
  | 'BLACK_ANIMAL';

export interface RiskScoreResult {
  urgencyScore: number;        // 0-100
  riskSeverity: RiskSeverity;
  riskReasons: RiskReason[];
  lengthOfStay: number;
  isSenior: boolean;
  hasSpecialNeeds: boolean;
}

// Target length of stay by species (in days)
const TARGET_LOS: Record<string, number> = {
  DOG: 30,
  CAT: 21,
  RABBIT: 14,
  GUINEA_PIG: 14,
  HAMSTER: 14,
  BIRD: 21,
  REPTILE: 30,
  FERRET: 21,
  HORSE: 60,
  OTHER: 30,
};

/**
 * Calculate risk score for an animal
 */
export function calculateRiskScore(animal: {
  intakeDate: Date;
  species: string;
  ageCategory: string | null;
  specialNeeds: string | null;
  size: string | null;
  colorPrimary: string | null;
}): RiskScoreResult {
  const riskReasons: RiskReason[] = [];
  let score = 0;

  // 1. LENGTH OF STAY (40% weight)
  const now = new Date();
  const lengthOfStay = Math.floor(
    (now.getTime() - animal.intakeDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const targetLos = TARGET_LOS[animal.species] ?? TARGET_LOS.OTHER;
  const losRatio = lengthOfStay / targetLos;
  
  if (losRatio >= 2) {
    score += 40;
    riskReasons.push('LONG_LOS');
  } else if (losRatio >= 1) {
    score += 25;
    riskReasons.push('APPROACHING_TARGET_LOS');
  } else {
    score += losRatio * 20;
  }

  // 2. SENIOR STATUS (20% weight)
  const isSenior = animal.ageCategory === 'SENIOR' || animal.ageCategory === 'GERIATRIC';
  if (isSenior) {
    score += 20;
    riskReasons.push('SENIOR');
  }

  // 3. SPECIAL NEEDS (20% weight)
  const hasSpecialNeeds = Boolean(animal.specialNeeds && animal.specialNeeds.length > 0);
  if (hasSpecialNeeds) {
    score += 20;
    riskReasons.push('SPECIAL_NEEDS');
  }

  // 4. LARGE BREED (10% weight) - Large dogs are statistically harder to place
  if (animal.species === 'DOG' && (animal.size === 'LARGE' || animal.size === 'EXTRA_LARGE')) {
    score += 10;
    riskReasons.push('LARGE_BREED');
  }

  // 5. BLACK ANIMAL BIAS (10% weight) - Documented adoption bias
  if (animal.colorPrimary?.toLowerCase() === 'black') {
    score += 10;
    riskReasons.push('BLACK_ANIMAL');
  }

  // Clamp to 0-100
  const urgencyScore = Math.min(100, Math.max(0, Math.round(score)));

  // Determine severity level
  let riskSeverity: RiskSeverity;
  if (urgencyScore >= 80) {
    riskSeverity = 'CRITICAL';
  } else if (urgencyScore >= 60) {
    riskSeverity = 'HIGH';
  } else if (urgencyScore >= 40) {
    riskSeverity = 'ELEVATED';
  } else if (urgencyScore >= 20) {
    riskSeverity = 'MODERATE';
  } else {
    riskSeverity = 'LOW';
  }

  return {
    urgencyScore,
    riskSeverity,
    riskReasons,
    lengthOfStay,
    isSenior,
    hasSpecialNeeds,
  };
}

/**
 * Update risk profile for an animal in database
 */
export async function updateAnimalRiskProfile(animalId: string): Promise<RiskScoreResult> {
  const animal = await prisma.animal.findUnique({
    where: { id: animalId },
  });

  if (!animal) {
    throw new Error(`Animal not found: ${animalId}`);
  }

  const result = calculateRiskScore({
    intakeDate: animal.intakeDate,
    species: animal.species,
    ageCategory: animal.ageCategory,
    specialNeeds: animal.specialNeeds,
    size: animal.size,
    colorPrimary: animal.colorPrimary,
  });

  // Upsert risk profile
  await prisma.riskProfile.upsert({
    where: { animalId },
    create: {
      animalId,
      urgencyScore: result.urgencyScore,
      riskSeverity: result.riskSeverity,
      riskReasons: JSON.stringify(result.riskReasons),
      lengthOfStay: result.lengthOfStay,
      isSenior: result.isSenior,
      hasSpecialNeeds: result.hasSpecialNeeds,
      lastCalculated: new Date(),
    },
    update: {
      urgencyScore: result.urgencyScore,
      riskSeverity: result.riskSeverity,
      riskReasons: JSON.stringify(result.riskReasons),
      lengthOfStay: result.lengthOfStay,
      isSenior: result.isSenior,
      hasSpecialNeeds: result.hasSpecialNeeds,
      lastCalculated: new Date(),
    },
  });

  // Also update daysInShelter on animal record
  await prisma.animal.update({
    where: { id: animalId },
    data: { daysInShelter: result.lengthOfStay },
  });

  logger.debug(
    { animalId, score: result.urgencyScore, severity: result.riskSeverity },
    'Updated risk profile'
  );

  return result;
}

/**
 * Recalculate risk profiles for all animals in an organization
 */
export async function recalculateOrganizationRiskProfiles(organizationId: string): Promise<number> {
  const animals = await prisma.animal.findMany({
    where: {
      organizationId,
      status: { in: ['IN_SHELTER', 'IN_FOSTER', 'IN_MEDICAL', 'AVAILABLE', 'PENDING'] },
    },
    select: { id: true },
  });

  let updated = 0;
  for (const animal of animals) {
    try {
      await updateAnimalRiskProfile(animal.id);
      updated++;
    } catch (error) {
      logger.error({ error, animalId: animal.id }, 'Failed to update risk profile');
    }
  }

  logger.info({ organizationId, updated, total: animals.length }, 'Recalculated organization risk profiles');
  return updated;
}
