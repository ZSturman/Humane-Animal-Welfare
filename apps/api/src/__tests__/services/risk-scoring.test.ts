/**
 * Risk Scoring Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateUrgencyScore,
  calculateLOSScore,
  calculateMedicalScore,
  calculateBehavioralScore,
  calculateCapacityScore,
  calculateSeniorScore,
  calculateSpecialNeedsScore,
  getSeverityFromScore,
  RiskScoringConfig,
} from '@/services/risk-scoring';

// Default test config
const defaultConfig: RiskScoringConfig = {
  weights: {
    los: 0.25,
    medical: 0.20,
    behavioral: 0.15,
    capacity: 0.15,
    senior: 0.10,
    specialNeeds: 0.10,
    adoptability: 0.05,
  },
  thresholds: {
    losTargetDays: {
      DOG: 30,
      CAT: 21,
      RABBIT: 28,
      default: 30,
    },
    seniorAge: {
      DOG: 7,
      CAT: 10,
      RABBIT: 5,
      default: 7,
    },
    capacityCritical: 90,
    capacityWarning: 75,
  },
};

describe('Risk Scoring Service', () => {
  describe('getSeverityFromScore', () => {
    it('should return CRITICAL for scores >= 80', () => {
      expect(getSeverityFromScore(80)).toBe('CRITICAL');
      expect(getSeverityFromScore(100)).toBe('CRITICAL');
      expect(getSeverityFromScore(95)).toBe('CRITICAL');
    });

    it('should return HIGH for scores 60-79', () => {
      expect(getSeverityFromScore(60)).toBe('HIGH');
      expect(getSeverityFromScore(79)).toBe('HIGH');
      expect(getSeverityFromScore(70)).toBe('HIGH');
    });

    it('should return ELEVATED for scores 40-59', () => {
      expect(getSeverityFromScore(40)).toBe('ELEVATED');
      expect(getSeverityFromScore(59)).toBe('ELEVATED');
      expect(getSeverityFromScore(50)).toBe('ELEVATED');
    });

    it('should return MODERATE for scores 20-39', () => {
      expect(getSeverityFromScore(20)).toBe('MODERATE');
      expect(getSeverityFromScore(39)).toBe('MODERATE');
      expect(getSeverityFromScore(30)).toBe('MODERATE');
    });

    it('should return LOW for scores < 20', () => {
      expect(getSeverityFromScore(0)).toBe('LOW');
      expect(getSeverityFromScore(19)).toBe('LOW');
      expect(getSeverityFromScore(10)).toBe('LOW');
    });
  });

  describe('calculateLOSScore', () => {
    it('should return 0 for animals just arrived', () => {
      const score = calculateLOSScore(0, 30);
      expect(score).toBe(0);
    });

    it('should return proportional score for animals within target', () => {
      const score = calculateLOSScore(15, 30);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(25);
    });

    it('should return higher score for animals exceeding target', () => {
      const score = calculateLOSScore(60, 30);
      expect(score).toBeGreaterThan(20);
    });

    it('should cap at maximum score', () => {
      const score = calculateLOSScore(365, 30);
      expect(score).toBeLessThanOrEqual(25);
    });

    it('should handle different species targets', () => {
      const dogScore = calculateLOSScore(30, 30);
      const catScore = calculateLOSScore(30, 21);
      expect(catScore).toBeGreaterThan(dogScore);
    });
  });

  describe('calculateMedicalScore', () => {
    it('should return 0 for healthy animals', () => {
      const score = calculateMedicalScore({
        hasActiveConditions: false,
        urgencyLevel: 'NONE',
        isTreatmentRequired: false,
      });
      expect(score).toBe(0);
    });

    it('should return moderate score for routine conditions', () => {
      const score = calculateMedicalScore({
        hasActiveConditions: true,
        urgencyLevel: 'ROUTINE',
        isTreatmentRequired: true,
      });
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(10);
    });

    it('should return high score for urgent conditions', () => {
      const score = calculateMedicalScore({
        hasActiveConditions: true,
        urgencyLevel: 'URGENT',
        isTreatmentRequired: true,
      });
      expect(score).toBeGreaterThan(10);
    });

    it('should return maximum score for critical conditions', () => {
      const score = calculateMedicalScore({
        hasActiveConditions: true,
        urgencyLevel: 'CRITICAL',
        isTreatmentRequired: true,
      });
      expect(score).toBe(20);
    });
  });

  describe('calculateBehavioralScore', () => {
    it('should return 0 for animals with no behavioral issues', () => {
      const score = calculateBehavioralScore({
        hasIssues: false,
        kennelStressLevel: 'NONE',
        assessmentResult: 'PASSED',
      });
      expect(score).toBe(0);
    });

    it('should increase score with kennel stress', () => {
      const noStress = calculateBehavioralScore({
        hasIssues: false,
        kennelStressLevel: 'NONE',
        assessmentResult: 'PASSED',
      });
      const mildStress = calculateBehavioralScore({
        hasIssues: false,
        kennelStressLevel: 'MILD',
        assessmentResult: 'PASSED',
      });
      const severeStress = calculateBehavioralScore({
        hasIssues: true,
        kennelStressLevel: 'SEVERE',
        assessmentResult: 'PASSED',
      });

      expect(mildStress).toBeGreaterThan(noStress);
      expect(severeStress).toBeGreaterThan(mildStress);
    });

    it('should factor in failed assessments', () => {
      const passed = calculateBehavioralScore({
        hasIssues: false,
        kennelStressLevel: 'MILD',
        assessmentResult: 'PASSED',
      });
      const failed = calculateBehavioralScore({
        hasIssues: true,
        kennelStressLevel: 'MILD',
        assessmentResult: 'FAILED',
      });

      expect(failed).toBeGreaterThan(passed);
    });
  });

  describe('calculateCapacityScore', () => {
    it('should return 0 when capacity is low', () => {
      const score = calculateCapacityScore(50, 75, 90);
      expect(score).toBe(0);
    });

    it('should return moderate score at warning threshold', () => {
      const score = calculateCapacityScore(75, 75, 90);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(15);
    });

    it('should return high score at critical threshold', () => {
      const score = calculateCapacityScore(90, 75, 90);
      expect(score).toBeGreaterThanOrEqual(10);
    });

    it('should cap at maximum when over 100%', () => {
      const score = calculateCapacityScore(120, 75, 90);
      expect(score).toBeLessThanOrEqual(15);
    });
  });

  describe('calculateSeniorScore', () => {
    it('should return 0 for young animals', () => {
      const score = calculateSeniorScore(2, 7);
      expect(score).toBe(0);
    });

    it('should return score at senior threshold', () => {
      const score = calculateSeniorScore(7, 7);
      expect(score).toBeGreaterThan(0);
    });

    it('should return higher score for very senior animals', () => {
      const atThreshold = calculateSeniorScore(7, 7);
      const veryOld = calculateSeniorScore(12, 7);
      expect(veryOld).toBeGreaterThan(atThreshold);
    });

    it('should cap at maximum score', () => {
      const score = calculateSeniorScore(20, 7);
      expect(score).toBeLessThanOrEqual(10);
    });
  });

  describe('calculateSpecialNeedsScore', () => {
    it('should return 0 for animals with no special needs', () => {
      const score = calculateSpecialNeedsScore([]);
      expect(score).toBe(0);
    });

    it('should add points per special need', () => {
      const oneNeed = calculateSpecialNeedsScore(['DEAF']);
      const twoNeeds = calculateSpecialNeedsScore(['DEAF', 'BLIND']);
      const threeNeeds = calculateSpecialNeedsScore(['DEAF', 'BLIND', 'DIABETIC']);

      expect(twoNeeds).toBeGreaterThan(oneNeed);
      expect(threeNeeds).toBeGreaterThan(twoNeeds);
    });

    it('should cap at maximum score', () => {
      const manyNeeds = calculateSpecialNeedsScore([
        'DEAF', 'BLIND', 'DIABETIC', 'MOBILITY', 
        'CHRONIC_PAIN', 'INCONTINENCE', 'HEART_CONDITION'
      ]);
      expect(manyNeeds).toBeLessThanOrEqual(10);
    });
  });

  describe('calculateUrgencyScore', () => {
    it('should combine all factor scores with weights', () => {
      const animal = {
        id: 'test-001',
        species: 'DOG',
        daysInShelter: 45,
        ageInYears: 8,
        specialNeeds: ['DEAF'],
        medical: {
          hasActiveConditions: true,
          urgencyLevel: 'ROUTINE' as const,
          isTreatmentRequired: true,
        },
        behavioral: {
          hasIssues: false,
          kennelStressLevel: 'MILD' as const,
          assessmentResult: 'PASSED' as const,
        },
        capacityPercentage: 80,
      };

      const result = calculateUrgencyScore(animal, defaultConfig);

      expect(result.urgencyScore).toBeGreaterThan(0);
      expect(result.urgencyScore).toBeLessThanOrEqual(100);
      expect(result.severity).toBeDefined();
      expect(result.riskReasons).toBeInstanceOf(Array);
      expect(result.factorScores.los).toBeGreaterThan(0);
      expect(result.factorScores.senior).toBeGreaterThan(0);
    });

    it('should identify risk reasons correctly', () => {
      const criticalAnimal = {
        id: 'test-002',
        species: 'DOG',
        daysInShelter: 120,
        ageInYears: 10,
        specialNeeds: ['BLIND', 'DEAF'],
        medical: {
          hasActiveConditions: true,
          urgencyLevel: 'CRITICAL' as const,
          isTreatmentRequired: true,
        },
        behavioral: {
          hasIssues: true,
          kennelStressLevel: 'SEVERE' as const,
          assessmentResult: 'CONDITIONAL' as const,
        },
        capacityPercentage: 95,
      };

      const result = calculateUrgencyScore(criticalAnimal, defaultConfig);

      expect(result.riskReasons).toContain('LONG_LOS');
      expect(result.riskReasons).toContain('SENIOR');
      expect(result.riskReasons).toContain('MEDICAL_CRITICAL');
      expect(result.riskReasons).toContain('KENNEL_STRESS');
      expect(result.riskReasons).toContain('CAPACITY_PRESSURE');
      expect(result.riskReasons).toContain('SPECIAL_NEEDS');
    });

    it('should return LOW severity for healthy, new animals', () => {
      const healthyAnimal = {
        id: 'test-003',
        species: 'DOG',
        daysInShelter: 2,
        ageInYears: 2,
        specialNeeds: [],
        medical: {
          hasActiveConditions: false,
          urgencyLevel: 'NONE' as const,
          isTreatmentRequired: false,
        },
        behavioral: {
          hasIssues: false,
          kennelStressLevel: 'NONE' as const,
          assessmentResult: 'PASSED' as const,
        },
        capacityPercentage: 50,
      };

      const result = calculateUrgencyScore(healthyAnimal, defaultConfig);

      expect(result.severity).toBe('LOW');
      expect(result.urgencyScore).toBeLessThan(20);
      expect(result.riskReasons.length).toBe(0);
    });

    it('should handle edge cases gracefully', () => {
      const edgeCaseAnimal = {
        id: 'test-004',
        species: 'UNKNOWN',
        daysInShelter: -1, // Invalid
        ageInYears: 0,
        specialNeeds: [],
        medical: {
          hasActiveConditions: false,
          urgencyLevel: 'NONE' as const,
          isTreatmentRequired: false,
        },
        behavioral: {
          hasIssues: false,
          kennelStressLevel: 'NONE' as const,
          assessmentResult: 'PASSED' as const,
        },
        capacityPercentage: 0,
      };

      // Should not throw
      const result = calculateUrgencyScore(edgeCaseAnimal, defaultConfig);
      expect(result.urgencyScore).toBeGreaterThanOrEqual(0);
    });
  });
});
