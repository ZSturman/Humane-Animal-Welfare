/**
 * Risk Routes (Prototype)
 * 
 * Simplified risk assessment endpoints.
 * 
 * TODO (Production):
 * - Add kennel stress tracking
 * - Add medical/behavioral score inputs
 * - Integrate ML-based predictions
 * - Add historical risk tracking
 * - Add admin override capabilities
 */

import type { FastifyInstance } from 'fastify';
import { prisma } from '@shelter-link/database';
import { requireAuth, requireOrganization, requirePermission, optionalAuth } from '../middleware/auth.js';
import { calculateRiskScore, updateAnimalRiskProfile, recalculateOrganizationRiskProfiles } from '../services/risk-scoring.js';

// ============================================================================
// Routes
// ============================================================================

export async function riskRoutes(app: FastifyInstance) {

  /**
   * GET /risk/animals/:id
   * Get risk profile for a specific animal
   */
  app.get('/animals/:id', {
    preHandler: [optionalAuth()],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const profile = await prisma.riskProfile.findUnique({
      where: { animalId: id },
      include: {
        animal: {
          select: {
            id: true,
            name: true,
            species: true,
            intakeDate: true,
            daysInShelter: true,
            ageCategory: true,
            size: true,
            colorPrimary: true,
            specialNeeds: true,
            organization: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
      },
    });
    
    if (!profile) {
      return reply.status(404).send({
        success: false,
        error: 'Risk profile not found',
      });
    }
    
    // Parse risk reasons JSON
    let reasons: string[] = [];
    try {
      reasons = JSON.parse(profile.riskReasons || '[]');
    } catch {
      reasons = [];
    }
    
    return {
      success: true,
      data: {
        animalId: profile.animalId,
        urgencyScore: profile.urgencyScore,
        riskSeverity: profile.riskSeverity,
        riskReasons: reasons,
        lengthOfStay: profile.lengthOfStay,
        isSenior: profile.isSenior,
        hasSpecialNeeds: profile.hasSpecialNeeds,
        lastCalculated: profile.lastCalculated.toISOString(),
        animal: profile.animal,
        // Explain the score
        explanation: getScoreExplanation(profile.urgencyScore, reasons),
      },
    };
  });

  /**
   * POST /risk/animals/:id/recalculate
   * Recalculate risk score for a specific animal
   */
  app.post('/animals/:id/recalculate', {
    preHandler: [requireAuth(), requireOrganization()],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const orgId = request.organization!.id;
    
    // Verify animal belongs to org
    const animal = await prisma.animal.findUnique({
      where: { id },
    });
    
    if (!animal) {
      return reply.status(404).send({
        success: false,
        error: 'Animal not found',
      });
    }
    
    if (animal.organizationId !== orgId) {
      return reply.status(403).send({
        success: false,
        error: 'Access denied',
      });
    }
    
    // Recalculate
    const result = await updateAnimalRiskProfile(id);
    
    return {
      success: true,
      data: result,
    };
  });

  /**
   * POST /risk/organization/recalculate
   * Recalculate all risk scores for organization
   */
  app.post('/organization/recalculate', {
    preHandler: [requireAuth(), requireOrganization(), requirePermission('org:write')],
  }, async (request, reply) => {
    const orgId = request.organization!.id;
    
    const results = await recalculateOrganizationRiskProfiles(orgId);
    
    return {
      success: true,
      data: {
        totalAnimals: results.total,
        recalculated: results.updated,
        errors: results.errors,
        message: `Recalculated risk scores for ${results.updated} animals`,
      },
    };
  });

  /**
   * GET /risk/summary
   * Get risk summary for organization
   */
  app.get('/summary', {
    preHandler: [requireAuth(), requireOrganization()],
  }, async (request, reply) => {
    const orgId = request.organization!.id;
    
    // Get animals with their risk profiles
    const animals = await prisma.animal.findMany({
      where: {
        organizationId: orgId,
        status: { in: ['AVAILABLE', 'MEDICAL_HOLD', 'BEHAVIORAL_HOLD'] },
      },
      include: {
        riskProfile: true,
      },
    });
    
    // Count by severity
    const bySeverity = {
      CRITICAL: 0,
      HIGH: 0,
      ELEVATED: 0,
      MODERATE: 0,
      LOW: 0,
    };
    
    for (const animal of animals) {
      const severity = animal.riskProfile?.riskSeverity as keyof typeof bySeverity;
      if (severity && bySeverity[severity] !== undefined) {
        bySeverity[severity]++;
      }
    }
    
    // Get top at-risk animals
    const topAtRisk = animals
      .filter(a => a.riskProfile)
      .sort((a, b) => (b.riskProfile?.urgencyScore ?? 0) - (a.riskProfile?.urgencyScore ?? 0))
      .slice(0, 5)
      .map(a => ({
        id: a.id,
        name: a.name,
        species: a.species,
        urgencyScore: a.riskProfile?.urgencyScore,
        riskSeverity: a.riskProfile?.riskSeverity,
        daysInShelter: a.daysInShelter,
      }));
    
    return {
      success: true,
      data: {
        totalAnimals: animals.length,
        bySeverity,
        topAtRisk,
        criticalCount: bySeverity.CRITICAL,
        highRiskCount: bySeverity.CRITICAL + bySeverity.HIGH,
      },
    };
  });

  /**
   * GET /risk/factors
   * Get explanation of risk factors used in scoring
   */
  app.get('/factors', async (request, reply) => {
    return {
      success: true,
      data: {
        factors: [
          {
            name: 'Length of Stay',
            weight: 40,
            description: 'Animals with longer shelter stays face increased risk',
            thresholds: [
              { days: 60, score: 'Maximum (40 points)' },
              { days: 30, score: 'High (25 points)' },
              { days: 14, score: 'Moderate (scaled)' },
            ],
          },
          {
            name: 'Senior Status',
            weight: 20,
            description: 'Senior and geriatric animals are often overlooked',
            applies: 'SENIOR and GERIATRIC age categories',
          },
          {
            name: 'Special Needs',
            weight: 20,
            description: 'Animals with medical or behavioral needs require more resources',
            applies: 'Any animal with documented special needs',
          },
          {
            name: 'Large Breed Dogs',
            weight: 10,
            description: 'Large and extra-large dogs face adoption challenges',
            applies: 'LARGE and EXTRA_LARGE dogs only',
          },
          {
            name: 'Black Animal Bias',
            weight: 10,
            description: 'Black animals are statistically adopted at lower rates',
            applies: 'Animals with black as primary color',
          },
        ],
        severityLevels: [
          { level: 'CRITICAL', minScore: 80, action: 'Immediate intervention needed' },
          { level: 'HIGH', minScore: 60, action: 'Priority attention required' },
          { level: 'ELEVATED', minScore: 40, action: 'Close monitoring recommended' },
          { level: 'MODERATE', minScore: 20, action: 'Standard care protocols' },
          { level: 'LOW', minScore: 0, action: 'Routine monitoring' },
        ],
      },
    };
  });
}

// ============================================================================
// Helpers
// ============================================================================

function getScoreExplanation(score: number, reasons: string[]): string {
  const reasonLabels: Record<string, string> = {
    'LONG_LOS': 'extended shelter stay',
    'SENIOR': 'senior status',
    'SPECIAL_NEEDS': 'special needs',
    'LARGE_BREED': 'large breed challenges',
    'BLACK_ANIMAL': 'black animal bias',
  };
  
  const readableReasons = reasons
    .map(r => reasonLabels[r] || r)
    .join(', ');
  
  if (score >= 80) {
    return `CRITICAL: This animal needs immediate attention due to ${readableReasons || 'multiple risk factors'}.`;
  } else if (score >= 60) {
    return `HIGH RISK: Priority placement needed. Contributing factors: ${readableReasons || 'elevated risk indicators'}.`;
  } else if (score >= 40) {
    return `ELEVATED: Enhanced visibility recommended due to ${readableReasons || 'moderate risk factors'}.`;
  } else if (score >= 20) {
    return `MODERATE: Standard care with attention to ${readableReasons || 'typical adoption timeline'}.`;
  } else {
    return `LOW: Good adoption prospects expected.`;
  }
}
