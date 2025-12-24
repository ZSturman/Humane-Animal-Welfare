/**
 * Transfer Routes
 * 
 * Cross-shelter transfer request management
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '@shelter-link/database';
import { NotFoundError, ForbiddenError, ValidationError } from '../lib/errors.js';
import { requireAuth, requirePermission, requireOrganization } from '../middleware/auth.js';
import { createAuditLog } from '../middleware/audit.js';
import { createLogger } from '../lib/logger.js';

const logger = createLogger('transfers');

const createTransferSchema = z.object({
  animalId: z.string().uuid(),
  toOrganizationId: z.string().uuid(),
  type: z.enum(['PERMANENT', 'FOSTER', 'MEDICAL', 'TEMPORARY', 'SANCTUARY']),
  urgency: z.enum(['CRITICAL', 'URGENT', 'STANDARD', 'FLEXIBLE']),
  reason: z.string().optional(),
  scheduledDate: z.string().datetime().optional(),
  medicalSummary: z.string().optional(),
  behavioralSummary: z.string().optional(),
  notes: z.string().optional(),
});

const respondSchema = z.object({
  status: z.enum(['APPROVED', 'DECLINED']),
  responseNotes: z.string().optional(),
  scheduledDate: z.string().datetime().optional(),
});

export async function transferRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth());

  /**
   * List transfer requests
   */
  app.get('/', {
    preHandler: [requireOrganization()],
    schema: {
      description: 'List transfer requests for organization',
      tags: ['Transfers'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const orgId = request.organization!.id;
    const { direction = 'all', status } = request.query as { direction?: string; status?: string };
    
    const where: any = {
      OR: [
        { fromOrganizationId: orgId },
        { toOrganizationId: orgId },
      ],
    };
    
    if (direction === 'outgoing') {
      delete where.OR;
      where.fromOrganizationId = orgId;
    } else if (direction === 'incoming') {
      delete where.OR;
      where.toOrganizationId = orgId;
    }
    
    if (status) {
      where.status = { in: status.split(',') };
    }
    
    const transfers = await prisma.transferRequest.findMany({
      where,
      include: {
        animal: {
          select: {
            id: true,
            name: true,
            species: true,
            breedPrimary: true,
            breedSecondary: true,
            media: {
              where: { isPrimary: true },
              take: 1,
            },
          },
        },
        fromOrganization: {
          select: { id: true, name: true, slug: true },
        },
        toOrganization: {
          select: { id: true, name: true, slug: true },
        },
      },
      orderBy: { requestedAt: 'desc' },
      take: 100,
    });
    
    const data = transfers.map(t => ({
      id: t.id,
      animal: {
        id: t.animal.id,
        name: t.animal.name,
        species: t.animal.species,
        breedDisplay: t.animal.breedSecondary 
          ? `${t.animal.breedPrimary} / ${t.animal.breedSecondary}`
          : t.animal.breedPrimary,
        primaryPhotoUrl: t.animal.media[0]?.url ?? null,
      },
      fromOrganization: t.fromOrganization,
      toOrganization: t.toOrganization,
      status: t.status,
      type: t.type,
      urgency: t.urgency,
      reason: t.reason,
      requestedAt: t.requestedAt.toISOString(),
      scheduledDate: t.scheduledDate?.toISOString() ?? null,
    }));
    
    return {
      success: true,
      data,
    };
  });

  /**
   * Create transfer request
   */
  app.post('/', {
    preHandler: [requireOrganization(), requirePermission('animal:transfer')],
    schema: {
      description: 'Create a transfer request',
      tags: ['Transfers'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const body = createTransferSchema.parse(request.body);
    const fromOrgId = request.organization!.id;
    
    // Verify animal belongs to requesting org
    const animal = await prisma.animal.findUnique({
      where: { id: body.animalId },
      include: {
        medicalRecords: {
          orderBy: { date: 'desc' },
          take: 5,
        },
        behavioralAssessments: {
          orderBy: { date: 'desc' },
          take: 2,
        },
      },
    });
    
    if (!animal) {
      throw new NotFoundError('Animal', body.animalId);
    }
    
    if (animal.organizationId !== fromOrgId) {
      throw new ForbiddenError('Animal does not belong to your organization');
    }
    
    // Verify destination org exists and accepts transfers
    const toOrg = await prisma.organization.findUnique({
      where: { id: body.toOrganizationId },
    });
    
    if (!toOrg || toOrg.status !== 'ACTIVE') {
      throw new ValidationError('Destination organization not found or inactive');
    }
    
    // Create auto-generated summaries if not provided
    const medicalSummary = body.medicalSummary ?? animal.medicalRecords
      .slice(0, 3)
      .map(r => `${r.date.toLocaleDateString()}: ${r.diagnosis ?? r.treatment ?? 'Exam'}`)
      .join('; ') || 'No recent medical records';
    
    const behavioralSummary = body.behavioralSummary ?? animal.behavioralAssessments
      .map(a => `${a.date.toLocaleDateString()}: ${a.result}`)
      .join('; ') || 'No behavioral assessments';
    
    const transfer = await prisma.transferRequest.create({
      data: {
        animalId: body.animalId,
        fromOrganizationId: fromOrgId,
        toOrganizationId: body.toOrganizationId,
        type: body.type,
        urgency: body.urgency,
        reason: body.reason,
        scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : undefined,
        medicalSummary,
        behavioralSummary,
        requestedById: request.user!.id,
        requestedBy: request.user!.name,
      },
    });
    
    // Create event
    await prisma.animalEvent.create({
      data: {
        animalId: body.animalId,
        eventType: 'TRANSFER_REQUESTED',
        payload: {
          transferId: transfer.id,
          toOrganization: toOrg.name,
          urgency: body.urgency,
        },
        actorId: request.user!.id,
        actor: request.user!.name,
        organizationId: fromOrgId,
      },
    });
    
    await createAuditLog(request, 'CREATE', 'transfer', transfer.id);
    
    logger.info({
      transferId: transfer.id,
      animalId: body.animalId,
      from: fromOrgId,
      to: body.toOrganizationId,
    }, 'Transfer request created');
    
    return {
      success: true,
      data: { id: transfer.id },
    };
  });

  /**
   * Get transfer request details
   */
  app.get('/:id', {
    schema: {
      description: 'Get transfer request details',
      tags: ['Transfers'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const transfer = await prisma.transferRequest.findUnique({
      where: { id },
      include: {
        animal: {
          include: {
            riskProfile: true,
            medicalRecords: {
              orderBy: { date: 'desc' },
              take: 10,
            },
            behavioralAssessments: {
              orderBy: { date: 'desc' },
              take: 5,
            },
            media: {
              orderBy: { sortOrder: 'asc' },
              take: 10,
            },
          },
        },
        fromOrganization: {
          select: { id: true, name: true, slug: true, phone: true, email: true },
        },
        toOrganization: {
          select: { id: true, name: true, slug: true, phone: true, email: true },
        },
      },
    });
    
    if (!transfer) {
      throw new NotFoundError('Transfer request', id);
    }
    
    // Check access
    const orgId = request.organization?.id;
    if (orgId && transfer.fromOrganizationId !== orgId && transfer.toOrganizationId !== orgId) {
      throw new ForbiddenError('Access denied');
    }
    
    return {
      success: true,
      data: transfer,
    };
  });

  /**
   * Respond to transfer request (approve/decline)
   */
  app.post('/:id/respond', {
    preHandler: [requireOrganization(), requirePermission('animal:transfer')],
    schema: {
      description: 'Respond to a transfer request',
      tags: ['Transfers'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = respondSchema.parse(request.body);
    const orgId = request.organization!.id;
    
    const transfer = await prisma.transferRequest.findUnique({
      where: { id },
      include: { animal: true },
    });
    
    if (!transfer) {
      throw new NotFoundError('Transfer request', id);
    }
    
    // Only destination org can respond
    if (transfer.toOrganizationId !== orgId) {
      throw new ForbiddenError('Only destination organization can respond');
    }
    
    if (transfer.status !== 'PENDING') {
      throw new ValidationError('Transfer already responded to');
    }
    
    const updated = await prisma.transferRequest.update({
      where: { id },
      data: {
        status: body.status,
        responseNotes: body.responseNotes,
        scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : transfer.scheduledDate,
        respondedAt: new Date(),
        respondedById: request.user!.id,
        respondedBy: request.user!.name,
      },
    });
    
    // Create event
    await prisma.animalEvent.create({
      data: {
        animalId: transfer.animalId,
        eventType: body.status === 'APPROVED' ? 'TRANSFER_APPROVED' : 'TRANSFER_DECLINED',
        payload: {
          transferId: id,
          responseNotes: body.responseNotes,
        },
        actorId: request.user!.id,
        actor: request.user!.name,
        organizationId: orgId,
      },
    });
    
    await createAuditLog(request, 'UPDATE', 'transfer', id);
    
    logger.info({
      transferId: id,
      status: body.status,
    }, 'Transfer request responded');
    
    return {
      success: true,
      data: updated,
    };
  });

  /**
   * Complete transfer
   */
  app.post('/:id/complete', {
    preHandler: [requireOrganization(), requirePermission('animal:transfer')],
    schema: {
      description: 'Mark transfer as complete',
      tags: ['Transfers'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const orgId = request.organization!.id;
    
    const transfer = await prisma.transferRequest.findUnique({
      where: { id },
      include: {
        animal: true,
        toOrganization: true,
      },
    });
    
    if (!transfer) {
      throw new NotFoundError('Transfer request', id);
    }
    
    if (transfer.status !== 'APPROVED' && transfer.status !== 'SCHEDULED' && transfer.status !== 'IN_TRANSIT') {
      throw new ValidationError('Transfer must be approved before completion');
    }
    
    // Either org can complete
    if (transfer.fromOrganizationId !== orgId && transfer.toOrganizationId !== orgId) {
      throw new ForbiddenError('Access denied');
    }
    
    await prisma.$transaction(async (tx) => {
      // Update transfer status
      await tx.transferRequest.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });
      
      // Update animal's organization
      await tx.animal.update({
        where: { id: transfer.animalId },
        data: {
          organizationId: transfer.toOrganizationId,
          status: 'IN_SHELTER',
          intakeDate: new Date(),
          originalIntakeDate: transfer.animal.intakeDate,
          previousIds: [
            ...(transfer.animal.previousIds as string[] ?? []),
            `${transfer.fromOrganizationId}:${transfer.animal.internalId ?? transfer.animal.id}`,
          ],
        },
      });
      
      // Create outcome event at source
      await tx.outcomeEvent.create({
        data: {
          animalId: transfer.animalId,
          organizationId: transfer.fromOrganizationId,
          outcomeType: 'TRANSFER_OUT',
          outcomeDate: new Date(),
          destinationOrgId: transfer.toOrganizationId,
          destinationOrgName: transfer.toOrganization.name,
          processedById: request.user!.id,
          processedBy: request.user!.name,
        },
      });
      
      // Create intake event at destination
      await tx.intakeEvent.create({
        data: {
          animalId: transfer.animalId,
          organizationId: transfer.toOrganizationId,
          intakeType: 'TRANSFER_IN',
          intakeDate: new Date(),
          condition: 'HEALTHY',
          sourceOrgId: transfer.fromOrganizationId,
          processedById: request.user!.id,
          processedBy: request.user!.name,
        },
      });
      
      // Create event
      await tx.animalEvent.create({
        data: {
          animalId: transfer.animalId,
          eventType: 'TRANSFER_COMPLETED',
          payload: {
            transferId: id,
            from: transfer.fromOrganizationId,
            to: transfer.toOrganizationId,
          },
          actorId: request.user!.id,
          actor: request.user!.name,
          organizationId: transfer.toOrganizationId,
        },
      });
    });
    
    await createAuditLog(request, 'COMPLETE', 'transfer', id);
    
    logger.info({
      transferId: id,
      animalId: transfer.animalId,
    }, 'Transfer completed');
    
    return {
      success: true,
      data: { message: 'Transfer completed successfully' },
    };
  });
}
