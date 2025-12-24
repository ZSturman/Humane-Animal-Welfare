/**
 * Risk Scoring Service
 * 
 * Calculates composite urgency scores for animals based on multiple factors.
 * This is the core algorithm for surfacing at-risk animals.
 */

import { prisma, Prisma } from '@shelter-link/database';
import { 
  RiskSeverity, 
  RiskReason, 
  KennelStressLevel,
  SpecialNeedsCategory,
  DEFAULT_RISK_SCORING_CONFIG,
  type RiskScoringConfig,
  type RiskFactor,
} from '@shelter-link/types';
import { createLogger } from '../lib/logger.js';

const logger = createLogger('risk-scoring');

// Type for Prisma transaction client
type PrismaTransaction = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

/**
 * Risk score calculation result
 */
interface RiskScoreResult {
  urgencyScore: number;
  riskSeverity: RiskSeverity;
  riskReasons: RiskReason[];
  lengthOfStay: number;
  targetLos: number | null;
  losPercentile: number | null;
  medicalScore: number;
  hasMedicalDeadline: boolean;
  medicalConditions: string[];
  behavioralScore: number;
  kennelStressLevel: KennelStressLevel;
  enrichmentDeficit: boolean;
  shelterCapacity: number | null;
  speciesCapacity: number | null;
  isOverCapacity: boolean;
  adoptabilityScore: number | null;
  isSenior: boolean;
  hasSpecialNeeds: boolean;
  specialNeedsCategories: SpecialNeedsCategory[];
  vulnerableCategory: string | null;
  lastCalculated: Date;
  algorithmVersion: string;
}

/**
 * Calculate risk score for an animal
 */
export async function calculateRiskScore(
  animalId: string,
  tx?: PrismaTransaction,
  config: RiskScoringConfig = DEFAULT_RISK_SCORING_CONFIG
): Promise<RiskScoreResult> {
  const db = tx ?? prisma;
  
  // Fetch animal with related data
  const animal = await db.animal.findUnique({
    where: { id: animalId },
    include: {
      organization: true,
      medicalRecords: {
        where: {
          followUpRequired: true,
          OR: [
            { affectsAdoptability: true },
            { isTreatable: false },
          ],
        },
        orderBy: { date: 'desc' },
        take: 10,
      },
      behavioralAssessments: {
        orderBy: { date: 'desc' },
        take: 3,
      },
      riskProfile: true,
    },
  });
  
  if (!animal) {
    throw new Error(`Animal not found: ${animalId}`);
  }
  
  const factors: RiskFactor[] = [];
  const riskReasons: RiskReason[] = [];
  
  // Initialize scores
  let losScore = 0;
  let medicalScore = 0;
  let behavioralScore = 0;
  let capacityScore = 0;
  let adoptabilityScore = 0;
  let specialCategoryScore = 0;
  
  // =========================================================================
  // LENGTH OF STAY FACTOR
  // =========================================================================
  const now = new Date();
  const lengthOfStay = Math.floor(
    (now.getTime() - animal.intakeDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  // Determine age category
  let ageCategory = animal.ageCategory;
  if (!ageCategory && (animal.birthDate || animal.birthDateEstimated)) {
    const dob = animal.birthDate ?? animal.birthDateEstimated!;
    const ageYears = (now.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    if (ageYears < 0.5) ageCategory = 'BABY';
    else if (ageYears < 2) ageCategory = 'YOUNG';
    else if (ageYears < 7) ageCategory = 'ADULT';
    else if (ageYears < 10) ageCategory = 'SENIOR';
    else ageCategory = 'GERIATRIC';
  }
  
  // Get target LOS for this species/age
  const speciesTargets = config.targetLos[animal.species] ?? config.targetLos['DOG'];
  const targetLos = speciesTargets?.[ageCategory?.toLowerCase() as keyof typeof speciesTargets] ?? 30;
  
  // Calculate LOS score (0-100)
  const losRatio = lengthOfStay / targetLos;
  if (losRatio >= 3) {
    losScore = 100;
    riskReasons.push(RiskReason.LONG_LOS);
    factors.push({
      factor: RiskReason.LONG_LOS,
      weight: config.weights.lengthOfStay,
      contribution: 100 * config.weights.lengthOfStay,
      explanation: `${lengthOfStay} days in shelter (target: ${targetLos})`,
      evaluatedAt: now,
    });
  } else if (losRatio >= 2) {
    losScore = 80;
    riskReasons.push(RiskReason.LONG_LOS);
  } else if (losRatio >= 1.5) {
    losScore = 60;
    riskReasons.push(RiskReason.LONG_LOS);
  } else if (losRatio >= 1) {
    losScore = 40;
  } else {
    losScore = Math.max(0, losRatio * 40);
  }
  
  // Calculate LOS percentile (simplified - would use historical data in production)
  const losPercentile = Math.min(99, losRatio * 50);
  
  // =========================================================================
  // MEDICAL FACTOR
  // =========================================================================
  const medicalConditions: string[] = [];
  let hasMedicalDeadline = false;
  
  for (const record of animal.medicalRecords) {
    if (record.diagnosis) {
      medicalConditions.push(record.diagnosis);
    }
    
    if (record.followUpRequired && record.followUpDate) {
      const daysToFollowUp = Math.floor(
        (record.followUpDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysToFollowUp <= 3) {
        hasMedicalDeadline = true;
        riskReasons.push(RiskReason.MEDICAL_URGENT);
      }
    }
    
    if (!record.isTreatable) {
      medicalScore = Math.max(medicalScore, 8);
      riskReasons.push(RiskReason.MEDICAL_CRITICAL);
    } else if (record.affectsAdoptability) {
      medicalScore = Math.max(medicalScore, 6);
    }
  }
  
  // Normalize medical score to 0-100
  const normalizedMedicalScore = medicalScore * 10;
  
  // =========================================================================
  // BEHAVIORAL FACTOR
  // =========================================================================
  let kennelStressLevel = KennelStressLevel.NONE;
  let enrichmentDeficit = false;
  
  const latestAssessment = animal.behavioralAssessments[0];
  if (latestAssessment) {
    // Check for concerning results
    if (latestAssessment.result === 'CONCERNING' || latestAssessment.result === 'NOT_ADOPTABLE') {
      behavioralScore = 80;
      riskReasons.push(RiskReason.BEHAVIORAL_DECLINE);
    } else if (latestAssessment.result === 'RESCUE_ONLY' || latestAssessment.result === 'RESTRICTED') {
      behavioralScore = 60;
    } else if (latestAssessment.result === 'NEEDS_TRAINING') {
      behavioralScore = 40;
    }
    
    // Check for kennel stress based on assessment score trend
    if (animal.behavioralAssessments.length >= 2) {
      const previous = animal.behavioralAssessments[1];
      if (latestAssessment.overallScore && previous?.overallScore) {
        const decline = previous.overallScore - latestAssessment.overallScore;
        if (decline >= 3) {
          kennelStressLevel = KennelStressLevel.SEVERE;
          riskReasons.push(RiskReason.KENNEL_STRESS);
        } else if (decline >= 2) {
          kennelStressLevel = KennelStressLevel.MODERATE;
          riskReasons.push(RiskReason.KENNEL_STRESS);
        } else if (decline >= 1) {
          kennelStressLevel = KennelStressLevel.MILD;
        }
      }
    }
  }
  
  // Long LOS often indicates kennel stress
  if (lengthOfStay > targetLos * 2 && kennelStressLevel === KennelStressLevel.NONE) {
    kennelStressLevel = KennelStressLevel.MODERATE;
    enrichmentDeficit = true;
  }
  
  // =========================================================================
  // CAPACITY FACTOR
  // =========================================================================
  // Count current animals in organization
  const orgAnimalCount = await db.animal.count({
    where: {
      organizationId: animal.organizationId,
      status: { in: ['IN_SHELTER', 'IN_MEDICAL', 'HOLD'] },
    },
  });
  
  const speciesCount = await db.animal.count({
    where: {
      organizationId: animal.organizationId,
      species: animal.species,
      status: { in: ['IN_SHELTER', 'IN_MEDICAL', 'HOLD'] },
    },
  });
  
  // Estimate capacity (would use actual capacity data in production)
  const estimatedCapacity = 100; // Placeholder
  const shelterCapacity = (orgAnimalCount / estimatedCapacity) * 100;
  const speciesCapacity = (speciesCount / (estimatedCapacity * 0.5)) * 100;
  const isOverCapacity = shelterCapacity > 100;
  
  if (isOverCapacity) {
    capacityScore = 80;
    riskReasons.push(RiskReason.CAPACITY_PRESSURE);
  } else if (shelterCapacity > 90) {
    capacityScore = 60;
    riskReasons.push(RiskReason.CAPACITY_PRESSURE);
  } else if (shelterCapacity > 80) {
    capacityScore = 40;
  }
  
  // =========================================================================
  // ADOPTABILITY PREDICTION
  // =========================================================================
  // Simplified adoptability scoring (would use ML model in production)
  const existingProfile = animal.riskProfile;
  const profileViews = existingProfile?.profileViews ?? 0;
  const inquiryCount = existingProfile?.inquiryCount ?? 0;
  
  // Base adoptability on views and interest
  let predictedAdoptability = 50; // Default middle score
  
  if (profileViews > 0) {
    const viewsToAppsRatio = inquiryCount / profileViews;
    if (viewsToAppsRatio < 0.01 && lengthOfStay > 14) {
      predictedAdoptability = 30;
      riskReasons.push(RiskReason.LOW_INTEREST);
    } else if (viewsToAppsRatio > 0.1) {
      predictedAdoptability = 70;
    }
  }
  
  // Invert for risk score (low adoptability = high risk)
  adoptabilityScore = 100 - predictedAdoptability;
  
  // =========================================================================
  // SPECIAL CATEGORIES
  // =========================================================================
  let isSenior = false;
  let hasSpecialNeeds = false;
  const specialNeedsCategories: SpecialNeedsCategory[] = [];
  let vulnerableCategory: string | null = null;
  
  // Check for senior
  if (ageCategory === 'SENIOR' || ageCategory === 'GERIATRIC') {
    isSenior = true;
    specialCategoryScore += 20;
    riskReasons.push(RiskReason.SENIOR);
    factors.push({
      factor: RiskReason.SENIOR,
      weight: config.weights.specialCategories * 0.4,
      contribution: 20,
      explanation: `Senior animal (${ageCategory?.toLowerCase()})`,
      evaluatedAt: now,
    });
  }
  
  // Check for special needs
  if (animal.specialNeeds || medicalConditions.length > 0) {
    hasSpecialNeeds = true;
    specialCategoryScore += 15;
    riskReasons.push(RiskReason.SPECIAL_NEEDS);
    
    // Categorize special needs
    if (animal.specialNeeds?.toLowerCase().includes('medication')) {
      specialNeedsCategories.push(SpecialNeedsCategory.MEDICATION);
    }
    if (animal.specialNeeds?.toLowerCase().includes('diet')) {
      specialNeedsCategories.push(SpecialNeedsCategory.SPECIAL_DIET);
    }
    if (animal.specialNeeds?.toLowerCase().includes('blind') || animal.specialNeeds?.toLowerCase().includes('vision')) {
      specialNeedsCategories.push(SpecialNeedsCategory.VISION);
    }
    if (animal.specialNeeds?.toLowerCase().includes('deaf') || animal.specialNeeds?.toLowerCase().includes('hearing')) {
      specialNeedsCategories.push(SpecialNeedsCategory.HEARING);
    }
  }
  
  // Check for large breed (harder to place)
  if (animal.species === 'DOG' && animal.size === 'EXTRA_LARGE') {
    specialCategoryScore += 10;
    riskReasons.push(RiskReason.LARGE_BREED);
    vulnerableCategory = 'large_breed';
  }
  
  // Check for black animals (black dog/cat syndrome)
  if (animal.colorPrimary?.toLowerCase() === 'black') {
    specialCategoryScore += 5;
    riskReasons.push(RiskReason.BLACK_ANIMAL);
    vulnerableCategory = vulnerableCategory ?? 'black_animal';
  }
  
  // =========================================================================
  // COMPOSITE SCORE CALCULATION
  // =========================================================================
  const compositeScore = Math.round(
    (losScore * config.weights.lengthOfStay) +
    (normalizedMedicalScore * config.weights.medical) +
    (behavioralScore * config.weights.behavioral) +
    (capacityScore * config.weights.capacity) +
    (adoptabilityScore * config.weights.adoptability) +
    (specialCategoryScore * config.weights.specialCategories)
  );
  
  // Clamp to 0-100
  const urgencyScore = Math.min(100, Math.max(0, compositeScore));
  
  // Determine severity level
  let riskSeverity: RiskSeverity;
  if (urgencyScore >= config.severityThresholds.critical) {
    riskSeverity = RiskSeverity.CRITICAL;
  } else if (urgencyScore >= config.severityThresholds.high) {
    riskSeverity = RiskSeverity.HIGH;
  } else if (urgencyScore >= config.severityThresholds.elevated) {
    riskSeverity = RiskSeverity.ELEVATED;
  } else if (urgencyScore >= config.severityThresholds.moderate) {
    riskSeverity = RiskSeverity.MODERATE;
  } else {
    riskSeverity = RiskSeverity.LOW;
  }
  
  logger.debug({
    animalId,
    urgencyScore,
    riskSeverity,
    components: {
      los: losScore * config.weights.lengthOfStay,
      medical: normalizedMedicalScore * config.weights.medical,
      behavioral: behavioralScore * config.weights.behavioral,
      capacity: capacityScore * config.weights.capacity,
      adoptability: adoptabilityScore * config.weights.adoptability,
      special: specialCategoryScore * config.weights.specialCategories,
    },
  }, 'Risk score calculated');
  
  return {
    urgencyScore,
    riskSeverity,
    riskReasons: [...new Set(riskReasons)], // Deduplicate
    lengthOfStay,
    targetLos,
    losPercentile,
    medicalScore,
    hasMedicalDeadline,
    medicalConditions,
    behavioralScore,
    kennelStressLevel,
    enrichmentDeficit,
    shelterCapacity,
    speciesCapacity,
    isOverCapacity,
    adoptabilityScore: predictedAdoptability,
    isSenior,
    hasSpecialNeeds,
    specialNeedsCategories,
    vulnerableCategory,
    lastCalculated: now,
    algorithmVersion: config.version,
  };
}

/**
 * Batch recalculate risk scores for all animals in an organization
 */
export async function recalculateOrganizationRiskScores(organizationId: string): Promise<number> {
  const animals = await prisma.animal.findMany({
    where: {
      organizationId,
      status: { in: ['IN_SHELTER', 'IN_FOSTER', 'IN_MEDICAL', 'HOLD', 'AVAILABLE', 'PENDING'] },
    },
    select: { id: true },
  });
  
  let updated = 0;
  
  for (const animal of animals) {
    try {
      const riskScore = await calculateRiskScore(animal.id);
      await prisma.riskProfile.upsert({
        where: { animalId: animal.id },
        update: riskScore,
        create: { animalId: animal.id, ...riskScore },
      });
      updated++;
    } catch (error) {
      logger.error({ error, animalId: animal.id }, 'Failed to recalculate risk score');
    }
  }
  
  logger.info({ organizationId, updated, total: animals.length }, 'Batch risk recalculation complete');
  
  return updated;
}

/**
 * Check for risk threshold crossings and generate alerts
 */
export async function checkRiskThresholds(
  animalId: string,
  previousScore: number,
  newScore: number
): Promise<boolean> {
  const thresholds = [80, 60, 40]; // Critical, High, Elevated
  
  for (const threshold of thresholds) {
    if (previousScore < threshold && newScore >= threshold) {
      // Threshold crossed - would trigger notification here
      logger.info({
        animalId,
        previousScore,
        newScore,
        threshold,
      }, 'Risk threshold crossed');
      return true;
    }
  }
  
  return false;
}
