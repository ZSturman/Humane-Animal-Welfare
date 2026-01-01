/**
 * Webhook Routes
 * 
 * Manage outgoing webhooks for partner integrations
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '@shelter-link/database';
import { NotFoundError, ForbiddenError, ValidationError } from '../lib/errors.js';
import { requireAuth, requirePermission, requireOrganization } from '../middleware/auth.js';
import { createAuditLog } from '../middleware/audit.js';
import crypto from 'crypto';

const webhookEventTypes = [
  'animal.created',
  'animal.updated',
  'animal.deleted',
  'animal.status_changed',
  'animal.risk_critical',
  'animal.risk_high',
  'intake.created',
  'outcome.created',
  'transfer.requested',
  'transfer.approved',
  'transfer.completed',
  'medical.urgent',
  'capacity.threshold',
] as const;

const createWebhookSchema = z.object({
  name: z.string().min(3).max(100),
  url: z.string().url(),
  events: z.array(z.enum(webhookEventTypes)).min(1),
  secret: z.string().min(16).optional(),
  headers: z.record(z.string()).optional(),
  isActive: z.boolean().default(true),
});

const updateWebhookSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  url: z.string().url().optional(),
  events: z.array(z.enum(webhookEventTypes)).min(1).optional(),
  headers: z.record(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export async function webhookRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth());

  /**
   * List webhooks
   */
  app.get('/', {
    preHandler: [requireOrganization(), requirePermission('webhook:read')],
    schema: {
      description: 'List webhooks for organization',
      tags: ['Webhooks'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const orgId = request.organization!.id;
    
    const webhooks = await prisma.webhook.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        name: true,
        url: true,
        events: true,
        isActive: true,
        lastTriggeredAt: true,
        lastStatus: true,
        failureCount: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    
    return {
      success: true,
      data: webhooks,
    };
  });

  /**
   * Get webhook details
   */
  app.get('/:id', {
    preHandler: [requireOrganization(), requirePermission('webhook:read')],
    schema: {
      description: 'Get webhook details',
      tags: ['Webhooks'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const webhook = await prisma.webhook.findUnique({
      where: { id },
      include: {
        deliveries: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            eventType: true,
            status: true,
            statusCode: true,
            duration: true,
            createdAt: true,
          },
        },
      },
    });
    
    if (!webhook) {
      throw new NotFoundError('Webhook', id);
    }
    
    if (webhook.organizationId !== request.organization!.id) {
      throw new ForbiddenError('Access denied');
    }
    
    return {
      success: true,
      data: {
        ...webhook,
        secret: webhook.secret ? '••••••••' + webhook.secret.slice(-4) : null,
      },
    };
  });

  /**
   * Create webhook
   */
  app.post('/', {
    preHandler: [requireOrganization(), requirePermission('webhook:write')],
    schema: {
      description: 'Create webhook',
      tags: ['Webhooks'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const body = createWebhookSchema.parse(request.body);
    const orgId = request.organization!.id;
    
    // Generate secret if not provided
    const secret = body.secret ?? crypto.randomBytes(32).toString('hex');
    
    const webhook = await prisma.webhook.create({
      data: {
        organizationId: orgId,
        name: body.name,
        url: body.url,
        events: body.events,
        secret,
        headers: body.headers ?? {},
        isActive: body.isActive,
        createdBy: request.user!.id,
      },
    });
    
    await createAuditLog(request, 'CREATE', 'webhook', webhook.id);
    
    return {
      success: true,
      data: {
        id: webhook.id,
        name: webhook.name,
        url: webhook.url,
        events: webhook.events,
        secret, // Return full secret on creation only
        isActive: webhook.isActive,
      },
    };
  });

  /**
   * Update webhook
   */
  app.patch('/:id', {
    preHandler: [requireOrganization(), requirePermission('webhook:write')],
    schema: {
      description: 'Update webhook',
      tags: ['Webhooks'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateWebhookSchema.parse(request.body);
    
    const webhook = await prisma.webhook.findUnique({
      where: { id },
    });
    
    if (!webhook) {
      throw new NotFoundError('Webhook', id);
    }
    
    if (webhook.organizationId !== request.organization!.id) {
      throw new ForbiddenError('Access denied');
    }
    
    const updated = await prisma.webhook.update({
      where: { id },
      data: {
        name: body.name,
        url: body.url,
        events: body.events,
        headers: body.headers,
        isActive: body.isActive,
        // Reset failure count if re-enabling
        failureCount: body.isActive === true ? 0 : undefined,
      },
    });
    
    await createAuditLog(request, 'UPDATE', 'webhook', id);
    
    return {
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
        url: updated.url,
        events: updated.events,
        isActive: updated.isActive,
      },
    };
  });

  /**
   * Delete webhook
   */
  app.delete('/:id', {
    preHandler: [requireOrganization(), requirePermission('webhook:write')],
    schema: {
      description: 'Delete webhook',
      tags: ['Webhooks'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const webhook = await prisma.webhook.findUnique({
      where: { id },
    });
    
    if (!webhook) {
      throw new NotFoundError('Webhook', id);
    }
    
    if (webhook.organizationId !== request.organization!.id) {
      throw new ForbiddenError('Access denied');
    }
    
    await prisma.webhook.delete({
      where: { id },
    });
    
    await createAuditLog(request, 'DELETE', 'webhook', id);
    
    return {
      success: true,
      data: { message: 'Webhook deleted' },
    };
  });

  /**
   * Rotate webhook secret
   */
  app.post('/:id/rotate-secret', {
    preHandler: [requireOrganization(), requirePermission('webhook:write')],
    schema: {
      description: 'Rotate webhook secret',
      tags: ['Webhooks'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const webhook = await prisma.webhook.findUnique({
      where: { id },
    });
    
    if (!webhook) {
      throw new NotFoundError('Webhook', id);
    }
    
    if (webhook.organizationId !== request.organization!.id) {
      throw new ForbiddenError('Access denied');
    }
    
    const newSecret = crypto.randomBytes(32).toString('hex');
    
    await prisma.webhook.update({
      where: { id },
      data: { secret: newSecret },
    });
    
    await createAuditLog(request, 'ROTATE_SECRET', 'webhook', id);
    
    return {
      success: true,
      data: {
        secret: newSecret,
        message: 'Secret rotated. Update your endpoint to use the new secret.',
      },
    };
  });

  /**
   * Test webhook
   */
  app.post('/:id/test', {
    preHandler: [requireOrganization(), requirePermission('webhook:write')],
    schema: {
      description: 'Send test webhook',
      tags: ['Webhooks'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const webhook = await prisma.webhook.findUnique({
      where: { id },
    });
    
    if (!webhook) {
      throw new NotFoundError('Webhook', id);
    }
    
    if (webhook.organizationId !== request.organization!.id) {
      throw new ForbiddenError('Access denied');
    }
    
    const testPayload = {
      event: 'webhook.test',
      timestamp: new Date().toISOString(),
      organization: request.organization!.name,
      data: {
        message: 'This is a test webhook from Shelter Link',
        webhookId: webhook.id,
      },
    };
    
    const result = await deliverWebhook(webhook, testPayload);
    
    return {
      success: true,
      data: result,
    };
  });

  /**
   * Get webhook delivery history
   */
  app.get('/:id/deliveries', {
    preHandler: [requireOrganization(), requirePermission('webhook:read')],
    schema: {
      description: 'Get webhook delivery history',
      tags: ['Webhooks'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { limit = '50', offset = '0' } = request.query as Record<string, string>;
    
    const webhook = await prisma.webhook.findUnique({
      where: { id },
    });
    
    if (!webhook) {
      throw new NotFoundError('Webhook', id);
    }
    
    if (webhook.organizationId !== request.organization!.id) {
      throw new ForbiddenError('Access denied');
    }
    
    const [deliveries, total] = await Promise.all([
      prisma.webhookDelivery.findMany({
        where: { webhookId: id },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset),
      }),
      prisma.webhookDelivery.count({ where: { webhookId: id } }),
    ]);
    
    return {
      success: true,
      data: deliveries,
      meta: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    };
  });

  /**
   * Retry failed delivery
   */
  app.post('/deliveries/:deliveryId/retry', {
    preHandler: [requireOrganization(), requirePermission('webhook:write')],
    schema: {
      description: 'Retry failed webhook delivery',
      tags: ['Webhooks'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const { deliveryId } = request.params as { deliveryId: string };
    
    const delivery = await prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
      include: { webhook: true },
    });
    
    if (!delivery) {
      throw new NotFoundError('Webhook delivery', deliveryId);
    }
    
    if (delivery.webhook.organizationId !== request.organization!.id) {
      throw new ForbiddenError('Access denied');
    }
    
    if (delivery.status === 'SUCCESS') {
      throw new ValidationError('Cannot retry successful delivery');
    }
    
    const result = await deliverWebhook(
      delivery.webhook,
      delivery.payload as Record<string, any>,
      delivery.id
    );
    
    return {
      success: true,
      data: result,
    };
  });
}

// =====================
// Webhook Delivery Service
// =====================

interface WebhookRecord {
  id: string;
  url: string;
  secret: string;
  headers: any;
}

interface DeliveryResult {
  success: boolean;
  statusCode?: number;
  duration: number;
  error?: string;
}

export async function deliverWebhook(
  webhook: WebhookRecord,
  payload: Record<string, any>,
  existingDeliveryId?: string
): Promise<DeliveryResult> {
  const startTime = Date.now();
  const payloadString = JSON.stringify(payload);
  
  // Generate signature
  const signature = crypto
    .createHmac('sha256', webhook.secret)
    .update(payloadString)
    .digest('hex');
  
  // Create delivery record
  const delivery = existingDeliveryId
    ? await prisma.webhookDelivery.findUnique({ where: { id: existingDeliveryId } })
    : await prisma.webhookDelivery.create({
        data: {
          webhookId: webhook.id,
          eventType: payload.event,
          payload,
          status: 'PENDING',
        },
      });
  
  try {
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': `sha256=${signature}`,
        'X-Webhook-Id': webhook.id,
        'X-Delivery-Id': delivery!.id,
        'X-Timestamp': new Date().toISOString(),
        ...(webhook.headers as Record<string, string> ?? {}),
      },
      body: payloadString,
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });
    
    const duration = Date.now() - startTime;
    const success = response.ok;
    
    // Update delivery record
    await prisma.webhookDelivery.update({
      where: { id: delivery!.id },
      data: {
        status: success ? 'SUCCESS' : 'FAILED',
        statusCode: response.status,
        duration,
        response: success ? null : await response.text().catch(() => null),
      },
    });
    
    // Update webhook last triggered
    await prisma.webhook.update({
      where: { id: webhook.id },
      data: {
        lastTriggeredAt: new Date(),
        lastStatus: success ? 'SUCCESS' : 'FAILED',
        failureCount: success ? 0 : { increment: 1 },
      },
    });
    
    return {
      success,
      statusCode: response.status,
      duration,
    };
    
  } catch (err) {
    const duration = Date.now() - startTime;
    const error = err instanceof Error ? err.message : 'Unknown error';
    
    await prisma.webhookDelivery.update({
      where: { id: delivery!.id },
      data: {
        status: 'FAILED',
        duration,
        error,
      },
    });
    
    await prisma.webhook.update({
      where: { id: webhook.id },
      data: {
        lastTriggeredAt: new Date(),
        lastStatus: 'FAILED',
        failureCount: { increment: 1 },
      },
    });
    
    return {
      success: false,
      duration,
      error,
    };
  }
}

/**
 * Dispatch webhook event to all matching webhooks
 */
export async function dispatchWebhookEvent(
  eventType: string,
  orgId: string,
  data: Record<string, any>
): Promise<void> {
  const webhooks = await prisma.webhook.findMany({
    where: {
      organizationId: orgId,
      isActive: true,
      events: { has: eventType },
      failureCount: { lt: 10 }, // Disable after 10 consecutive failures
    },
  });
  
  const payload = {
    event: eventType,
    timestamp: new Date().toISOString(),
    data,
  };
  
  // Deliver to all matching webhooks in parallel
  await Promise.allSettled(
    webhooks.map(webhook => deliverWebhook(webhook, payload))
  );
}
