/**
 * Organization Routes (Simplified for Prototype)
 * 
 * Organization listing, join requests, and superadmin management.
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '@shelter-link/database';
import { NotFoundError, ForbiddenError, ValidationError } from '../lib/errors.js';
import { createLogger } from '../lib/logger.js';
import { optionalAuth, requireAuth, requireSuperAdmin, requirePermission } from '../middleware/auth.js';

const logger = createLogger('organizations');

// Schemas
const searchSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  type: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  q: z.string().optional(),
});

const joinRequestSchema = z.object({
  organizationName: z.string().min(2).max(200),
  organizationType: z.string().default('PRIVATE_SHELTER'),
  contactName: z.string().min(2).max(100),
  contactEmail: z.string().email(),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  website: z.string().url().optional(),
  message: z.string().max(2000).optional(),
  estimatedAnimals: z.number().int().min(0).optional(),
});

const createOrgSchema = z.object({
  name: z.string().min(2).max(200),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
  type: z.string().default('PRIVATE_SHELTER'),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  capacity: z.number().int().min(1).optional(),
});

export async function organizationRoutes(app: FastifyInstance) {
  /**
   * List organizations - PUBLIC
   */
  app.get('/', {
    preHandler: [optionalAuth()],
    schema: {
      description: 'Search and list organizations',
      tags: ['Organizations'],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', default: 1 },
          pageSize: { type: 'integer', default: 20 },
          type: { type: 'string' },
          city: { type: 'string' },
          state: { type: 'string' },
          q: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const params = searchSchema.parse(request.query);

    const where: any = { status: 'ACTIVE' };

    if (params.type) {
      where.type = { in: params.type.split(',') };
    }
    if (params.city) {
      where.city = { contains: params.city };
    }
    if (params.state) {
      where.state = params.state;
    }
    if (params.q) {
      where.OR = [
        { name: { contains: params.q } },
        { slug: { contains: params.q } },
      ];
    }

    const total = await prisma.organization.count({ where });

    const organizations = await prisma.organization.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        city: true,
        state: true,
        phone: true,
        email: true,
        website: true,
        _count: {
          select: {
            animals: {
              where: { status: { in: ['IN_SHELTER', 'IN_FOSTER', 'AVAILABLE'] } },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    });

    return {
      success: true,
      data: organizations.map(org => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        type: org.type,
        city: org.city,
        state: org.state,
        animalCount: org._count.animals,
      })),
      pagination: {
        page: params.page,
        pageSize: params.pageSize,
        totalItems: total,
        totalPages: Math.ceil(total / params.pageSize),
      },
    };
  });

  /**
   * GET /organizations/current/stats
   * Get current user's organization statistics
   */
  app.get('/current/stats', {
    preHandler: [requireAuth()],
  }, async (request, reply) => {
    const user = request.user!;
    const orgId = user.organizationId;
    
    // Superadmin gets aggregate stats
    if (user.globalRole === 'SUPERADMIN') {
      const allAnimals = await prisma.animal.findMany({
        include: { riskProfile: true },
      });
      
      const bySeverity = { CRITICAL: 0, HIGH: 0, ELEVATED: 0, MODERATE: 0, LOW: 0 };
      for (const animal of allAnimals) {
        const severity = animal.riskProfile?.riskSeverity as keyof typeof bySeverity;
        if (severity) bySeverity[severity]++;
      }
      
      return {
        success: true,
        data: {
          organizationName: 'All Organizations (Superadmin)',
          totalAnimals: allAnimals.length,
          status: {
            available: allAnimals.filter(a => a.status === 'AVAILABLE').length,
            medical: allAnimals.filter(a => a.status === 'MEDICAL_HOLD').length,
            behavioral: allAnimals.filter(a => a.status === 'BEHAVIORAL_HOLD').length,
            transferred: allAnimals.filter(a => a.status === 'TRANSFER_PENDING').length,
          },
          riskSummary: bySeverity,
          capacity: {
            current: allAnimals.filter(a => ['AVAILABLE', 'MEDICAL_HOLD', 'BEHAVIORAL_HOLD'].includes(a.status)).length,
            total: null,
          },
        },
      };
    }
    
    // Regular staff gets their org stats
    if (!orgId) {
      return reply.status(403).send({
        success: false,
        error: 'No organization assigned',
      });
    }
    
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        animals: {
          include: { riskProfile: true },
        },
      },
    });
    
    if (!org) {
      return reply.status(404).send({
        success: false,
        error: 'Organization not found',
      });
    }
    
    const bySeverity = { CRITICAL: 0, HIGH: 0, ELEVATED: 0, MODERATE: 0, LOW: 0 };
    for (const animal of org.animals) {
      const severity = animal.riskProfile?.riskSeverity as keyof typeof bySeverity;
      if (severity) bySeverity[severity]++;
    }
    
    return {
      success: true,
      data: {
        organizationName: org.name,
        organizationSlug: org.slug,
        totalAnimals: org.animals.length,
        status: {
          available: org.animals.filter(a => a.status === 'AVAILABLE').length,
          medical: org.animals.filter(a => a.status === 'MEDICAL_HOLD').length,
          behavioral: org.animals.filter(a => a.status === 'BEHAVIORAL_HOLD').length,
          transferred: org.animals.filter(a => a.status === 'TRANSFER_PENDING').length,
        },
        riskSummary: bySeverity,
        capacity: {
          current: org.animals.filter(a => ['AVAILABLE', 'MEDICAL_HOLD', 'BEHAVIORAL_HOLD'].includes(a.status)).length,
          total: org.capacity,
        },
      },
    };
  });

  /**
   * Get organization by slug - PUBLIC
   */
  app.get('/:slug', {
    preHandler: [optionalAuth()],
    schema: {
      description: 'Get organization details by slug',
      tags: ['Organizations'],
    },
  }, async (request, reply) => {
    const { slug } = request.params as { slug: string };

    const org = await prisma.organization.findUnique({
      where: { slug },
      include: {
        _count: {
          select: {
            animals: {
              where: { status: { in: ['IN_SHELTER', 'IN_FOSTER', 'AVAILABLE'] } },
            },
          },
        },
        // Include at-risk animals for this org
        animals: {
          where: {
            status: { in: ['IN_SHELTER', 'IN_FOSTER', 'AVAILABLE'] },
            riskProfile: { urgencyScore: { gte: 60 } },
          },
          include: { riskProfile: true },
          orderBy: { riskProfile: { urgencyScore: 'desc' } },
          take: 10,
        },
      },
    });

    if (!org) {
      throw new NotFoundError('Organization', slug);
    }

    return {
      success: true,
      data: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        type: org.type,
        status: org.status,
        address: org.address,
        city: org.city,
        state: org.state,
        zipCode: org.zipCode,
        phone: org.phone,
        email: org.email,
        website: org.website,
        capacity: org.capacity,
        animalCount: org._count.animals,
        atRiskAnimals: org.animals.map(a => ({
          id: a.id,
          name: a.name,
          species: a.species,
          urgencyScore: a.riskProfile?.urgencyScore,
          riskSeverity: a.riskProfile?.riskSeverity,
        })),
      },
    };
  });

  /**
   * Submit join request - PUBLIC (no auth)
   * This is the "Join ShelterLink" CTA endpoint
   */
  app.post('/join-request', {
    schema: {
      description: 'Submit a request to join ShelterLink as a shelter',
      tags: ['Organizations'],
      body: {
        type: 'object',
        required: ['organizationName', 'contactName', 'contactEmail'],
        properties: {
          organizationName: { type: 'string' },
          organizationType: { type: 'string' },
          contactName: { type: 'string' },
          contactEmail: { type: 'string', format: 'email' },
          contactPhone: { type: 'string' },
          address: { type: 'string' },
          city: { type: 'string' },
          state: { type: 'string' },
          zipCode: { type: 'string' },
          website: { type: 'string' },
          message: { type: 'string' },
          estimatedAnimals: { type: 'integer' },
        },
      },
    },
  }, async (request, reply) => {
    const body = joinRequestSchema.parse(request.body);

    // Check for duplicate pending requests
    const existing = await prisma.joinRequest.findFirst({
      where: {
        contactEmail: body.contactEmail.toLowerCase(),
        status: 'PENDING',
      },
    });

    if (existing) {
      throw new ValidationError('A pending request already exists for this email');
    }

    const joinRequest = await prisma.joinRequest.create({
      data: {
        organizationName: body.organizationName,
        organizationType: body.organizationType,
        contactName: body.contactName,
        contactEmail: body.contactEmail.toLowerCase(),
        contactPhone: body.contactPhone,
        address: body.address,
        city: body.city,
        state: body.state,
        zipCode: body.zipCode,
        website: body.website,
        message: body.message,
        estimatedAnimals: body.estimatedAnimals,
        status: 'PENDING',
      },
    });

    logger.info({ requestId: joinRequest.id, orgName: body.organizationName }, 'Join request submitted');

    return {
      success: true,
      message: 'Thank you for your interest in ShelterLink! We will review your request and contact you within 2-3 business days.',
      data: { id: joinRequest.id },
    };
  });

  /**
   * List join requests - SUPERADMIN only
   */
  app.get('/join-requests', {
    preHandler: [requireAuth(), requireSuperAdmin()],
    schema: {
      description: 'List pending join requests (superadmin only)',
      tags: ['Organizations', 'Admin'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const { status } = request.query as { status?: string };

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const requests = await prisma.joinRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        organization: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    return {
      success: true,
      data: requests,
    };
  });

  /**
   * Approve/reject join request - SUPERADMIN only
   */
  app.put('/join-requests/:id', {
    preHandler: [requireAuth(), requireSuperAdmin()],
    schema: {
      description: 'Approve or reject a join request (superadmin only)',
      tags: ['Organizations', 'Admin'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { action, reviewNotes } = request.body as { action: 'approve' | 'reject'; reviewNotes?: string };

    const joinRequest = await prisma.joinRequest.findUnique({ where: { id } });
    if (!joinRequest) {
      throw new NotFoundError('JoinRequest', id);
    }

    if (joinRequest.status !== 'PENDING') {
      throw new ValidationError('This request has already been processed');
    }

    if (action === 'approve') {
      // Create the organization
      const slug = joinRequest.organizationName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      const org = await prisma.organization.create({
        data: {
          name: joinRequest.organizationName,
          slug: `${slug}-${Date.now().toString(36)}`, // Ensure unique
          type: joinRequest.organizationType,
          status: 'ACTIVE',
          address: joinRequest.address,
          city: joinRequest.city,
          state: joinRequest.state,
          zipCode: joinRequest.zipCode,
          phone: joinRequest.contactPhone,
          email: joinRequest.contactEmail,
          website: joinRequest.website,
        },
      });

      // Update join request
      await prisma.joinRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          organizationId: org.id,
          reviewedAt: new Date(),
          reviewedBy: request.user!.name,
          reviewNotes,
        },
      });

      logger.info({ requestId: id, orgId: org.id }, 'Join request approved');

      return {
        success: true,
        message: `Organization "${org.name}" has been created!`,
        data: { organizationId: org.id, slug: org.slug },
      };
    } else {
      // Reject
      await prisma.joinRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          reviewedAt: new Date(),
          reviewedBy: request.user!.name,
          reviewNotes,
        },
      });

      logger.info({ requestId: id }, 'Join request rejected');

      return {
        success: true,
        message: 'Request has been rejected',
      };
    }
  });

  /**
   * Create organization directly - SUPERADMIN only
   */
  app.post('/', {
    preHandler: [requireAuth(), requireSuperAdmin()],
    schema: {
      description: 'Create a new organization (superadmin only)',
      tags: ['Organizations', 'Admin'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const body = createOrgSchema.parse(request.body);

    // Check slug uniqueness
    const existing = await prisma.organization.findUnique({ where: { slug: body.slug } });
    if (existing) {
      throw new ValidationError('Organization slug already exists');
    }

    const org = await prisma.organization.create({
      data: {
        name: body.name,
        slug: body.slug,
        type: body.type,
        status: 'ACTIVE',
        address: body.address,
        city: body.city,
        state: body.state,
        zipCode: body.zipCode,
        latitude: body.latitude,
        longitude: body.longitude,
        phone: body.phone,
        email: body.email,
        website: body.website,
        capacity: body.capacity ?? 100,
      },
    });

    logger.info({ orgId: org.id, name: org.name }, 'Organization created by superadmin');

    return {
      success: true,
      data: org,
    };
  });

  /**
   * Update organization - Requires org admin or superadmin
   */
  app.patch('/:slug', {
    preHandler: [requireAuth(), requirePermission('org:write')],
    schema: {
      description: 'Update organization details',
      tags: ['Organizations'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const body = request.body as Record<string, unknown>;

    const org = await prisma.organization.findUnique({ where: { slug } });
    if (!org) {
      throw new NotFoundError('Organization', slug);
    }

    // Check access - must be superadmin or member of this org
    if (request.user!.globalRole !== 'SUPERADMIN' && request.user!.organizationId !== org.id) {
      throw new ForbiddenError('Access denied to this organization');
    }

    const updated = await prisma.organization.update({
      where: { slug },
      data: { ...body, updatedAt: new Date() },
    });

    return { success: true, data: updated };
  });

  /**
   * Get organization stats - for dashboard
   */
  app.get('/:slug/stats', {
    preHandler: [requireAuth()],
    schema: {
      description: 'Get organization statistics',
      tags: ['Organizations'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const { slug } = request.params as { slug: string };

    const org = await prisma.organization.findUnique({ where: { slug } });
    if (!org) {
      throw new NotFoundError('Organization', slug);
    }

    // Count animals by status
    const statusCounts = await prisma.animal.groupBy({
      by: ['status'],
      where: { organizationId: org.id },
      _count: { id: true },
    });

    // Count at-risk animals
    const atRiskCount = await prisma.animal.count({
      where: {
        organizationId: org.id,
        status: { in: ['IN_SHELTER', 'IN_FOSTER', 'AVAILABLE'] },
        riskProfile: { urgencyScore: { gte: 60 } },
      },
    });

    // Average days in shelter
    const avgLos = await prisma.animal.aggregate({
      where: {
        organizationId: org.id,
        status: { in: ['IN_SHELTER', 'AVAILABLE'] },
      },
      _avg: { daysInShelter: true },
    });

    // This month's outcomes
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const adoptionsThisMonth = await prisma.outcomeEvent.count({
      where: {
        organizationId: org.id,
        outcomeType: 'ADOPTION',
        createdAt: { gte: monthStart },
      },
    });

    return {
      success: true,
      data: {
        totalAnimals: statusCounts.reduce((sum, s) => sum + s._count.id, 0),
        byStatus: Object.fromEntries(statusCounts.map(s => [s.status, s._count.id])),
        atRiskCount,
        averageDaysInShelter: Math.round(avgLos._avg.daysInShelter ?? 0),
        adoptionsThisMonth,
        capacity: org.capacity,
      },
    };
  });
}
