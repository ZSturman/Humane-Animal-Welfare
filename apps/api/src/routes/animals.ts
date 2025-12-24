/**
 * Animal Routes
 * 
 * CRUD operations for animals with risk profile management
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '@shelter-link/database';
import { NotFoundError, ForbiddenError, ValidationError } from '../lib/errors.js';
import { createLogger } from '../lib/logger.js';
import { createAuditLog } from '../middleware/audit.js';
import { requireAuth, requirePermission, requireOrganization } from '../middleware/auth.js';
import { calculateRiskScore } from '../services/risk-scoring.js';

const logger = createLogger('animals');

// Validation schemas
const createAnimalSchema = z.object({
  name: z.string().min(1).max(100),
  species: z.enum(['DOG', 'CAT', 'RABBIT', 'GUINEA_PIG', 'HAMSTER', 'BIRD', 'REPTILE', 'FERRET', 'HORSE', 'PIG', 'GOAT', 'CHICKEN', 'SMALL_MAMMAL', 'FARM_ANIMAL', 'WILDLIFE', 'OTHER']),
  breedPrimary: z.string().optional(),
  breedSecondary: z.string().optional(),
  breedDescription: z.string().optional(),
  sex: z.enum(['MALE', 'FEMALE', 'UNKNOWN']),
  birthDate: z.string().datetime().optional(),
  birthDateEstimated: z.string().datetime().optional(),
  ageCategory: z.enum(['BABY', 'YOUNG', 'ADULT', 'SENIOR', 'GERIATRIC']).optional(),
  colorPrimary: z.string().optional(),
  colorSecondary: z.string().optional(),
  pattern: z.string().optional(),
  coatType: z.string().optional(),
  weightKg: z.number().positive().optional(),
  size: z.enum(['TINY', 'SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE']).optional(),
  alteredStatus: z.enum(['YES', 'NO', 'UNKNOWN', 'PENDING']).optional(),
  alteredDate: z.string().datetime().optional(),
  microchips: z.array(z.object({
    chipNumber: z.string().min(9).max(20),
    chipType: z.string().optional(),
    isPrimary: z.boolean().optional(),
  })).optional(),
  internalId: z.string().optional(),
  locationId: z.string().uuid().optional(),
  description: z.record(z.string()).optional(),
  specialNeeds: z.string().optional(),
  characteristics: z.array(z.string()).optional(),
  goodWithChildren: z.boolean().optional(),
  goodWithDogs: z.boolean().optional(),
  goodWithCats: z.boolean().optional(),
  houseTrained: z.boolean().optional(),
  crateTrained: z.boolean().optional(),
  leashTrained: z.boolean().optional(),
  specialDiet: z.string().optional(),
  exerciseNeeds: z.enum(['LOW', 'MODERATE', 'HIGH', 'VERY_HIGH']).optional(),
  energyLevel: z.enum(['CALM', 'MODERATE', 'ACTIVE', 'VERY_ACTIVE']).optional(),
  adoptionFee: z.number().int().min(0).optional(),
  isPublic: z.boolean().optional(),
  intake: z.object({
    intakeType: z.enum(['STRAY', 'OWNER_SURRENDER', 'TRANSFER_IN', 'RETURN', 'BORN_IN_CARE', 'OWNER_INTENDED_EUTHANASIA', 'WILDLIFE', 'SEIZED_CUSTODY', 'OTHER']),
    intakeSubtype: z.string().optional(),
    intakeDate: z.string().datetime().optional(),
    condition: z.enum(['HEALTHY', 'TREATABLE_MINOR', 'TREATABLE_MAJOR', 'UNTREATABLE_SUFFERING', 'UNTREATABLE_MANAGEABLE', 'UNDERAGE', 'UNKNOWN']).optional(),
    conditionNotes: z.string().optional(),
    foundLocation: z.string().optional(),
    notes: z.string().optional(),
  }),
});

const searchSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().default('intakeDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  species: z.string().optional(),
  sex: z.string().optional(),
  size: z.string().optional(),
  ageCategory: z.string().optional(),
  status: z.string().optional(),
  organizationId: z.string().uuid().optional(),
  minUrgencyScore: z.coerce.number().int().min(0).max(100).optional(),
  maxUrgencyScore: z.coerce.number().int().min(0).max(100).optional(),
  riskSeverity: z.string().optional(),
  isSenior: z.coerce.boolean().optional(),
  hasSpecialNeeds: z.coerce.boolean().optional(),
  isPublic: z.coerce.boolean().optional(),
  isFeatured: z.coerce.boolean().optional(),
  minDaysInShelter: z.coerce.number().int().min(0).optional(),
  q: z.string().optional(),
  includeRiskProfile: z.coerce.boolean().default(true),
  includeMedia: z.coerce.boolean().default(false),
});

export async function animalRoutes(app: FastifyInstance) {
  // Apply auth to all routes
  app.addHook('preHandler', requireAuth());
  
  /**
   * List/search animals
   */
  app.get('/', {
    schema: {
      description: 'Search and list animals',
      tags: ['Animals'],
      security: [{ bearerAuth: [] }, { apiKey: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', default: 1 },
          pageSize: { type: 'integer', default: 20 },
          sortBy: { type: 'string' },
          sortOrder: { type: 'string', enum: ['asc', 'desc'] },
          species: { type: 'string' },
          status: { type: 'string' },
          minUrgencyScore: { type: 'integer' },
          isSenior: { type: 'boolean' },
          hasSpecialNeeds: { type: 'boolean' },
          q: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const params = searchSchema.parse(request.query);
    
    // Build where clause
    const where: any = {};
    
    // Organization scoping
    if (request.organization) {
      where.organizationId = request.organization.id;
    } else if (params.organizationId) {
      where.organizationId = params.organizationId;
    }
    
    // Filters
    if (params.species) {
      where.species = { in: params.species.split(',') };
    }
    if (params.sex) {
      where.sex = { in: params.sex.split(',') };
    }
    if (params.size) {
      where.size = { in: params.size.split(',') };
    }
    if (params.ageCategory) {
      where.ageCategory = { in: params.ageCategory.split(',') };
    }
    if (params.status) {
      where.status = { in: params.status.split(',') };
    } else {
      // Default to in-shelter/available animals
      where.status = { in: ['IN_SHELTER', 'IN_FOSTER', 'IN_MEDICAL', 'AVAILABLE', 'PENDING'] };
    }
    if (params.isPublic !== undefined) {
      where.isPublic = params.isPublic;
    }
    if (params.isFeatured !== undefined) {
      where.isFeatured = params.isFeatured;
    }
    if (params.minDaysInShelter) {
      where.daysInShelter = { gte: params.minDaysInShelter };
    }
    
    // Risk filters
    if (params.minUrgencyScore !== undefined || params.maxUrgencyScore !== undefined || 
        params.riskSeverity || params.isSenior !== undefined || params.hasSpecialNeeds !== undefined) {
      where.riskProfile = {};
      if (params.minUrgencyScore !== undefined) {
        where.riskProfile.urgencyScore = { gte: params.minUrgencyScore };
      }
      if (params.maxUrgencyScore !== undefined) {
        where.riskProfile.urgencyScore = { 
          ...where.riskProfile.urgencyScore,
          lte: params.maxUrgencyScore 
        };
      }
      if (params.riskSeverity) {
        where.riskProfile.riskSeverity = { in: params.riskSeverity.split(',') };
      }
      if (params.isSenior !== undefined) {
        where.riskProfile.isSenior = params.isSenior;
      }
      if (params.hasSpecialNeeds !== undefined) {
        where.riskProfile.hasSpecialNeeds = params.hasSpecialNeeds;
      }
    }
    
    // Text search
    if (params.q) {
      where.OR = [
        { name: { contains: params.q, mode: 'insensitive' } },
        { breedPrimary: { contains: params.q, mode: 'insensitive' } },
        { breedSecondary: { contains: params.q, mode: 'insensitive' } },
        { internalId: { contains: params.q, mode: 'insensitive' } },
      ];
    }
    
    // Count total
    const total = await prisma.animal.count({ where });
    
    // Fetch animals
    const animals = await prisma.animal.findMany({
      where,
      include: {
        organization: {
          select: { id: true, name: true, slug: true },
        },
        location: {
          select: { id: true, name: true },
        },
        riskProfile: params.includeRiskProfile,
        media: params.includeMedia ? {
          where: { isPublic: true },
          orderBy: { sortOrder: 'asc' },
          take: 5,
        } : false,
      },
      orderBy: params.sortBy === 'urgencyScore' 
        ? { riskProfile: { urgencyScore: params.sortOrder } }
        : { [params.sortBy]: params.sortOrder },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    });
    
    // Transform response
    const data = animals.map(animal => ({
      id: animal.id,
      name: animal.name,
      species: animal.species,
      breedDisplay: animal.breedSecondary 
        ? `${animal.breedPrimary} / ${animal.breedSecondary} Mix`
        : animal.breedPrimary ?? 'Unknown',
      sex: animal.sex,
      ageCategory: animal.ageCategory,
      size: animal.size,
      status: animal.status,
      isPublic: animal.isPublic,
      isFeatured: animal.isFeatured,
      daysInShelter: animal.daysInShelter,
      intakeDate: animal.intakeDate.toISOString(),
      adoptionFee: animal.adoptionFee,
      organization: animal.organization,
      location: animal.location,
      primaryPhotoUrl: animal.media?.[0]?.url ?? null,
      riskSummary: animal.riskProfile ? {
        urgencyScore: animal.riskProfile.urgencyScore,
        severity: animal.riskProfile.riskSeverity,
        isSenior: animal.riskProfile.isSenior,
        hasSpecialNeeds: animal.riskProfile.hasSpecialNeeds,
      } : null,
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
   * Get animal by ID
   */
  app.get('/:id', {
    schema: {
      description: 'Get animal by ID',
      tags: ['Animals'],
      security: [{ bearerAuth: [] }, { apiKey: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const animal = await prisma.animal.findUnique({
      where: { id },
      include: {
        organization: {
          select: { id: true, name: true, slug: true, type: true },
        },
        location: {
          select: { id: true, name: true, type: true },
        },
        microchips: true,
        riskProfile: true,
        media: {
          orderBy: { sortOrder: 'asc' },
        },
        medicalRecords: {
          orderBy: { date: 'desc' },
          take: 10,
        },
        behavioralAssessments: {
          orderBy: { date: 'desc' },
          take: 5,
        },
        notes: {
          where: { isInternal: false },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
    
    if (!animal) {
      throw new NotFoundError('Animal', id);
    }
    
    // Check organization access
    if (request.organization && animal.organizationId !== request.organization.id) {
      throw new ForbiddenError('Access denied to this animal');
    }
    
    return {
      success: true,
      data: animal,
    };
  });

  /**
   * Create animal
   */
  app.post('/', {
    preHandler: [requireOrganization(), requirePermission('animal:write')],
    schema: {
      description: 'Create a new animal',
      tags: ['Animals'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const body = createAnimalSchema.parse(request.body);
    const orgId = request.organization!.id;
    
    // Create animal with intake
    const animal = await prisma.$transaction(async (tx) => {
      // Create the animal
      const newAnimal = await tx.animal.create({
        data: {
          organizationId: orgId,
          name: body.name,
          species: body.species,
          breedPrimary: body.breedPrimary,
          breedSecondary: body.breedSecondary,
          breedDescription: body.breedDescription,
          sex: body.sex,
          birthDate: body.birthDate ? new Date(body.birthDate) : undefined,
          birthDateEstimated: body.birthDateEstimated ? new Date(body.birthDateEstimated) : undefined,
          ageCategory: body.ageCategory,
          colorPrimary: body.colorPrimary,
          colorSecondary: body.colorSecondary,
          pattern: body.pattern,
          coatType: body.coatType,
          weightKg: body.weightKg,
          size: body.size,
          alteredStatus: body.alteredStatus ?? 'UNKNOWN',
          alteredDate: body.alteredDate ? new Date(body.alteredDate) : undefined,
          internalId: body.internalId,
          locationId: body.locationId,
          description: body.description,
          specialNeeds: body.specialNeeds,
          characteristics: body.characteristics ?? [],
          goodWithChildren: body.goodWithChildren,
          goodWithDogs: body.goodWithDogs,
          goodWithCats: body.goodWithCats,
          houseTrained: body.houseTrained,
          crateTrained: body.crateTrained,
          leashTrained: body.leashTrained,
          specialDiet: body.specialDiet,
          exerciseNeeds: body.exerciseNeeds,
          energyLevel: body.energyLevel,
          adoptionFee: body.adoptionFee,
          isPublic: body.isPublic ?? true,
          intakeDate: body.intake.intakeDate ? new Date(body.intake.intakeDate) : new Date(),
          status: 'IN_SHELTER',
        },
      });
      
      // Create microchips
      if (body.microchips?.length) {
        await tx.microchip.createMany({
          data: body.microchips.map((chip, index) => ({
            animalId: newAnimal.id,
            chipNumber: chip.chipNumber.replace(/[\s-]/g, ''), // Normalize
            originalFormat: chip.chipNumber,
            chipType: chip.chipType,
            isPrimary: chip.isPrimary ?? index === 0,
          })),
        });
      }
      
      // Create intake event
      await tx.intakeEvent.create({
        data: {
          animalId: newAnimal.id,
          organizationId: orgId,
          intakeType: body.intake.intakeType,
          intakeSubtype: body.intake.intakeSubtype,
          intakeDate: body.intake.intakeDate ? new Date(body.intake.intakeDate) : new Date(),
          condition: body.intake.condition ?? 'HEALTHY',
          conditionNotes: body.intake.conditionNotes,
          foundLocation: body.intake.foundLocation,
          notes: body.intake.notes,
          processedById: request.user!.id,
          processedBy: request.user!.name,
        },
      });
      
      // Create initial risk profile
      const riskScore = await calculateRiskScore(newAnimal.id, tx);
      await tx.riskProfile.create({
        data: {
          animalId: newAnimal.id,
          ...riskScore,
        },
      });
      
      // Create event for audit trail
      await tx.animalEvent.create({
        data: {
          animalId: newAnimal.id,
          eventType: 'INTAKE',
          payload: {
            intakeType: body.intake.intakeType,
            condition: body.intake.condition,
          },
          actorId: request.user!.id,
          actor: request.user!.name,
          organizationId: orgId,
        },
      });
      
      return newAnimal;
    });
    
    await createAuditLog(request, 'CREATE', 'animal', animal.id);
    
    logger.info({ animalId: animal.id, orgId }, 'Animal created');
    
    return {
      success: true,
      data: { id: animal.id },
    };
  });

  /**
   * Update animal
   */
  app.patch('/:id', {
    preHandler: [requireOrganization(), requirePermission('animal:write')],
    schema: {
      description: 'Update animal',
      tags: ['Animals'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;
    
    // Find existing animal
    const existing = await prisma.animal.findUnique({
      where: { id },
    });
    
    if (!existing) {
      throw new NotFoundError('Animal', id);
    }
    
    if (existing.organizationId !== request.organization!.id) {
      throw new ForbiddenError('Access denied');
    }
    
    // Update animal
    const updated = await prisma.animal.update({
      where: { id },
      data: {
        ...body,
        updatedAt: new Date(),
      },
    });
    
    // Recalculate risk score
    const riskScore = await calculateRiskScore(id);
    await prisma.riskProfile.upsert({
      where: { animalId: id },
      update: riskScore,
      create: { animalId: id, ...riskScore },
    });
    
    // Create event
    await prisma.animalEvent.create({
      data: {
        animalId: id,
        eventType: 'UPDATE',
        payload: body,
        actorId: request.user!.id,
        actor: request.user!.name,
        organizationId: request.organization!.id,
      },
    });
    
    await createAuditLog(request, 'UPDATE', 'animal', id);
    
    return {
      success: true,
      data: updated,
    };
  });

  /**
   * Get at-risk animals
   */
  app.get('/at-risk', {
    schema: {
      description: 'Get animals at elevated risk',
      tags: ['Animals', 'Risk'],
      security: [{ bearerAuth: [] }, { apiKey: [] }],
    },
  }, async (request, reply) => {
    const where: any = {
      riskProfile: {
        urgencyScore: { gte: 60 },
      },
      status: {
        in: ['IN_SHELTER', 'IN_FOSTER', 'IN_MEDICAL', 'AVAILABLE'],
      },
    };
    
    if (request.organization) {
      where.organizationId = request.organization.id;
    }
    
    const animals = await prisma.animal.findMany({
      where,
      include: {
        organization: {
          select: { id: true, name: true, slug: true },
        },
        riskProfile: true,
        media: {
          where: { isPrimary: true },
          take: 1,
        },
      },
      orderBy: {
        riskProfile: { urgencyScore: 'desc' },
      },
      take: 50,
    });
    
    return {
      success: true,
      data: animals,
      meta: {
        total: animals.length,
        timestamp: new Date().toISOString(),
      },
    };
  });

  /**
   * Get seniors
   */
  app.get('/seniors', {
    schema: {
      description: 'Get senior animals',
      tags: ['Animals'],
      security: [{ bearerAuth: [] }, { apiKey: [] }],
    },
  }, async (request, reply) => {
    const where: any = {
      riskProfile: {
        isSenior: true,
      },
      status: {
        in: ['IN_SHELTER', 'IN_FOSTER', 'IN_MEDICAL', 'AVAILABLE'],
      },
    };
    
    if (request.organization) {
      where.organizationId = request.organization.id;
    }
    
    const animals = await prisma.animal.findMany({
      where,
      include: {
        organization: {
          select: { id: true, name: true, slug: true },
        },
        riskProfile: true,
        media: {
          where: { isPrimary: true },
          take: 1,
        },
      },
      orderBy: [
        { riskProfile: { urgencyScore: 'desc' } },
        { intakeDate: 'asc' },
      ],
      take: 50,
    });
    
    return {
      success: true,
      data: animals,
    };
  });

  /**
   * Get special needs animals
   */
  app.get('/special-needs', {
    schema: {
      description: 'Get animals with special needs',
      tags: ['Animals'],
      security: [{ bearerAuth: [] }, { apiKey: [] }],
    },
  }, async (request, reply) => {
    const where: any = {
      riskProfile: {
        hasSpecialNeeds: true,
      },
      status: {
        in: ['IN_SHELTER', 'IN_FOSTER', 'IN_MEDICAL', 'AVAILABLE'],
      },
    };
    
    if (request.organization) {
      where.organizationId = request.organization.id;
    }
    
    const animals = await prisma.animal.findMany({
      where,
      include: {
        organization: {
          select: { id: true, name: true, slug: true },
        },
        riskProfile: true,
        medicalRecords: {
          where: { affectsAdoptability: true },
          orderBy: { date: 'desc' },
          take: 3,
        },
        media: {
          where: { isPrimary: true },
          take: 1,
        },
      },
      orderBy: [
        { riskProfile: { urgencyScore: 'desc' } },
        { intakeDate: 'asc' },
      ],
      take: 50,
    });
    
    return {
      success: true,
      data: animals,
    };
  });
}
