/**
 * Organization Routes
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '@shelter-link/database';
import { NotFoundError, ForbiddenError } from '../lib/errors.js';
import { requireAuth, requirePermission, requireOrganization } from '../middleware/auth.js';
import { createAuditLog } from '../middleware/audit.js';

const searchSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  type: z.string().optional(),
  status: z.string().optional(),
  q: z.string().optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  radiusMiles: z.coerce.number().default(50),
});

export async function organizationRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth());

  /**
   * List organizations
   */
  app.get('/', {
    schema: {
      description: 'Search and list organizations',
      tags: ['Organizations'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const params = searchSchema.parse(request.query);
    
    const where: any = {
      status: 'ACTIVE',
    };
    
    if (params.type) {
      where.type = { in: params.type.split(',') };
    }
    
    if (params.q) {
      where.OR = [
        { name: { contains: params.q, mode: 'insensitive' } },
        { slug: { contains: params.q, mode: 'insensitive' } },
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
        status: true,
        address: true,
        phone: true,
        email: true,
        website: true,
        branding: true,
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
    
    const data = organizations.map(org => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      type: org.type,
      status: org.status,
      city: (org.address as any)?.city ?? null,
      state: (org.address as any)?.state ?? null,
      logoUrl: (org.branding as any)?.logoUrl ?? null,
      animalCount: org._count.animals,
    }));
    
    return {
      success: true,
      data,
      pagination: {
        page: params.page,
        pageSize: params.pageSize,
        totalItems: total,
        totalPages: Math.ceil(total / params.pageSize),
        hasNextPage: params.page * params.pageSize < total,
        hasPreviousPage: params.page > 1,
      },
    };
  });

  /**
   * Get organization by slug
   */
  app.get('/:slug', {
    schema: {
      description: 'Get organization by slug',
      tags: ['Organizations'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          slug: { type: 'string' },
        },
        required: ['slug'],
      },
    },
  }, async (request, reply) => {
    const { slug } = request.params as { slug: string };
    
    const org = await prisma.organization.findUnique({
      where: { slug },
      include: {
        locations: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            type: true,
            isPublic: true,
            capacity: true,
            occupancy: true,
          },
        },
        _count: {
          select: {
            animals: {
              where: { status: { in: ['IN_SHELTER', 'IN_FOSTER', 'AVAILABLE'] } },
            },
          },
        },
      },
    });
    
    if (!org) {
      throw new NotFoundError('Organization', slug);
    }
    
    // Calculate stats
    const availableCount = await prisma.animal.count({
      where: { organizationId: org.id, status: 'AVAILABLE' },
    });
    
    const inFosterCount = await prisma.animal.count({
      where: { organizationId: org.id, status: 'IN_FOSTER' },
    });
    
    const avgLos = await prisma.animal.aggregate({
      where: { 
        organizationId: org.id, 
        status: { in: ['IN_SHELTER', 'AVAILABLE'] },
      },
      _avg: { daysInShelter: true },
    });
    
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    
    const adoptionsThisMonth = await prisma.outcomeEvent.count({
      where: {
        organizationId: org.id,
        outcomeType: 'ADOPTION',
        outcomeDate: { gte: monthStart },
      },
    });
    
    return {
      success: true,
      data: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        type: org.type,
        status: org.status,
        address: org.address,
        latitude: org.latitude,
        longitude: org.longitude,
        timezone: org.timezone,
        phone: org.phone,
        email: org.email,
        website: org.website,
        operatingHours: org.operatingHours,
        logoUrl: (org.branding as any)?.logoUrl ?? null,
        locations: org.locations,
        stats: {
          totalAnimals: org._count.animals,
          availableAnimals: availableCount,
          inFoster: inFosterCount,
          avgLengthOfStay: Math.round(avgLos._avg.daysInShelter ?? 0),
          adoptionsThisMonth,
        },
        createdAt: org.createdAt.toISOString(),
        updatedAt: org.updatedAt.toISOString(),
      },
    };
  });

  /**
   * Get organization statistics/dashboard
   */
  app.get('/:slug/stats', {
    preHandler: [requireOrganization()],
    schema: {
      description: 'Get organization statistics',
      tags: ['Organizations'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const { slug } = request.params as { slug: string };
    
    const org = await prisma.organization.findUnique({
      where: { slug },
    });
    
    if (!org) {
      throw new NotFoundError('Organization', slug);
    }
    
    if (request.organization?.id !== org.id) {
      throw new ForbiddenError('Access denied');
    }
    
    // Get comprehensive stats
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);
    
    const [
      totalAnimals,
      statusCounts,
      speciesCounts,
      riskCounts,
      intakesThisMonth,
      outcomesThisMonth,
      adoptionsThisYear,
      avgLos,
    ] = await Promise.all([
      prisma.animal.count({
        where: { organizationId: org.id, status: { in: ['IN_SHELTER', 'IN_FOSTER', 'IN_MEDICAL', 'HOLD', 'AVAILABLE', 'PENDING'] } },
      }),
      prisma.animal.groupBy({
        by: ['status'],
        where: { organizationId: org.id },
        _count: true,
      }),
      prisma.animal.groupBy({
        by: ['species'],
        where: { organizationId: org.id, status: { in: ['IN_SHELTER', 'IN_FOSTER', 'AVAILABLE'] } },
        _count: true,
      }),
      prisma.riskProfile.groupBy({
        by: ['riskSeverity'],
        where: { animal: { organizationId: org.id, status: { in: ['IN_SHELTER', 'IN_FOSTER', 'AVAILABLE'] } } },
        _count: true,
      }),
      prisma.intakeEvent.count({
        where: { organizationId: org.id, intakeDate: { gte: monthStart } },
      }),
      prisma.outcomeEvent.count({
        where: { organizationId: org.id, outcomeDate: { gte: monthStart } },
      }),
      prisma.outcomeEvent.count({
        where: { organizationId: org.id, outcomeType: 'ADOPTION', outcomeDate: { gte: yearStart } },
      }),
      prisma.animal.aggregate({
        where: { organizationId: org.id, status: { in: ['IN_SHELTER', 'AVAILABLE'] } },
        _avg: { daysInShelter: true },
      }),
    ]);
    
    return {
      success: true,
      data: {
        summary: {
          totalAnimals,
          intakesThisMonth,
          outcomesThisMonth,
          adoptionsThisYear,
          avgLengthOfStay: Math.round(avgLos._avg.daysInShelter ?? 0),
        },
        byStatus: Object.fromEntries(statusCounts.map(s => [s.status, s._count])),
        bySpecies: Object.fromEntries(speciesCounts.map(s => [s.species, s._count])),
        byRisk: Object.fromEntries(riskCounts.map(r => [r.riskSeverity, r._count])),
        generatedAt: now.toISOString(),
      },
    };
  });
}
