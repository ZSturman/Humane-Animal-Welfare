/**
 * Risk Routes
 * 
 * Risk assessment and urgency management
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '@shelter-link/database';
import { NotFoundError, ForbiddenError } from '../lib/errors.js';
import { requireAuth, requirePermission, requireOrganization } from '../middleware/auth.js';
import { createAuditLog } from '../middleware/audit.js';
import { calculateRiskScore, recalculateOrganizationRiskScores } from '../services/risk-scoring.js';

const quickUpdateSchema = z.object({
  kennelStressLevel: z.enum(['NONE', 'MILD', 'MODERATE', 'SEVERE', 'CRITICAL']).optional(),
  medicalScore: z.number().int().min(0).max(10).optional(),
  behavioralScore: z.number().int().min(0).max(10).optional(),
  notes: z.string().optional(),
});

const overrideSchema = z.object({
  urgencyScore: z.number().int().min(0).max(100),
  riskSeverity: z.enum(['CRITICAL', 'HIGH', 'ELEVATED', 'MODERATE', 'LOW']),
  reason: z.string().min(10),
  publicVisibility: z.boolean().optional(),
  rescueVisibility: z.boolean().optional(),
});

export async function riskRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth());

  /**
   * Get risk profile for animal
   */
  app.get('/animals/:id', {
    schema: {
      description: 'Get risk profile for an animal',
      tags: ['Risk'],
      security: [{ bearerAuth: [] }],
    },
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
            organizationId: true,
            intakeDate: true,
            daysInShelter: true,
          },
        },
      },
    });
    
    if (!profile) {
      throw new NotFoundError('Risk profile', id);
    }
    
    return {
      success: true,
      data: profile,
    };
  });

  /**
   * Quick update risk factors (minimal cognitive effort for staff)
   */
  app.patch('/animals/:id/quick-update', {
    preHandler: [requireOrganization(), requirePermission('animal:write')],
    schema: {
      description: 'Quick update risk factors for staff efficiency',
      tags: ['Risk'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = quickUpdateSchema.parse(request.body);
    
    // Verify animal belongs to org
    const animal = await prisma.animal.findUnique({
      where: { id },
      include: { riskProfile: true },
    });
    
    if (!animal) {
      throw new NotFoundError('Animal', id);
    }
    
    if (animal.organizationId !== request.organization!.id) {
      throw new ForbiddenError('Access denied');
    }
    
    // Update profile
    const updated = await prisma.riskProfile.update({
      where: { animalId: id },
      data: {
        kennelStressLevel: body.kennelStressLevel,
        medicalScore: body.medicalScore,
        behavioralScore: body.behavioralScore,
        lastCalculated: new Date(),
      },
    });
    
    // Recalculate composite score
    const newScore = await calculateRiskScore(id);
    await prisma.riskProfile.update({
      where: { animalId: id },
      data: {
        urgencyScore: newScore.urgencyScore,
        riskSeverity: newScore.riskSeverity,
        riskReasons: newScore.riskReasons,
      },
    });
    
    // Log if there was a note
    if (body.notes) {
      await prisma.animalNote.create({
        data: {
          animalId: id,
          category: 'ALERT',
          content: body.notes,
          authorId: request.user!.id,
          author: request.user!.name,
        },
      });
    }
    
    // Create event
    await prisma.animalEvent.create({
      data: {
        animalId: id,
        eventType: 'RISK_UPDATED',
        payload: body,
        actorId: request.user!.id,
        actor: request.user!.name,
        organizationId: request.organization!.id,
      },
    });
    
    return {
      success: true,
      data: {
        urgencyScore: newScore.urgencyScore,
        riskSeverity: newScore.riskSeverity,
      },
    };
  });

  /**
   * Manual override of risk score
   */
  app.post('/animals/:id/override', {
    preHandler: [requireOrganization(), requirePermission('animal:write')],
    schema: {
      description: 'Manually override risk score',
      tags: ['Risk'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = overrideSchema.parse(request.body);
    
    const animal = await prisma.animal.findUnique({
      where: { id },
      include: { riskProfile: true },
    });
    
    if (!animal) {
      throw new NotFoundError('Animal', id);
    }
    
    if (animal.organizationId !== request.organization!.id) {
      throw new ForbiddenError('Access denied');
    }
    
    const previousScore = animal.riskProfile?.urgencyScore ?? 0;
    
    const updated = await prisma.riskProfile.update({
      where: { animalId: id },
      data: {
        urgencyScore: body.urgencyScore,
        riskSeverity: body.riskSeverity,
        isManualOverride: true,
        overrideReason: body.reason,
        overrideBy: request.user!.id,
        publicVisibility: body.publicVisibility,
        rescueVisibility: body.rescueVisibility,
        lastCalculated: new Date(),
      },
    });
    
    // Create event
    await prisma.animalEvent.create({
      data: {
        animalId: id,
        eventType: 'RISK_OVERRIDDEN',
        payload: {
          previousScore,
          newScore: body.urgencyScore,
          reason: body.reason,
        },
        actorId: request.user!.id,
        actor: request.user!.name,
        organizationId: request.organization!.id,
      },
    });
    
    await createAuditLog(request, 'OVERRIDE', 'risk_profile', id);
    
    return {
      success: true,
      data: updated,
    };
  });

  /**
   * Recalculate risk scores for organization
   */
  app.post('/recalculate', {
    preHandler: [requireOrganization(), requirePermission('org:write')],
    schema: {
      description: 'Recalculate all risk scores for organization',
      tags: ['Risk'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const orgId = request.organization!.id;
    
    const updated = await recalculateOrganizationRiskScores(orgId);
    
    await createAuditLog(request, 'RECALCULATE', 'risk_profile', orgId);
    
    return {
      success: true,
      data: {
        updated,
        message: `Recalculated ${updated} risk scores`,
      },
    };
  });

  /**
   * Get risk summary/dashboard for organization
   */
  app.get('/dashboard', {
    preHandler: [requireOrganization()],
    schema: {
      description: 'Get risk dashboard for organization',
      tags: ['Risk'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const orgId = request.organization!.id;
    
    // Get counts by severity
    const [severityCounts, topAtRisk, recentChanges] = await Promise.all([
      prisma.riskProfile.groupBy({
        by: ['riskSeverity'],
        where: {
          animal: {
            organizationId: orgId,
            status: { in: ['IN_SHELTER', 'IN_FOSTER', 'IN_MEDICAL', 'AVAILABLE'] },
          },
        },
        _count: true,
      }),
      
      // Top 10 at-risk animals
      prisma.animal.findMany({
        where: {
          organizationId: orgId,
          status: { in: ['IN_SHELTER', 'IN_FOSTER', 'IN_MEDICAL', 'AVAILABLE'] },
          riskProfile: {
            urgencyScore: { gte: 60 },
          },
        },
        include: {
          riskProfile: true,
          media: {
            where: { isPrimary: true },
            take: 1,
          },
        },
        orderBy: {
          riskProfile: { urgencyScore: 'desc' },
        },
        take: 10,
      }),
      
      // Recent risk changes (animals that crossed thresholds)
      prisma.animalEvent.findMany({
        where: {
          organizationId: orgId,
          eventType: { in: ['RISK_UPDATED', 'RISK_OVERRIDDEN'] },
          occurredAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
        include: {
          animal: {
            select: { id: true, name: true, species: true },
          },
        },
        orderBy: { occurredAt: 'desc' },
        take: 20,
      }),
    ]);
    
    return {
      success: true,
      data: {
        summary: {
          critical: severityCounts.find(s => s.riskSeverity === 'CRITICAL')?._count ?? 0,
          high: severityCounts.find(s => s.riskSeverity === 'HIGH')?._count ?? 0,
          elevated: severityCounts.find(s => s.riskSeverity === 'ELEVATED')?._count ?? 0,
          moderate: severityCounts.find(s => s.riskSeverity === 'MODERATE')?._count ?? 0,
          low: severityCounts.find(s => s.riskSeverity === 'LOW')?._count ?? 0,
        },
        topAtRisk: topAtRisk.map(a => ({
          id: a.id,
          name: a.name,
          species: a.species,
          urgencyScore: a.riskProfile!.urgencyScore,
          riskSeverity: a.riskProfile!.riskSeverity,
          daysInShelter: a.daysInShelter,
          primaryPhotoUrl: a.media[0]?.url ?? null,
        })),
        recentChanges: recentChanges.map(e => ({
          animalId: e.animal.id,
          animalName: e.animal.name,
          eventType: e.eventType,
          payload: e.payload,
          occurredAt: e.occurredAt.toISOString(),
        })),
        generatedAt: new Date().toISOString(),
      },
    };
  });
}
