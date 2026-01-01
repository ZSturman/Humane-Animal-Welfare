/**
 * Data Routes - Export, Import, and Sync
 * 
 * Handles data export/import for organizations.
 * 
 * TODO: Production - Add from _archive/routes/import.ts:
 *   - Background job processing for large imports
 *   - Field mapping templates
 *   - Excel support
 *   - External API sync (PetFinder, Adoptapet)
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { NotFoundError, ForbiddenError, ValidationError } from '../lib/errors.js';
import { createLogger } from '../lib/logger.js';
import { requireAuth, requireOrganization, requirePermission } from '../middleware/auth.js';
import { updateAnimalRiskProfile } from '../services/risk-scoring.js';

const logger = createLogger('data');
const prisma = new PrismaClient();

// CSV parsing helper (simple implementation)
function parseCSV(content: string): Record<string, string>[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const records: Record<string, string>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const record: Record<string, string> = {};
    headers.forEach((h, idx) => {
      record[h] = values[idx] ?? '';
    });
    records.push(record);
  }
  
  return records;
}

// CSV generation helper
function toCSV(data: Record<string, any>[]): string {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const lines = [headers.join(',')];
  
  for (const row of data) {
    const values = headers.map(h => {
      const val = row[h];
      if (val === null || val === undefined) return '';
      const str = String(val);
      return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
    });
    lines.push(values.join(','));
  }
  
  return lines.join('\n');
}

export async function dataRoutes(app: FastifyInstance) {
  /**
   * Export animals - CSV or JSON
   */
  app.get('/export', {
    preHandler: [requireAuth(), requireOrganization(), requirePermission('data:read')],
    schema: {
      description: 'Export organization animals as CSV or JSON',
      tags: ['Data'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          format: { type: 'string', enum: ['csv', 'json'], default: 'csv' },
          status: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const { format, status } = request.query as { format?: string; status?: string };
    const orgId = request.user!.organizationId!;

    const where: any = { organizationId: orgId };
    if (status) {
      where.status = { in: status.split(',') };
    }

    const animals = await prisma.animal.findMany({
      where,
      include: {
        riskProfile: true,
        photos: { where: { isThumbnail: true }, take: 1 },
      },
      orderBy: { intakeDate: 'desc' },
    });

    // Transform to flat structure
    const exportData = animals.map(a => ({
      id: a.id,
      internalId: a.internalId ?? '',
      name: a.name,
      species: a.species,
      breedPrimary: a.breedPrimary ?? '',
      breedSecondary: a.breedSecondary ?? '',
      sex: a.sex,
      ageCategory: a.ageCategory ?? '',
      size: a.size ?? '',
      colorPrimary: a.colorPrimary ?? '',
      colorSecondary: a.colorSecondary ?? '',
      status: a.status,
      alteredStatus: a.alteredStatus,
      birthDate: a.birthDate?.toISOString() ?? '',
      intakeDate: a.intakeDate.toISOString(),
      daysInShelter: a.daysInShelter,
      description: a.description ?? '',
      specialNeeds: a.specialNeeds ?? '',
      goodWithChildren: a.goodWithChildren ?? '',
      goodWithDogs: a.goodWithDogs ?? '',
      goodWithCats: a.goodWithCats ?? '',
      houseTrained: a.houseTrained ?? '',
      adoptionFee: a.adoptionFee ?? '',
      kennelNumber: a.kennelNumber ?? '',
      urgencyScore: a.riskProfile?.urgencyScore ?? 0,
      riskSeverity: a.riskProfile?.riskSeverity ?? 'LOW',
      isPublic: a.isPublic,
      isFeatured: a.isFeatured,
    }));

    if (format === 'json') {
      reply.header('Content-Type', 'application/json');
      reply.header('Content-Disposition', `attachment; filename="animals-${Date.now()}.json"`);
      return exportData;
    } else {
      const csv = toCSV(exportData);
      reply.header('Content-Type', 'text/csv');
      reply.header('Content-Disposition', `attachment; filename="animals-${Date.now()}.csv"`);
      return csv;
    }
  });

  /**
   * Import animals from CSV/JSON
   * TODO: Production - Add background processing, validation, field mapping
   */
  app.post('/import', {
    preHandler: [requireAuth(), requireOrganization(), requirePermission('data:write')],
    schema: {
      description: 'Import animals from CSV or JSON',
      tags: ['Data'],
      security: [{ bearerAuth: [] }],
      consumes: ['multipart/form-data', 'application/json'],
    },
  }, async (request, reply) => {
    const orgId = request.user!.organizationId!;
    let records: Record<string, any>[] = [];

    // Handle multipart file upload
    const contentType = request.headers['content-type'] ?? '';
    
    if (contentType.includes('multipart/form-data')) {
      const file = await request.file();
      if (!file) {
        throw new ValidationError('No file uploaded');
      }

      const content = await file.toBuffer();
      const text = content.toString('utf-8');

      if (file.filename.endsWith('.json')) {
        records = JSON.parse(text);
      } else if (file.filename.endsWith('.csv')) {
        records = parseCSV(text);
      } else {
        throw new ValidationError('Unsupported file format. Use CSV or JSON.');
      }
    } else if (contentType.includes('application/json')) {
      const body = request.body as { animals?: Record<string, any>[] };
      records = body.animals ?? [];
    } else {
      throw new ValidationError('Unsupported content type');
    }

    if (records.length === 0) {
      throw new ValidationError('No records to import');
    }

    // Validate and import
    const results = {
      total: records.length,
      created: 0,
      updated: 0,
      errors: [] as { row: number; error: string }[],
    };

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      try {
        // Required fields
        if (!row.name || !row.species) {
          results.errors.push({ row: i + 1, error: 'Missing required fields: name, species' });
          continue;
        }

        // Check if updating existing (by internalId or id)
        let existingId: string | null = null;
        if (row.id) {
          const existing = await prisma.animal.findFirst({
            where: { id: row.id, organizationId: orgId },
          });
          if (existing) existingId = existing.id;
        } else if (row.internalId) {
          const existing = await prisma.animal.findFirst({
            where: { internalId: row.internalId, organizationId: orgId },
          });
          if (existing) existingId = existing.id;
        }

        const animalData = {
          name: row.name,
          species: row.species.toUpperCase(),
          breedPrimary: row.breedPrimary || null,
          breedSecondary: row.breedSecondary || null,
          sex: (row.sex || 'UNKNOWN').toUpperCase(),
          ageCategory: row.ageCategory || null,
          size: row.size || null,
          colorPrimary: row.colorPrimary || null,
          colorSecondary: row.colorSecondary || null,
          status: row.status || 'IN_SHELTER',
          alteredStatus: row.alteredStatus || 'UNKNOWN',
          birthDate: row.birthDate ? new Date(row.birthDate) : null,
          intakeDate: row.intakeDate ? new Date(row.intakeDate) : new Date(),
          description: row.description || null,
          specialNeeds: row.specialNeeds || null,
          goodWithChildren: row.goodWithChildren === 'true' || row.goodWithChildren === true,
          goodWithDogs: row.goodWithDogs === 'true' || row.goodWithDogs === true,
          goodWithCats: row.goodWithCats === 'true' || row.goodWithCats === true,
          houseTrained: row.houseTrained === 'true' || row.houseTrained === true,
          adoptionFee: row.adoptionFee ? parseInt(row.adoptionFee, 10) : null,
          kennelNumber: row.kennelNumber || null,
          internalId: row.internalId || null,
          isPublic: row.isPublic !== 'false' && row.isPublic !== false,
        };

        if (existingId) {
          await prisma.animal.update({
            where: { id: existingId },
            data: animalData,
          });
          await updateAnimalRiskProfile(existingId);
          results.updated++;
        } else {
          const animal = await prisma.animal.create({
            data: {
              ...animalData,
              organizationId: orgId,
            },
          });
          await updateAnimalRiskProfile(animal.id);
          results.created++;
        }
      } catch (error: any) {
        results.errors.push({ row: i + 1, error: error.message });
      }
    }

    logger.info({ orgId, ...results }, 'Import completed');

    return {
      success: true,
      message: `Imported ${results.created} new animals, updated ${results.updated}`,
      data: results,
    };
  });

  /**
   * Sync endpoint - Links external data source
   * TODO: Production - Implement actual sync with PetFinder, Adoptapet, etc.
   */
  app.post('/sync', {
    preHandler: [requireAuth(), requireOrganization(), requirePermission('data:write')],
    schema: {
      description: 'Configure external data sync',
      tags: ['Data'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const { source, apiKey, webhookUrl } = request.body as {
      source: string;
      apiKey?: string;
      webhookUrl?: string;
    };

    // TODO: Production - Store sync configuration and set up webhook/polling
    // For prototype, just acknowledge the request

    logger.info(
      { orgId: request.user!.organizationId, source },
      'Sync configuration received (not implemented in prototype)'
    );

    return {
      success: true,
      message: `Sync configuration saved for ${source}. Note: Automatic sync is not yet implemented in the prototype.`,
      data: {
        source,
        status: 'configured',
        note: 'TODO: Implement automatic sync in production',
      },
    };
  });

  /**
   * Get import/export status and history
   */
  app.get('/history', {
    preHandler: [requireAuth(), requireOrganization(), requirePermission('data:read')],
    schema: {
      description: 'Get import/export history',
      tags: ['Data'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    // TODO: Production - Track import/export jobs in database
    // For prototype, return empty history

    return {
      success: true,
      data: {
        imports: [],
        exports: [],
        note: 'Import/export history tracking not implemented in prototype',
      },
    };
  });
}
