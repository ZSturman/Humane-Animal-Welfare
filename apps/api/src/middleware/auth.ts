/**
 * Authentication Middleware
 * 
 * JWT and API key authentication with RBAC
 */

import type { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';
import { prisma } from '@shelter-link/database';
import { createLogger } from '../lib/logger.js';
import { UnauthorizedError, ForbiddenError } from '../lib/errors.js';
import bcrypt from 'bcryptjs';

const logger = createLogger('auth');

// Paths that don't require authentication
const PUBLIC_PATHS = [
  '/api/health',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/forgot-password',
  '/docs',
];

// Paths that allow API key authentication
const API_KEY_PATHS = [
  '/api/animals',
  '/api/organizations',
  '/api/transfers',
  '/api/import',
  '/api/webhooks',
];

/**
 * Permission definitions
 */
export const Permissions = {
  // Animal permissions
  'animal:read': ['OWNER', 'ADMIN', 'MANAGER', 'STAFF', 'VETERINARIAN', 'VET_TECH', 'VOLUNTEER', 'FOSTER', 'READ_ONLY'],
  'animal:write': ['OWNER', 'ADMIN', 'MANAGER', 'STAFF', 'VET_TECH'],
  'animal:delete': ['OWNER', 'ADMIN', 'MANAGER'],
  'animal:transfer': ['OWNER', 'ADMIN', 'MANAGER', 'TRANSPORTER'],
  
  // Medical permissions
  'medical:read': ['OWNER', 'ADMIN', 'MANAGER', 'STAFF', 'VETERINARIAN', 'VET_TECH'],
  'medical:write': ['OWNER', 'ADMIN', 'VETERINARIAN', 'VET_TECH'],
  
  // Organization permissions
  'org:read': ['OWNER', 'ADMIN', 'MANAGER', 'STAFF', 'VETERINARIAN', 'VET_TECH', 'VOLUNTEER', 'FOSTER', 'READ_ONLY'],
  'org:write': ['OWNER', 'ADMIN'],
  'org:users': ['OWNER', 'ADMIN', 'MANAGER'],
  
  // Import permissions
  'import:read': ['OWNER', 'ADMIN', 'MANAGER'],
  'import:write': ['OWNER', 'ADMIN', 'MANAGER'],
  
  // Webhook permissions
  'webhook:read': ['OWNER', 'ADMIN'],
  'webhook:write': ['OWNER', 'ADMIN'],
  
  // API key permissions
  'apikey:read': ['OWNER', 'ADMIN'],
  'apikey:write': ['OWNER', 'ADMIN'],
} as const;

export type Permission = keyof typeof Permissions;

/**
 * Check if a role has a permission
 */
export function hasPermission(role: string, permission: Permission): boolean {
  const allowedRoles = Permissions[permission];
  return allowedRoles?.includes(role as any) ?? false;
}

/**
 * Authentication middleware
 */
export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
  done: HookHandlerDoneFunction
) {
  // Skip auth for public paths
  if (PUBLIC_PATHS.some(path => request.url.startsWith(path))) {
    return done();
  }
  
  try {
    // Try JWT authentication first
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      await authenticateJWT(request, authHeader.substring(7));
      return done();
    }
    
    // Try API key authentication for allowed paths
    const apiKey = request.headers['x-api-key'];
    if (apiKey && API_KEY_PATHS.some(path => request.url.startsWith(path))) {
      await authenticateApiKey(request, apiKey.toString());
      return done();
    }
    
    // No valid authentication
    throw new UnauthorizedError('Authentication required');
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
      throw error;
    }
    logger.error({ error }, 'Authentication error');
    throw new UnauthorizedError('Authentication failed');
  }
}

/**
 * Authenticate via JWT token
 */
async function authenticateJWT(request: FastifyRequest, token: string) {
  try {
    // Verify JWT
    const decoded = await request.jwtVerify<{
      sub: string;
      email: string;
      name: string;
      orgId?: string;
      role?: string;
    }>();
    
    // Load user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      include: {
        organizations: {
          include: {
            organization: true,
          },
        },
      },
    });
    
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedError('User not found or inactive');
    }
    
    // Set user on request
    request.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: decoded.role,
    };
    
    // Set organization context if specified
    const orgId = decoded.orgId ?? request.headers['x-organization-id']?.toString();
    if (orgId) {
      const membership = user.organizations.find(o => o.organizationId === orgId);
      if (membership) {
        request.organization = {
          id: membership.organization.id,
          name: membership.organization.name,
          slug: membership.organization.slug,
        };
        request.user.role = membership.role;
      }
    } else if (user.organizations.length > 0) {
      // Use primary organization or first one
      const primary = user.organizations.find(o => o.isPrimary) ?? user.organizations[0];
      if (primary) {
        request.organization = {
          id: primary.organization.id,
          name: primary.organization.name,
          slug: primary.organization.slug,
        };
        request.user.role = primary.role;
      }
    }
    
    logger.debug({
      userId: user.id,
      orgId: request.organization?.id,
      role: request.user.role,
    }, 'JWT authentication successful');
  } catch (error: any) {
    if (error.code === 'FST_JWT_NO_AUTHORIZATION_IN_HEADER' || 
        error.code === 'FST_JWT_AUTHORIZATION_TOKEN_EXPIRED') {
      throw new UnauthorizedError('Token expired');
    }
    throw error;
  }
}

/**
 * Authenticate via API key
 */
async function authenticateApiKey(request: FastifyRequest, key: string) {
  // API keys are prefixed (e.g., "sk_live_abc123...")
  const keyPrefix = key.substring(0, 16);
  
  // Find API key by prefix
  const apiKey = await prisma.apiKey.findFirst({
    where: {
      keyPrefix,
      isActive: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
    include: {
      organization: true,
    },
  });
  
  if (!apiKey) {
    throw new UnauthorizedError('Invalid API key');
  }
  
  // Verify key hash
  const isValid = await bcrypt.compare(key, apiKey.keyHash);
  if (!isValid) {
    throw new UnauthorizedError('Invalid API key');
  }
  
  // Update last used
  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  });
  
  // Set organization context
  request.organization = {
    id: apiKey.organization.id,
    name: apiKey.organization.name,
    slug: apiKey.organization.slug,
  };
  
  // API keys get a service account user
  request.user = {
    id: `api:${apiKey.id}`,
    email: `api@${apiKey.organization.slug}.shelterlink.org`,
    name: `API: ${apiKey.name}`,
    role: 'STAFF', // API keys default to staff role, scoped by their scopes
  };
  
  logger.debug({
    apiKeyId: apiKey.id,
    orgId: apiKey.organization.id,
  }, 'API key authentication successful');
}

/**
 * Require authentication decorator
 */
export function requireAuth() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      throw new UnauthorizedError();
    }
  };
}

/**
 * Require permission decorator
 */
export function requirePermission(permission: Permission) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      throw new UnauthorizedError();
    }
    
    if (!request.user.role || !hasPermission(request.user.role, permission)) {
      throw new ForbiddenError(`Missing permission: ${permission}`);
    }
  };
}

/**
 * Require organization context decorator
 */
export function requireOrganization() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.organization) {
      throw new ForbiddenError('Organization context required');
    }
  };
}
