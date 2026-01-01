/**
 * Authentication Routes (Simplified for Prototype)
 * 
 * Single login endpoint with 7-day JWT token.
 * 
 * TODO: Production - Add these features from _archive/routes/auth.ts:
 *   - POST /register - User registration with email verification
 *   - POST /refresh - Refresh token endpoint
 *   - POST /forgot-password - Password reset flow
 *   - Session storage in database
 *   - Failed attempt tracking and account locking
 *   - Multi-organization context switching
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { UnauthorizedError } from '../lib/errors.js';
import { createLogger } from '../lib/logger.js';

const logger = createLogger('auth');
const prisma = new PrismaClient();

// Validation schemas
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function authRoutes(app: FastifyInstance) {
  /**
   * Login - Get JWT token
   */
  app.post('/login', {
    schema: {
      description: 'Authenticate user and get access token',
      tags: ['Auth'],
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 1 },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                token: { type: 'string' },
                expiresIn: { type: 'number' },
                user: { type: 'object' },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const body = loginSchema.parse(request.body);

    // Find user with their organizations
    const user = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase() },
      include: {
        organizations: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Check password
    const validPassword = await bcrypt.compare(body.password, user.passwordHash);
    if (!validPassword) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Check if account is active
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedError('Account is not active');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Get primary organization (if any)
    const primaryOrg = user.organizations.find(o => o.isPrimary) ?? user.organizations[0];

    // Generate JWT token (7 days)
    // TODO: Production - Add refresh tokens, store session in database
    const token = app.jwt.sign(
      {
        sub: user.id,
        email: user.email,
        name: user.name,
        globalRole: user.globalRole,
        orgId: primaryOrg?.organizationId,
        orgRole: primaryOrg?.role,
      },
      { expiresIn: '7d' }
    );

    logger.info({ userId: user.id, email: user.email }, 'User logged in');

    return {
      success: true,
      data: {
        token,
        expiresIn: 7 * 24 * 60 * 60, // 7 days in seconds
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          avatarUrl: user.avatarUrl,
          globalRole: user.globalRole,
          organizations: user.organizations.map(o => ({
            id: o.organization.id,
            name: o.organization.name,
            slug: o.organization.slug,
            role: o.role,
            isPrimary: o.isPrimary,
          })),
        },
      },
    };
  });

  /**
   * Logout - Just returns success (stateless JWT)
   * TODO: Production - Invalidate session in database, add to token blacklist
   */
  app.post('/logout', {
    schema: {
      description: 'Logout (stateless - just for client cleanup)',
      tags: ['Auth'],
    },
  }, async (request, reply) => {
    // In production, we would invalidate the session in the database
    // For prototype, JWT is stateless so logout is just client-side
    return { success: true };
  });

  /**
   * Get current user info
   */
  app.get('/me', {
    schema: {
      description: 'Get current authenticated user',
      tags: ['Auth'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    // Check for auth header
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication required');
    }

    let decoded;
    try {
      decoded = await request.jwtVerify<{
        sub: string;
        email: string;
        name: string;
        globalRole: string;
        orgId?: string;
        orgRole?: string;
      }>();
    } catch {
      throw new UnauthorizedError('Invalid or expired token');
    }

    // Fetch fresh user data
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

    return {
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        globalRole: user.globalRole,
        organizations: user.organizations.map(o => ({
          id: o.organization.id,
          name: o.organization.name,
          slug: o.organization.slug,
          type: o.organization.type,
          role: o.role,
          isPrimary: o.isPrimary,
        })),
      },
    };
  });
}
