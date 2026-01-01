/**
 * Animal Routes (Simplified for Prototype)
 * 
 * CRUD operations for animals with public search and photo management.
 * 
 * Key changes from production:
 *   - Public access for listing/viewing animals (no auth required)
 *   - Role-based field filtering (staff see more than public)
 *   - Local filesystem photo storage
 *   - Simplified intake/outcome handling
 * 
 * TODO: Production - Add from original:
 *   - Microchip management
 *   - Medical records integration
 *   - Behavioral assessments
 *   - Full event sourcing
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs/promises';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import { NotFoundError, ForbiddenError, ValidationError } from '../lib/errors.js';
import { createLogger } from '../lib/logger.js';
import { optionalAuth, requireAuth, requirePermission, requireOrganization, userHasPermission } from '../middleware/auth.js';
import { updateAnimalRiskProfile, calculateRiskScore } from '../services/risk-scoring.js';

const logger = createLogger('animals');
const prisma = new PrismaClient();

// Upload directory
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

// Ensure uploads directory exists
async function ensureUploadsDir(animalId: string) {
  const dir = path.join(UPLOADS_DIR, animalId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

// Validation schemas
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
  organizationId: z.string().optional(),
  allOrganizations: z.coerce.boolean().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  minUrgencyScore: z.coerce.number().int().min(0).max(100).optional(),
  riskSeverity: z.string().optional(),
  isSenior: z.coerce.boolean().optional(),
  hasSpecialNeeds: z.coerce.boolean().optional(),
  q: z.string().optional(), // Text search
});

const createAnimalSchema = z.object({
  name: z.string().min(1).max(100),
  species: z.string(),
  breedPrimary: z.string().optional(),
  breedSecondary: z.string().optional(),
  sex: z.string().default('UNKNOWN'),
  birthDate: z.string().datetime().optional(),
  ageCategory: z.string().optional(),
  colorPrimary: z.string().optional(),
  colorSecondary: z.string().optional(),
  coatType: z.string().optional(),
  weightKg: z.number().positive().optional(),
  size: z.string().optional(),
  alteredStatus: z.string().optional(),
  description: z.string().optional(),
  specialNeeds: z.string().optional(),
  staffNotes: z.string().optional(),
  characteristics: z.string().optional(), // JSON string array
  goodWithChildren: z.boolean().optional(),
  goodWithDogs: z.boolean().optional(),
  goodWithCats: z.boolean().optional(),
  houseTrained: z.boolean().optional(),
  adoptionFee: z.number().int().min(0).optional(),
  isPublic: z.boolean().optional(),
  internalId: z.string().optional(),
  intake: z.object({
    intakeType: z.string(),
    condition: z.string().optional(),
    foundLocation: z.string().optional(),
    notes: z.string().optional(),
  }),
});

const outcomeSchema = z.object({
  outcomeType: z.enum(['ADOPTION', 'TRANSFER_OUT', 'RETURN_TO_OWNER', 'EUTHANASIA', 'DIED_IN_CARE', 'FOSTER']),
  adopterName: z.string().optional(),
  adopterEmail: z.string().email().optional(),
  destinationOrgId: z.string().optional(),
  destinationOrgName: z.string().optional(),
  euthanasiaReason: z.string().optional(),
  memorialNote: z.string().optional(),
  notes: z.string().optional(),
});

export async function animalRoutes(app: FastifyInstance) {
  /**
   * List/search animals - PUBLIC (optional auth)
   * Anonymous users see public animals only with filtered fields
   * Authenticated staff see full details
   */
  app.get('/', {
    preHandler: [optionalAuth()],
    schema: {
      description: 'Search and list animals (public)',
      tags: ['Animals'],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', default: 1 },
          pageSize: { type: 'integer', default: 20 },
          species: { type: 'string' },
          status: { type: 'string' },
          city: { type: 'string' },
          state: { type: 'string' },
          q: { type: 'string' },
          allOrganizations: { type: 'boolean' },
        },
      },
    },
  }, async (request, reply) => {
    const params = searchSchema.parse(request.query);
    const isAuthenticated = Boolean(request.user);
    const isStaff = request.user && userHasPermission(request, 'animal:read');

    // Build where clause
    const where: any = {};
    
    // For public/anonymous, only show public animals
    if (!isStaff) {
      where.isPublic = true;
      where.status = { in: ['IN_SHELTER', 'IN_FOSTER', 'AVAILABLE'] };
    } else {
      // Staff can see all statuses
      if (params.status) {
        where.status = { in: params.status.split(',') };
      }
    }

    // Organization filter - only apply if NOT viewing all organizations
    if (!params.allOrganizations && params.organizationId) {
      where.organizationId = params.organizationId;
    }
    
    // Location filters (search by city/state)
    // TODO: Production - Add geocoding for radius-based "near me" search
    if (params.city || params.state) {
      where.organization = {};
      if (params.city) {
        where.organization.city = { contains: params.city };
      }
      if (params.state) {
        where.organization.state = params.state;
      }
    }

    // Species filter
    if (params.species) {
      where.species = { in: params.species.split(',') };
    }
    
    // Other filters
    if (params.sex) {
      where.sex = { in: params.sex.split(',') };
    }
    if (params.size) {
      where.size = { in: params.size.split(',') };
    }
    if (params.ageCategory) {
      where.ageCategory = { in: params.ageCategory.split(',') };
    }

    // Risk filters (for authenticated users)
    if (isStaff) {
      if (params.minUrgencyScore !== undefined) {
        where.riskProfile = { ...where.riskProfile, urgencyScore: { gte: params.minUrgencyScore } };
      }
      if (params.riskSeverity) {
        where.riskProfile = { ...where.riskProfile, riskSeverity: { in: params.riskSeverity.split(',') } };
      }
      if (params.isSenior !== undefined) {
        where.riskProfile = { ...where.riskProfile, isSenior: params.isSenior };
      }
      if (params.hasSpecialNeeds !== undefined) {
        where.riskProfile = { ...where.riskProfile, hasSpecialNeeds: params.hasSpecialNeeds };
      }
    }

    // Text search (name, breed)
    // Note: SQLite doesn't support 'mode: insensitive', so we use basic contains
    if (params.q) {
      where.OR = [
        { name: { contains: params.q } },
        { breedPrimary: { contains: params.q } },
        { breedSecondary: { contains: params.q } },
      ];
    }

    // Count total
    const total = await prisma.animal.count({ where });

    // Fetch animals
    const animals = await prisma.animal.findMany({
      where,
      include: {
        organization: {
          select: { id: true, name: true, slug: true, city: true, state: true },
        },
        riskProfile: isStaff,
        photos: {
          where: { isPublic: true },
          orderBy: { sortOrder: 'asc' },
          take: 1,
        },
      },
      orderBy: { [params.sortBy]: params.sortOrder },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    });

    // Transform response - filter fields for public users
    const data = animals.map(animal => {
      const base = {
        id: animal.id,
        name: animal.name,
        species: animal.species,
        breedDisplay: animal.breedSecondary 
          ? `${animal.breedPrimary} / ${animal.breedSecondary} Mix`
          : animal.breedPrimary ?? 'Unknown',
        sex: animal.sex,
        ageCategory: animal.ageCategory,
        size: animal.size,
        colorPrimary: animal.colorPrimary,
        status: animal.status,
        description: animal.description,
        specialNeeds: animal.specialNeeds,
        goodWithChildren: animal.goodWithChildren,
        goodWithDogs: animal.goodWithDogs,
        goodWithCats: animal.goodWithCats,
        daysInShelter: animal.daysInShelter,
        adoptionFee: animal.adoptionFee,
        organization: animal.organization,
        thumbnailUrl: animal.photos[0]?.filepath ? `/uploads/${animal.id}/${animal.photos[0].filename}` : null,
      };

      // Add staff-only fields
      if (isStaff) {
        return {
          ...base,
          staffNotes: animal.staffNotes,
          intakeNotes: animal.intakeNotes,
          internalId: animal.internalId,
          intakeDate: animal.intakeDate.toISOString(),
          isPublic: animal.isPublic,
          isFeatured: animal.isFeatured,
          riskProfile: animal.riskProfile ? {
            urgencyScore: animal.riskProfile.urgencyScore,
            severity: animal.riskProfile.riskSeverity,
            reasons: JSON.parse(animal.riskProfile.riskReasons as string || '[]'),
            isSenior: animal.riskProfile.isSenior,
            hasSpecialNeeds: animal.riskProfile.hasSpecialNeeds,
          } : null,
        };
      }

      return base;
    });

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
   * Get at-risk animals - PUBLIC (shows risk levels)
   * NOTE: This must be defined BEFORE /:id to prevent 'at-risk' being matched as an animal ID
   */
  app.get('/at-risk', {
    preHandler: [optionalAuth()],
    schema: {
      description: 'Get animals at elevated risk',
      tags: ['Animals', 'Risk'],
    },
  }, async (request, reply) => {
    const { organizationId } = request.query as { organizationId?: string };

    const where: any = {
      isPublic: true,
      status: { in: ['IN_SHELTER', 'IN_FOSTER', 'IN_MEDICAL', 'AVAILABLE'] },
      riskProfile: {
        urgencyScore: { gte: 60 },
      },
    };

    if (organizationId) {
      where.organizationId = organizationId;
    }

    const animals = await prisma.animal.findMany({
      where,
      include: {
        organization: {
          select: { id: true, name: true, slug: true, city: true, state: true },
        },
        riskProfile: true,
        photos: {
          where: { isThumbnail: true },
          take: 1,
        },
      },
      orderBy: { riskProfile: { urgencyScore: 'desc' } },
      take: 50,
    });

    return {
      success: true,
      data: animals.map(a => ({
        id: a.id,
        name: a.name,
        species: a.species,
        breedDisplay: a.breedSecondary ? `${a.breedPrimary} / ${a.breedSecondary} Mix` : a.breedPrimary,
        ageCategory: a.ageCategory,
        daysInShelter: a.daysInShelter,
        organization: a.organization,
        thumbnailUrl: a.photos[0] ? `/uploads/${a.id}/${a.photos[0].filename}` : null,
        risk: a.riskProfile ? {
          score: a.riskProfile.urgencyScore,
          severity: a.riskProfile.riskSeverity,
          reasons: JSON.parse(a.riskProfile.riskReasons as string || '[]'),
        } : null,
      })),
    };
  });

  /**
   * Get animal by ID - PUBLIC (optional auth)
   */
  app.get('/:id', {
    preHandler: [optionalAuth()],
    schema: {
      description: 'Get animal by ID',
      tags: ['Animals'],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const isStaff = request.user && userHasPermission(request, 'animal:read');

    const animal = await prisma.animal.findUnique({
      where: { id },
      include: {
        organization: {
          select: { id: true, name: true, slug: true, city: true, state: true, phone: true, email: true },
        },
        riskProfile: true,
        photos: {
          where: isStaff ? {} : { isPublic: true },
          orderBy: { sortOrder: 'asc' },
        },
        intakeEvents: isStaff,
        outcomeEvents: isStaff,
      },
    });

    if (!animal) {
      throw new NotFoundError('Animal', id);
    }

    // Check if public user can view this animal
    if (!isStaff && !animal.isPublic) {
      throw new NotFoundError('Animal', id);
    }

    // Build response
    const response: any = {
      id: animal.id,
      name: animal.name,
      species: animal.species,
      breedPrimary: animal.breedPrimary,
      breedSecondary: animal.breedSecondary,
      sex: animal.sex,
      ageCategory: animal.ageCategory,
      size: animal.size,
      colorPrimary: animal.colorPrimary,
      colorSecondary: animal.colorSecondary,
      coatType: animal.coatType,
      weightKg: animal.weightKg,
      status: animal.status,
      description: animal.description,
      specialNeeds: animal.specialNeeds,
      characteristics: animal.characteristics ? JSON.parse(animal.characteristics) : [],
      goodWithChildren: animal.goodWithChildren,
      goodWithDogs: animal.goodWithDogs,
      goodWithCats: animal.goodWithCats,
      houseTrained: animal.houseTrained,
      daysInShelter: animal.daysInShelter,
      adoptionFee: animal.adoptionFee,
      organization: animal.organization,
      photos: animal.photos.map(p => ({
        id: p.id,
        url: `/uploads/${animal.id}/${p.filename}`,
        label: p.label,
        isThumbnail: p.isThumbnail,
      })),
    };

    // Add staff-only fields
    if (isStaff) {
      response.staffNotes = animal.staffNotes;
      response.intakeNotes = animal.intakeNotes;
      response.internalId = animal.internalId;
      response.intakeDate = animal.intakeDate.toISOString();
      response.outcomeDate = animal.outcomeDate?.toISOString();
      response.isPublic = animal.isPublic;
      response.isFeatured = animal.isFeatured;
      response.kennelNumber = animal.kennelNumber;
      response.riskProfile = animal.riskProfile ? {
        urgencyScore: animal.riskProfile.urgencyScore,
        severity: animal.riskProfile.riskSeverity,
        reasons: JSON.parse(animal.riskProfile.riskReasons as string || '[]'),
        lengthOfStay: animal.riskProfile.lengthOfStay,
        isSenior: animal.riskProfile.isSenior,
        hasSpecialNeeds: animal.riskProfile.hasSpecialNeeds,
        lastCalculated: animal.riskProfile.lastCalculated.toISOString(),
      } : null;
      response.intakeEvents = animal.intakeEvents;
      response.outcomeEvents = animal.outcomeEvents;
    }

    return { success: true, data: response };
  });

  /**
   * Create animal - Requires auth + organization
   */
  app.post('/', {
    preHandler: [requireAuth(), requireOrganization(), requirePermission('animal:write')],
    schema: {
      description: 'Create a new animal',
      tags: ['Animals'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const body = createAnimalSchema.parse(request.body);
    const orgId = request.user!.organizationId!;

    // Create animal with intake event
    const animal = await prisma.$transaction(async (tx) => {
      const newAnimal = await tx.animal.create({
        data: {
          organizationId: orgId,
          name: body.name,
          species: body.species,
          breedPrimary: body.breedPrimary,
          breedSecondary: body.breedSecondary,
          sex: body.sex,
          birthDate: body.birthDate ? new Date(body.birthDate) : undefined,
          ageCategory: body.ageCategory,
          colorPrimary: body.colorPrimary,
          colorSecondary: body.colorSecondary,
          coatType: body.coatType,
          weightKg: body.weightKg,
          size: body.size,
          alteredStatus: body.alteredStatus ?? 'UNKNOWN',
          description: body.description,
          specialNeeds: body.specialNeeds,
          staffNotes: body.staffNotes,
          characteristics: body.characteristics,
          goodWithChildren: body.goodWithChildren,
          goodWithDogs: body.goodWithDogs,
          goodWithCats: body.goodWithCats,
          houseTrained: body.houseTrained,
          adoptionFee: body.adoptionFee,
          isPublic: body.isPublic ?? true,
          internalId: body.internalId,
          intakeDate: new Date(),
          status: 'IN_SHELTER',
        },
      });

      // Create intake event
      await tx.intakeEvent.create({
        data: {
          animalId: newAnimal.id,
          organizationId: orgId,
          intakeType: body.intake.intakeType,
          condition: body.intake.condition ?? 'HEALTHY',
          foundLocation: body.intake.foundLocation,
          notes: body.intake.notes,
          processedBy: request.user!.name,
        },
      });

      return newAnimal;
    });

    // Calculate risk profile (outside transaction)
    await updateAnimalRiskProfile(animal.id);

    logger.info({ animalId: animal.id, orgId }, 'Animal created');

    return {
      success: true,
      data: { id: animal.id },
    };
  });

  /**
   * Update animal - Requires auth + organization + permission
   */
  app.patch('/:id', {
    preHandler: [requireAuth(), requireOrganization(), requirePermission('animal:write')],
    schema: {
      description: 'Update animal',
      tags: ['Animals'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;

    const existing = await prisma.animal.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Animal', id);
    }

    // Check organization access
    if (existing.organizationId !== request.user!.organizationId) {
      throw new ForbiddenError('Access denied to this animal');
    }

    // Update animal
    const updated = await prisma.animal.update({
      where: { id },
      data: { ...body, updatedAt: new Date() },
    });

    // Recalculate risk profile
    await updateAnimalRiskProfile(id);

    return { success: true, data: updated };
  });

  /**
   * Record outcome - Requires auth + organization
   * Handles adoptions, euthanasia, transfers, etc. with humane messaging
   */
  app.post('/:id/outcome', {
    preHandler: [requireAuth(), requireOrganization(), requirePermission('animal:write')],
    schema: {
      description: 'Record animal outcome (adoption, euthanasia, etc.)',
      tags: ['Animals'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = outcomeSchema.parse(request.body);

    const animal = await prisma.animal.findUnique({ where: { id } });
    if (!animal) {
      throw new NotFoundError('Animal', id);
    }

    if (animal.organizationId !== request.user!.organizationId) {
      throw new ForbiddenError('Access denied');
    }

    // Map outcome type to animal status
    const statusMap: Record<string, string> = {
      ADOPTION: 'ADOPTED',
      TRANSFER_OUT: 'TRANSFERRED',
      RETURN_TO_OWNER: 'RECLAIMED',
      EUTHANASIA: 'EUTHANIZED',
      DIED_IN_CARE: 'DECEASED',
      FOSTER: 'IN_FOSTER',
    };

    const newStatus = statusMap[body.outcomeType] ?? 'ADOPTED';

    await prisma.$transaction(async (tx) => {
      // Update animal status
      await tx.animal.update({
        where: { id },
        data: {
          status: newStatus,
          outcomeDate: new Date(),
          isPublic: ['ADOPTED', 'TRANSFERRED', 'EUTHANIZED', 'DECEASED'].includes(newStatus) ? false : animal.isPublic,
        },
      });

      // Create outcome event
      await tx.outcomeEvent.create({
        data: {
          animalId: id,
          organizationId: request.user!.organizationId!,
          outcomeType: body.outcomeType,
          adopterName: body.adopterName,
          adopterEmail: body.adopterEmail,
          destinationOrgId: body.destinationOrgId,
          destinationOrgName: body.destinationOrgName,
          euthanasiaReason: body.euthanasiaReason,
          memorialNote: body.memorialNote,
          notes: body.notes,
          processedBy: request.user!.name,
        },
      });
    });

    // Build response with appropriate messaging
    let message: string;
    if (body.outcomeType === 'ADOPTION') {
      message = `🎉 ${animal.name} has found their forever home!`;
    } else if (body.outcomeType === 'EUTHANASIA') {
      message = `Rest peacefully, ${animal.name}. Thank you for allowing us to care for them.`;
    } else if (body.outcomeType === 'TRANSFER_OUT') {
      message = `${animal.name} has been transferred to ${body.destinationOrgName ?? 'partner organization'}.`;
    } else if (body.outcomeType === 'RETURN_TO_OWNER') {
      message = `${animal.name} has been reunited with their owner!`;
    } else {
      message = `Outcome recorded for ${animal.name}.`;
    }

    logger.info({ animalId: id, outcomeType: body.outcomeType }, 'Animal outcome recorded');

    return {
      success: true,
      data: { status: newStatus },
      message,
    };
  });

  /**
   * Upload photo - Requires auth + organization
   * TODO: Production - Migrate to S3/MinIO with CDN, add image optimization
   */
  app.post('/:id/photos', {
    preHandler: [requireAuth(), requireOrganization(), requirePermission('animal:write')],
    schema: {
      description: 'Upload animal photo',
      tags: ['Animals'],
      security: [{ bearerAuth: [] }],
      consumes: ['multipart/form-data'],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const animal = await prisma.animal.findUnique({ where: { id } });
    if (!animal) {
      throw new NotFoundError('Animal', id);
    }

    if (animal.organizationId !== request.user!.organizationId) {
      throw new ForbiddenError('Access denied');
    }

    const data = await request.file();
    if (!data) {
      throw new ValidationError('No file uploaded');
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(data.mimetype)) {
      throw new ValidationError('Invalid file type. Allowed: JPEG, PNG, WebP, GIF');
    }

    // Create directory and save file
    const uploadDir = await ensureUploadsDir(id);
    const ext = path.extname(data.filename) || '.jpg';
    const filename = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${ext}`;
    const filepath = path.join(uploadDir, filename);

    await pipeline(data.file, createWriteStream(filepath));

    // Get file size
    const stats = await fs.stat(filepath);

    // Check if this is the first photo (make it thumbnail)
    const existingPhotos = await prisma.animalPhoto.count({ where: { animalId: id } });
    const isThumbnail = existingPhotos === 0;

    // Get label from form data
    const label = (request.body as any)?.label ?? null;

    // Create photo record
    const photo = await prisma.animalPhoto.create({
      data: {
        animalId: id,
        filename,
        filepath: `uploads/${id}/${filename}`,
        mimetype: data.mimetype,
        size: stats.size,
        label,
        isThumbnail,
        sortOrder: existingPhotos,
      },
    });

    return {
      success: true,
      data: {
        id: photo.id,
        url: `/uploads/${id}/${filename}`,
        isThumbnail: photo.isThumbnail,
      },
    };
  });

  /**
   * Set photo as thumbnail
   */
  app.put('/:id/photos/:photoId/thumbnail', {
    preHandler: [requireAuth(), requireOrganization(), requirePermission('animal:write')],
    schema: {
      description: 'Set photo as thumbnail',
      tags: ['Animals'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const { id, photoId } = request.params as { id: string; photoId: string };

    const photo = await prisma.animalPhoto.findUnique({
      where: { id: photoId },
      include: { animal: true },
    });

    if (!photo || photo.animalId !== id) {
      throw new NotFoundError('Photo', photoId);
    }

    if (photo.animal.organizationId !== request.user!.organizationId) {
      throw new ForbiddenError('Access denied');
    }

    // Remove thumbnail from all other photos
    await prisma.animalPhoto.updateMany({
      where: { animalId: id },
      data: { isThumbnail: false },
    });

    // Set this photo as thumbnail
    await prisma.animalPhoto.update({
      where: { id: photoId },
      data: { isThumbnail: true },
    });

    return { success: true };
  });

  /**
   * Delete photo
   */
  app.delete('/:id/photos/:photoId', {
    preHandler: [requireAuth(), requireOrganization(), requirePermission('animal:write')],
    schema: {
      description: 'Delete animal photo',
      tags: ['Animals'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const { id, photoId } = request.params as { id: string; photoId: string };

    const photo = await prisma.animalPhoto.findUnique({
      where: { id: photoId },
      include: { animal: true },
    });

    if (!photo || photo.animalId !== id) {
      throw new NotFoundError('Photo', photoId);
    }

    if (photo.animal.organizationId !== request.user!.organizationId) {
      throw new ForbiddenError('Access denied');
    }

    // Delete file
    try {
      await fs.unlink(path.join(process.cwd(), photo.filepath));
    } catch (error) {
      logger.warn({ error, photoId }, 'Failed to delete photo file');
    }

    // Delete record
    await prisma.animalPhoto.delete({ where: { id: photoId } });

    return { success: true };
  });
}
