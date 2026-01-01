/**
 * Transfer Routes (Prototype)
 * 
 * Simplified transfer request management between organizations.
 * 
 * TODO (Production):
 * - Add medical/behavioral summaries
 * - Integrate transport coordination
 * - Add real-time notifications
 * - Implement document attachment
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '@shelter-link/database';
import { requireAuth, requirePermission, requireOrganization, optionalAuth } from '../middleware/auth.js';

// ============================================================================
// Schemas
// ============================================================================

const createTransferSchema = z.object({
  animalId: z.string(),
  toOrganizationId: z.string(),
  urgency: z.enum(['CRITICAL', 'HIGH', 'STANDARD', 'LOW']).default('STANDARD'),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

const respondSchema = z.object({
  status: z.enum(['APPROVED', 'DECLINED', 'CANCELLED']),
  responseNotes: z.string().optional(),
});

// ============================================================================
// Routes
// ============================================================================

export async function transferRoutes(app: FastifyInstance) {
  
  /**
   * GET /transfers
   * List transfer requests for authenticated user's organization
   */
  app.get('/', {
    preHandler: [requireAuth(), requireOrganization()],
    schema: {
      description: 'List transfer requests for your organization',
      tags: ['Transfers'],
    },
  }, async (request, reply) => {
    const orgId = request.user!.organizationId!;
    const { direction, status } = request.query as { direction?: string; status?: string };
    
    // Build query
    const where: any = {};
    
    if (direction === 'outgoing') {
      where.fromOrganizationId = orgId;
    } else if (direction === 'incoming') {
      where.toOrganizationId = orgId;
    } else {
      // Default: show both
      where.OR = [
        { fromOrganizationId: orgId },
        { toOrganizationId: orgId },
      ];
    }
    
    if (status) {
      where.status = status;
    }
    
    const transfers = await prisma.transferRequest.findMany({
      where,
      include: {
        animal: {
          include: {
            photos: {
              where: { isThumbnail: true },
              take: 1,
            },
          },
        },
        fromOrganization: {
          select: { id: true, name: true, slug: true, city: true, state: true },
        },
        toOrganization: {
          select: { id: true, name: true, slug: true, city: true, state: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    return {
      success: true,
      data: transfers.map(t => ({
        id: t.id,
        status: t.status,
        urgency: t.urgency,
        reason: t.reason,
        notes: t.notes,
        requestedAt: t.requestedAt.toISOString(),
        requestedByName: t.requestedByName,
        respondedAt: t.respondedAt?.toISOString() ?? null,
        responseNotes: t.responseNotes,
        animal: {
          id: t.animal.id,
          name: t.animal.name,
          species: t.animal.species,
          breedPrimary: t.animal.breedPrimary,
          thumbnailUrl: t.animal.photos[0]?.url ?? null,
        },
        fromOrganization: t.fromOrganization,
        toOrganization: t.toOrganization,
        direction: t.fromOrganizationId === orgId ? 'outgoing' : 'incoming',
      })),
    };
  });

  /**
   * GET /transfers/pending
   * Get count of pending transfers (incoming)
   */
  app.get('/pending', {
    preHandler: [requireAuth(), requireOrganization()],
  }, async (request, reply) => {
    const orgId = request.user!.organizationId!;
    
    const count = await prisma.transferRequest.count({
      where: {
        toOrganizationId: orgId,
        status: 'PENDING',
      },
    });
    
    return { success: true, count };
  });

  /**
   * GET /transfers/:id
   * Get single transfer request details
   */
  app.get('/:id', {
    preHandler: [requireAuth(), requireOrganization()],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const orgId = request.user!.organizationId!;
    
    const transfer = await prisma.transferRequest.findUnique({
      where: { id },
      include: {
        animal: {
          include: {
            photos: true,
            riskProfile: true,
          },
        },
        fromOrganization: true,
        toOrganization: true,
      },
    });
    
    if (!transfer) {
      return reply.status(404).send({
        success: false,
        error: 'Transfer request not found',
      });
    }
    
    // Check user has access to this transfer
    if (transfer.fromOrganizationId !== orgId && transfer.toOrganizationId !== orgId) {
      return reply.status(403).send({
        success: false,
        error: 'Access denied',
      });
    }
    
    return {
      success: true,
      data: {
        ...transfer,
        requestedAt: transfer.requestedAt.toISOString(),
        respondedAt: transfer.respondedAt?.toISOString() ?? null,
        completedAt: transfer.completedAt?.toISOString() ?? null,
        direction: transfer.fromOrganizationId === orgId ? 'outgoing' : 'incoming',
        canRespond: transfer.toOrganizationId === orgId && transfer.status === 'PENDING',
        canCancel: transfer.fromOrganizationId === orgId && transfer.status === 'PENDING',
      },
    };
  });

  /**
   * POST /transfers
   * Create a new transfer request
   */
  app.post('/', {
    preHandler: [requireAuth(), requireOrganization(), requirePermission('transfer:write')],
  }, async (request, reply) => {
    const body = createTransferSchema.parse(request.body);
    const fromOrgId = request.user!.organizationId!;
    const user = request.user!;
    
    // Verify animal exists and belongs to user's org
    const animal = await prisma.animal.findUnique({
      where: { id: body.animalId },
    });
    
    if (!animal) {
      return reply.status(404).send({
        success: false,
        error: 'Animal not found',
      });
    }
    
    if (animal.organizationId !== fromOrgId) {
      return reply.status(403).send({
        success: false,
        error: 'Animal does not belong to your organization',
      });
    }
    
    if (animal.status !== 'AVAILABLE') {
      return reply.status(400).send({
        success: false,
        error: 'Animal is not available for transfer',
      });
    }
    
    // Verify destination org exists
    const toOrg = await prisma.organization.findUnique({
      where: { id: body.toOrganizationId },
    });
    
    if (!toOrg) {
      return reply.status(404).send({
        success: false,
        error: 'Destination organization not found',
      });
    }
    
    if (toOrg.id === fromOrgId) {
      return reply.status(400).send({
        success: false,
        error: 'Cannot transfer to the same organization',
      });
    }
    
    // Check for existing pending transfer
    const existing = await prisma.transferRequest.findFirst({
      where: {
        animalId: body.animalId,
        status: 'PENDING',
      },
    });
    
    if (existing) {
      return reply.status(400).send({
        success: false,
        error: 'A pending transfer request already exists for this animal',
      });
    }
    
    // Create transfer request
    const transfer = await prisma.transferRequest.create({
      data: {
        animalId: body.animalId,
        fromOrganizationId: fromOrgId,
        toOrganizationId: body.toOrganizationId,
        urgency: body.urgency,
        reason: body.reason,
        notes: body.notes,
        requestedByName: user.name,
        status: 'PENDING',
      },
      include: {
        animal: {
          select: { id: true, name: true, species: true },
        },
        toOrganization: {
          select: { id: true, name: true },
        },
      },
    });
    
    // Update animal status
    await prisma.animal.update({
      where: { id: body.animalId },
      data: { status: 'TRANSFER_PENDING' },
    });
    
    // TODO: Send notification to destination org
    
    return reply.status(201).send({
      success: true,
      data: {
        id: transfer.id,
        message: `Transfer request sent to ${transfer.toOrganization.name} for ${transfer.animal.name}`,
      },
    });
  });

  /**
   * PUT /transfers/:id
   * Respond to a transfer request (approve/decline) or cancel
   */
  app.put('/:id', {
    preHandler: [requireAuth(), requireOrganization(), requirePermission('transfer:write')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = respondSchema.parse(request.body);
    const orgId = request.user!.organizationId!;
    const user = request.user!;
    
    const transfer = await prisma.transferRequest.findUnique({
      where: { id },
      include: {
        animal: true,
      },
    });
    
    if (!transfer) {
      return reply.status(404).send({
        success: false,
        error: 'Transfer request not found',
      });
    }
    
    if (transfer.status !== 'PENDING') {
      return reply.status(400).send({
        success: false,
        error: 'Transfer request is no longer pending',
      });
    }
    
    // Determine action type
    const isCancel = body.status === 'CANCELLED';
    const isFromOrg = transfer.fromOrganizationId === orgId;
    const isToOrg = transfer.toOrganizationId === orgId;
    
    // Only from-org can cancel
    if (isCancel && !isFromOrg) {
      return reply.status(403).send({
        success: false,
        error: 'Only the requesting organization can cancel',
      });
    }
    
    // Only to-org can approve/decline
    if (!isCancel && !isToOrg) {
      return reply.status(403).send({
        success: false,
        error: 'Only the receiving organization can approve or decline',
      });
    }
    
    // Update transfer
    const updated = await prisma.transferRequest.update({
      where: { id },
      data: {
        status: body.status,
        responseNotes: body.responseNotes,
        respondedAt: new Date(),
        respondedByName: user.name,
        completedAt: body.status === 'APPROVED' ? new Date() : null,
      },
    });
    
    // Handle animal status update
    if (body.status === 'APPROVED') {
      // Transfer the animal to the new org
      await prisma.animal.update({
        where: { id: transfer.animalId },
        data: {
          organizationId: transfer.toOrganizationId,
          status: 'AVAILABLE',
        },
      });
    } else {
      // Reset animal to available
      await prisma.animal.update({
        where: { id: transfer.animalId },
        data: { status: 'AVAILABLE' },
      });
    }
    
    const messages = {
      APPROVED: `Transfer approved! ${transfer.animal.name} has been transferred.`,
      DECLINED: `Transfer request declined.`,
      CANCELLED: `Transfer request cancelled.`,
    };
    
    return {
      success: true,
      data: {
        id: updated.id,
        status: updated.status,
        message: messages[body.status],
      },
    };
  });

  /**
   * GET /transfers/organizations
   * Get list of organizations available for transfers
   */
  app.get('/organizations', {
    preHandler: [requireAuth(), requireOrganization()],
  }, async (request, reply) => {
    const myOrgId = request.user!.organizationId!;
    
    const orgs = await prisma.organization.findMany({
      where: {
        status: 'ACTIVE',
        id: { not: myOrgId },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        state: true,
        type: true,
      },
      orderBy: { name: 'asc' },
    });
    
    return {
      success: true,
      data: orgs,
    };
  });
}
