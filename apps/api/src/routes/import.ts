/**
 * Import Routes
 * 
 * Data ingestion from CSV, Excel, and external shelter systems
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '@shelter-link/database';
import { NotFoundError, ForbiddenError, ValidationError } from '../lib/errors.js';
import { requireAuth, requirePermission, requireOrganization } from '../middleware/auth.js';
import { createAuditLog } from '../middleware/audit.js';
import { config } from '../config/index.js';

const createImportJobSchema = z.object({
  sourceType: z.enum(['CSV', 'EXCEL', 'ASM3', 'SHELTERLUV', 'PETPOINT', 'JSON', 'MANUAL']),
  sourceName: z.string().optional(),
  fieldMappingId: z.string().uuid().optional(),
  options: z.object({
    skipDuplicates: z.boolean().default(true),
    updateExisting: z.boolean().default(false),
    dryRun: z.boolean().default(false),
  }).optional(),
});

const fieldMappingSchema = z.object({
  name: z.string().min(3),
  sourceType: z.enum(['CSV', 'EXCEL', 'JSON']),
  mappings: z.record(z.string(), z.string()),
  transformations: z.record(z.string(), z.any()).optional(),
  isDefault: z.boolean().default(false),
});

const externalConnectionSchema = z.object({
  name: z.string().min(3),
  sourceType: z.enum(['ASM3', 'SHELTERLUV', 'PETPOINT']),
  credentials: z.object({
    apiUrl: z.string().url(),
    apiKey: z.string().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
    database: z.string().optional(),
  }),
  syncInterval: z.number().int().min(60).optional(), // minutes
  autoSync: z.boolean().default(false),
});

export async function importRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth());

  /**
   * List import jobs
   */
  app.get('/jobs', {
    preHandler: [requireOrganization(), requirePermission('import:read')],
    schema: {
      description: 'List import jobs for organization',
      tags: ['Import'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const orgId = request.organization!.id;
    const { limit = '20', offset = '0', status } = request.query as Record<string, string>;
    
    const where: any = { organizationId: orgId };
    if (status) {
      where.status = status.toUpperCase();
    }
    
    const [jobs, total] = await Promise.all([
      prisma.importJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset),
      }),
      prisma.importJob.count({ where }),
    ]);
    
    return {
      success: true,
      data: jobs,
      meta: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    };
  });

  /**
   * Get import job details
   */
  app.get('/jobs/:id', {
    preHandler: [requireOrganization(), requirePermission('import:read')],
    schema: {
      description: 'Get import job details',
      tags: ['Import'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const job = await prisma.importJob.findUnique({
      where: { id },
    });
    
    if (!job) {
      throw new NotFoundError('Import job', id);
    }
    
    if (job.organizationId !== request.organization!.id) {
      throw new ForbiddenError('Access denied');
    }
    
    return {
      success: true,
      data: job,
    };
  });

  /**
   * Upload file for import
   */
  app.post('/upload', {
    preHandler: [requireOrganization(), requirePermission('import:write')],
    schema: {
      description: 'Upload file for import',
      tags: ['Import'],
      security: [{ bearerAuth: [] }],
      consumes: ['multipart/form-data'],
    },
  }, async (request, reply) => {
    const file = await request.file();
    if (!file) {
      throw new ValidationError('No file uploaded');
    }
    
    const allowedMimes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/json',
    ];
    
    if (!allowedMimes.includes(file.mimetype)) {
      throw new ValidationError(`Unsupported file type: ${file.mimetype}`);
    }
    
    // Read file into buffer
    const chunks: Buffer[] = [];
    for await (const chunk of file.file) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    
    // Determine source type
    let sourceType: 'CSV' | 'EXCEL' | 'JSON' = 'CSV';
    if (file.mimetype.includes('spreadsheet') || file.mimetype.includes('excel')) {
      sourceType = 'EXCEL';
    } else if (file.mimetype === 'application/json') {
      sourceType = 'JSON';
    }
    
    // Create pending import job
    const job = await prisma.importJob.create({
      data: {
        organizationId: request.organization!.id,
        sourceType,
        sourceName: file.filename,
        status: 'PENDING',
        fileData: buffer.toString('base64'),
        initiatedBy: request.user!.id,
      },
    });
    
    // Preview first few rows
    const preview = await generatePreview(buffer, sourceType);
    
    return {
      success: true,
      data: {
        jobId: job.id,
        sourceType,
        fileName: file.filename,
        fileSize: buffer.length,
        preview,
      },
    };
  });

  /**
   * Start import job with field mapping
   */
  app.post('/jobs/:id/start', {
    preHandler: [requireOrganization(), requirePermission('import:write')],
    schema: {
      description: 'Start import job',
      tags: ['Import'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { fieldMappingId, options } = request.body as any;
    
    const job = await prisma.importJob.findUnique({
      where: { id },
    });
    
    if (!job) {
      throw new NotFoundError('Import job', id);
    }
    
    if (job.organizationId !== request.organization!.id) {
      throw new ForbiddenError('Access denied');
    }
    
    if (job.status !== 'PENDING') {
      throw new ValidationError(`Import job is already ${job.status.toLowerCase()}`);
    }
    
    // Load field mapping if provided
    let mapping = null;
    if (fieldMappingId) {
      mapping = await prisma.fieldMappingTemplate.findUnique({
        where: { id: fieldMappingId },
      });
    }
    
    // Update job status
    await prisma.importJob.update({
      where: { id },
      data: {
        status: 'PROCESSING',
        startedAt: new Date(),
        fieldMappingId,
        options: options ?? {},
      },
    });
    
    // Process import (in real implementation, would queue this)
    processImportJob(id, request.organization!.id, request.user!.id).catch(err => {
      console.error(`Import job ${id} failed:`, err);
    });
    
    return {
      success: true,
      data: {
        jobId: id,
        status: 'PROCESSING',
        message: 'Import job started',
      },
    };
  });

  /**
   * Cancel import job
   */
  app.post('/jobs/:id/cancel', {
    preHandler: [requireOrganization(), requirePermission('import:write')],
    schema: {
      description: 'Cancel import job',
      tags: ['Import'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const job = await prisma.importJob.findUnique({
      where: { id },
    });
    
    if (!job) {
      throw new NotFoundError('Import job', id);
    }
    
    if (job.organizationId !== request.organization!.id) {
      throw new ForbiddenError('Access denied');
    }
    
    if (!['PENDING', 'PROCESSING'].includes(job.status)) {
      throw new ValidationError(`Cannot cancel job with status: ${job.status}`);
    }
    
    await prisma.importJob.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        completedAt: new Date(),
      },
    });
    
    return {
      success: true,
      data: { message: 'Import job cancelled' },
    };
  });

  // =====================
  // Field Mapping Templates
  // =====================

  /**
   * List field mapping templates
   */
  app.get('/mappings', {
    preHandler: [requireOrganization()],
    schema: {
      description: 'List field mapping templates',
      tags: ['Import'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const orgId = request.organization!.id;
    
    const mappings = await prisma.fieldMappingTemplate.findMany({
      where: {
        OR: [
          { organizationId: orgId },
          { isGlobal: true },
        ],
      },
      orderBy: [
        { isDefault: 'desc' },
        { name: 'asc' },
      ],
    });
    
    return {
      success: true,
      data: mappings,
    };
  });

  /**
   * Create field mapping template
   */
  app.post('/mappings', {
    preHandler: [requireOrganization(), requirePermission('import:write')],
    schema: {
      description: 'Create field mapping template',
      tags: ['Import'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const body = fieldMappingSchema.parse(request.body);
    const orgId = request.organization!.id;
    
    // If setting as default, unset other defaults
    if (body.isDefault) {
      await prisma.fieldMappingTemplate.updateMany({
        where: {
          organizationId: orgId,
          sourceType: body.sourceType,
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }
    
    const mapping = await prisma.fieldMappingTemplate.create({
      data: {
        organizationId: orgId,
        name: body.name,
        sourceType: body.sourceType,
        mappings: body.mappings,
        transformations: body.transformations ?? {},
        isDefault: body.isDefault,
        createdBy: request.user!.id,
      },
    });
    
    return {
      success: true,
      data: mapping,
    };
  });

  /**
   * Delete field mapping template
   */
  app.delete('/mappings/:id', {
    preHandler: [requireOrganization(), requirePermission('import:write')],
    schema: {
      description: 'Delete field mapping template',
      tags: ['Import'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const mapping = await prisma.fieldMappingTemplate.findUnique({
      where: { id },
    });
    
    if (!mapping) {
      throw new NotFoundError('Field mapping', id);
    }
    
    if (mapping.organizationId !== request.organization!.id) {
      throw new ForbiddenError('Access denied');
    }
    
    await prisma.fieldMappingTemplate.delete({
      where: { id },
    });
    
    return {
      success: true,
      data: { message: 'Field mapping deleted' },
    };
  });

  // =====================
  // External Connections
  // =====================

  /**
   * List external connections
   */
  app.get('/connections', {
    preHandler: [requireOrganization(), requirePermission('import:read')],
    schema: {
      description: 'List external system connections',
      tags: ['Import'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const orgId = request.organization!.id;
    
    const connections = await prisma.externalConnection.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        name: true,
        sourceType: true,
        autoSync: true,
        syncInterval: true,
        lastSyncAt: true,
        lastSyncStatus: true,
        createdAt: true,
      },
    });
    
    return {
      success: true,
      data: connections,
    };
  });

  /**
   * Create external connection
   */
  app.post('/connections', {
    preHandler: [requireOrganization(), requirePermission('import:write')],
    schema: {
      description: 'Create external system connection',
      tags: ['Import'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const body = externalConnectionSchema.parse(request.body);
    const orgId = request.organization!.id;
    
    // Test connection before saving
    const testResult = await testExternalConnection(body.sourceType, body.credentials);
    if (!testResult.success) {
      throw new ValidationError(`Connection test failed: ${testResult.error}`);
    }
    
    const connection = await prisma.externalConnection.create({
      data: {
        organizationId: orgId,
        name: body.name,
        sourceType: body.sourceType,
        credentials: body.credentials,
        syncInterval: body.syncInterval,
        autoSync: body.autoSync,
        createdBy: request.user!.id,
      },
    });
    
    await createAuditLog(request, 'CREATE', 'external_connection', connection.id);
    
    return {
      success: true,
      data: {
        id: connection.id,
        name: connection.name,
        sourceType: connection.sourceType,
      },
    };
  });

  /**
   * Trigger sync from external connection
   */
  app.post('/connections/:id/sync', {
    preHandler: [requireOrganization(), requirePermission('import:write')],
    schema: {
      description: 'Trigger sync from external connection',
      tags: ['Import'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const connection = await prisma.externalConnection.findUnique({
      where: { id },
    });
    
    if (!connection) {
      throw new NotFoundError('External connection', id);
    }
    
    if (connection.organizationId !== request.organization!.id) {
      throw new ForbiddenError('Access denied');
    }
    
    // Create import job for sync
    const job = await prisma.importJob.create({
      data: {
        organizationId: request.organization!.id,
        sourceType: connection.sourceType as any,
        sourceName: connection.name,
        status: 'PROCESSING',
        initiatedBy: request.user!.id,
        externalConnectionId: id,
        startedAt: new Date(),
      },
    });
    
    // Run sync in background
    runExternalSync(job.id, connection).catch(err => {
      console.error(`Sync job ${job.id} failed:`, err);
    });
    
    return {
      success: true,
      data: {
        jobId: job.id,
        message: 'Sync started',
      },
    };
  });

  /**
   * Delete external connection
   */
  app.delete('/connections/:id', {
    preHandler: [requireOrganization(), requirePermission('import:write')],
    schema: {
      description: 'Delete external connection',
      tags: ['Import'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const connection = await prisma.externalConnection.findUnique({
      where: { id },
    });
    
    if (!connection) {
      throw new NotFoundError('External connection', id);
    }
    
    if (connection.organizationId !== request.organization!.id) {
      throw new ForbiddenError('Access denied');
    }
    
    await prisma.externalConnection.delete({
      where: { id },
    });
    
    await createAuditLog(request, 'DELETE', 'external_connection', id);
    
    return {
      success: true,
      data: { message: 'External connection deleted' },
    };
  });
}

// =====================
// Helper Functions
// =====================

async function generatePreview(
  buffer: Buffer,
  sourceType: 'CSV' | 'EXCEL' | 'JSON'
): Promise<{ headers: string[]; rows: string[][]; totalRows: number }> {
  // Placeholder - actual implementation would use csv-parse, xlsx, etc.
  if (sourceType === 'CSV') {
    const content = buffer.toString('utf-8');
    const lines = content.split('\n').filter(l => l.trim());
    const headers = lines[0]?.split(',').map(h => h.trim().replace(/"/g, '')) ?? [];
    const rows = lines.slice(1, 6).map(line => 
      line.split(',').map(cell => cell.trim().replace(/"/g, ''))
    );
    return { headers, rows, totalRows: lines.length - 1 };
  }
  
  if (sourceType === 'JSON') {
    const data = JSON.parse(buffer.toString('utf-8'));
    const items = Array.isArray(data) ? data : [data];
    const headers = Object.keys(items[0] ?? {});
    const rows = items.slice(0, 5).map(item => 
      headers.map(h => String(item[h] ?? ''))
    );
    return { headers, rows, totalRows: items.length };
  }
  
  // EXCEL would need xlsx library
  return { headers: [], rows: [], totalRows: 0 };
}

async function processImportJob(
  jobId: string,
  orgId: string,
  userId: string
): Promise<void> {
  const job = await prisma.importJob.findUnique({
    where: { id: jobId },
    include: { fieldMapping: true },
  });
  
  if (!job || job.status !== 'PROCESSING') return;
  
  try {
    let imported = 0;
    let skipped = 0;
    let failed = 0;
    const errors: Array<{ row: number; error: string }> = [];
    
    // Parse file data
    const buffer = Buffer.from(job.fileData ?? '', 'base64');
    const records = await parseFileData(buffer, job.sourceType as any);
    
    // Apply field mapping
    const mappings = job.fieldMapping?.mappings ?? getDefaultMapping(job.sourceType as any);
    
    for (let i = 0; i < records.length; i++) {
      try {
        const record = records[i];
        const mapped = applyMapping(record, mappings as Record<string, string>);
        
        // Check for duplicates
        if ((job.options as any)?.skipDuplicates) {
          const existing = await findDuplicate(mapped, orgId);
          if (existing) {
            if ((job.options as any)?.updateExisting) {
              await updateAnimal(existing.id, mapped, userId);
              imported++;
            } else {
              skipped++;
            }
            continue;
          }
        }
        
        // Create animal
        await createAnimalFromImport(mapped, orgId, userId);
        imported++;
        
      } catch (err) {
        failed++;
        errors.push({ row: i + 1, error: (err as Error).message });
      }
    }
    
    // Update job status
    await prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        recordsProcessed: records.length,
        recordsImported: imported,
        recordsSkipped: skipped,
        recordsFailed: failed,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
    
  } catch (err) {
    await prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        errors: [{ error: (err as Error).message }],
      },
    });
  }
}

async function parseFileData(
  buffer: Buffer,
  sourceType: 'CSV' | 'EXCEL' | 'JSON'
): Promise<Record<string, any>[]> {
  // Placeholder - actual implementation would use proper parsers
  if (sourceType === 'CSV') {
    const content = buffer.toString('utf-8');
    const lines = content.split('\n').filter(l => l.trim());
    const headers = lines[0]?.split(',').map(h => h.trim().replace(/"/g, '')) ?? [];
    
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const record: Record<string, string> = {};
      headers.forEach((h, i) => {
        record[h] = values[i] ?? '';
      });
      return record;
    });
  }
  
  if (sourceType === 'JSON') {
    const data = JSON.parse(buffer.toString('utf-8'));
    return Array.isArray(data) ? data : [data];
  }
  
  return [];
}

function getDefaultMapping(sourceType: string): Record<string, string> {
  // Default field mappings for common formats
  return {
    name: 'name',
    species: 'species',
    breed: 'breed',
    age: 'age',
    sex: 'sex',
    color: 'color',
    weight: 'weight',
    microchipNumber: 'microchip',
    intakeDate: 'intake_date',
    intakeType: 'intake_type',
    description: 'description',
  };
}

function applyMapping(
  record: Record<string, any>,
  mappings: Record<string, string>
): Record<string, any> {
  const result: Record<string, any> = {};
  
  for (const [targetField, sourceField] of Object.entries(mappings)) {
    if (sourceField && record[sourceField] !== undefined) {
      result[targetField] = record[sourceField];
    }
  }
  
  return result;
}

async function findDuplicate(
  data: Record<string, any>,
  orgId: string
): Promise<{ id: string } | null> {
  // Check for duplicates by microchip or name + intake date
  if (data.microchipNumber) {
    const existing = await prisma.animal.findFirst({
      where: {
        organizationId: orgId,
        microchips: {
          some: { chipNumber: data.microchipNumber },
        },
      },
      select: { id: true },
    });
    if (existing) return existing;
  }
  
  if (data.name && data.intakeDate) {
    const existing = await prisma.animal.findFirst({
      where: {
        organizationId: orgId,
        name: data.name,
        intakeDate: new Date(data.intakeDate),
      },
      select: { id: true },
    });
    if (existing) return existing;
  }
  
  return null;
}

async function createAnimalFromImport(
  data: Record<string, any>,
  orgId: string,
  userId: string
): Promise<void> {
  // Normalize species
  const speciesMap: Record<string, string> = {
    dog: 'DOG', dogs: 'DOG', canine: 'DOG',
    cat: 'CAT', cats: 'CAT', feline: 'CAT',
    rabbit: 'RABBIT', rabbits: 'RABBIT',
    bird: 'BIRD', birds: 'BIRD',
    reptile: 'REPTILE', reptiles: 'REPTILE',
  };
  
  const species = speciesMap[data.species?.toLowerCase()] ?? 'OTHER';
  
  // Normalize sex
  const sexMap: Record<string, string> = {
    male: 'MALE', m: 'MALE',
    female: 'FEMALE', f: 'FEMALE',
  };
  const sex = sexMap[data.sex?.toLowerCase()] ?? 'UNKNOWN';
  
  await prisma.animal.create({
    data: {
      organizationId: orgId,
      name: data.name ?? 'Unknown',
      species: species as any,
      breed: data.breed,
      color: data.color,
      sex: sex as any,
      estimatedAge: data.age,
      weight: data.weight ? parseFloat(data.weight) : undefined,
      description: data.description,
      intakeDate: data.intakeDate ? new Date(data.intakeDate) : new Date(),
      status: 'IN_SHELTER',
      riskProfile: {
        create: {
          urgencyScore: 0,
          riskSeverity: 'LOW',
        },
      },
      intakeEvents: {
        create: {
          type: data.intakeType?.toUpperCase() ?? 'UNKNOWN',
          date: data.intakeDate ? new Date(data.intakeDate) : new Date(),
          source: 'Import',
          processedById: userId,
        },
      },
    },
  });
}

async function updateAnimal(
  id: string,
  data: Record<string, any>,
  userId: string
): Promise<void> {
  await prisma.animal.update({
    where: { id },
    data: {
      breed: data.breed ?? undefined,
      color: data.color ?? undefined,
      weight: data.weight ? parseFloat(data.weight) : undefined,
      description: data.description ?? undefined,
    },
  });
}

async function testExternalConnection(
  sourceType: string,
  credentials: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  // Placeholder - actual implementation would test API connectivity
  try {
    if (!credentials.apiUrl) {
      return { success: false, error: 'API URL is required' };
    }
    
    // Would make actual API request here
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

async function runExternalSync(
  jobId: string,
  connection: any
): Promise<void> {
  try {
    // Placeholder - actual implementation would use adapters
    const adapter = getAdapter(connection.sourceType);
    const records = await adapter.fetchAnimals(connection.credentials);
    
    let imported = 0;
    for (const record of records) {
      await createAnimalFromImport(
        record,
        connection.organizationId,
        connection.createdBy
      );
      imported++;
    }
    
    await prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        recordsProcessed: records.length,
        recordsImported: imported,
      },
    });
    
    await prisma.externalConnection.update({
      where: { id: connection.id },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: 'SUCCESS',
      },
    });
    
  } catch (err) {
    await prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        errors: [{ error: (err as Error).message }],
      },
    });
    
    await prisma.externalConnection.update({
      where: { id: connection.id },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: 'FAILED',
      },
    });
  }
}

function getAdapter(sourceType: string) {
  // Return adapter for external system
  // Placeholder - actual implementation would have real adapters
  return {
    async fetchAnimals(credentials: any): Promise<Record<string, any>[]> {
      return [];
    },
  };
}
