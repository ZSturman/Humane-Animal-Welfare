/**
 * Authentication Routes
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@shelter-link/database';
import { ApiError, UnauthorizedError, ValidationError, ConflictError } from '../lib/errors.js';
import { createLogger } from '../lib/logger.js';
import { createAuditLog } from '../middleware/audit.js';

const logger = createLogger('auth');

// Validation schemas
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  organizationSlug: z.string().optional(),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  organizationSlug: z.string().optional(),
  inviteCode: z.string().optional(),
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

export async function authRoutes(app: FastifyInstance) {
  /**
   * Login
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
          password: { type: 'string', minLength: 8 },
          organizationSlug: { type: 'string' },
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
                accessToken: { type: 'string' },
                refreshToken: { type: 'string' },
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

    // Find user
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

    if (!user || !user.passwordHash) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Check password
    const validPassword = await bcrypt.compare(body.password, user.passwordHash);
    if (!validPassword) {
      // Increment failed attempts
      await prisma.user.update({
        where: { id: user.id },
        data: { failedAttempts: { increment: 1 } },
      });
      throw new UnauthorizedError('Invalid email or password');
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedError('Account is temporarily locked');
    }

    // Check if account is active
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedError('Account is not active');
    }

    // Reset failed attempts
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    // Determine organization context
    let org = user.organizations[0];
    if (body.organizationSlug) {
      org = user.organizations.find(o => o.organization.slug === body.organizationSlug);
      if (!org) {
        throw new UnauthorizedError('Access denied to organization');
      }
    }

    // Generate tokens
    const accessToken = app.jwt.sign({
      sub: user.id,
      email: user.email,
      name: user.name,
      orgId: org?.organization.id,
      role: org?.role,
    });

    const refreshToken = app.jwt.sign(
      { sub: user.id, type: 'refresh' },
      { expiresIn: '30d' }
    );

    // Store session
    await prisma.session.create({
      data: {
        userId: user.id,
        token: accessToken,
        refreshToken,
        userAgent: request.headers['user-agent'],
        ipAddress: request.ip,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Audit log
    await createAuditLog(request, 'LOGIN', 'user', user.id);

    return {
      success: true,
      data: {
        accessToken,
        refreshToken,
        expiresIn: 7 * 24 * 60 * 60,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          locale: user.locale,
          organizations: user.organizations.map(o => ({
            organization: {
              id: o.organization.id,
              name: o.organization.name,
              slug: o.organization.slug,
            },
            role: o.role,
            isPrimary: o.isPrimary,
          })),
        },
      },
    };
  });

  /**
   * Register new user
   */
  app.post('/register', {
    schema: {
      description: 'Register a new user account',
      tags: ['Auth'],
      body: {
        type: 'object',
        required: ['email', 'password', 'name'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          name: { type: 'string', minLength: 2 },
          organizationSlug: { type: 'string' },
          inviteCode: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const body = registerSchema.parse(request.body);

    // Check if email already exists
    const existing = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictError('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(body.password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: body.email.toLowerCase(),
        passwordHash,
        name: body.name,
        status: 'PENDING_VERIFICATION',
      },
    });

    // Audit log
    await createAuditLog(request, 'REGISTER', 'user', user.id);

    return {
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        status: user.status,
      },
    };
  });

  /**
   * Refresh token
   */
  app.post('/refresh', {
    schema: {
      description: 'Refresh access token',
      tags: ['Auth'],
      body: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const { refreshToken } = refreshSchema.parse(request.body);

    // Verify refresh token
    let decoded;
    try {
      decoded = app.jwt.verify<{ sub: string; type: string }>(refreshToken);
    } catch {
      throw new UnauthorizedError('Invalid refresh token');
    }

    if (decoded.type !== 'refresh') {
      throw new UnauthorizedError('Invalid token type');
    }

    // Find session
    const session = await prisma.session.findFirst({
      where: {
        refreshToken,
        userId: decoded.sub,
      },
      include: {
        user: {
          include: {
            organizations: {
              include: {
                organization: true,
              },
            },
          },
        },
      },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedError('Session expired');
    }

    const user = session.user;
    const org = user.organizations.find(o => o.isPrimary) ?? user.organizations[0];

    // Generate new access token
    const accessToken = app.jwt.sign({
      sub: user.id,
      email: user.email,
      name: user.name,
      orgId: org?.organization.id,
      role: org?.role,
    });

    // Update session
    await prisma.session.update({
      where: { id: session.id },
      data: { token: accessToken },
    });

    return {
      success: true,
      data: {
        accessToken,
        expiresIn: 7 * 24 * 60 * 60,
      },
    };
  });

  /**
   * Logout
   */
  app.post('/logout', {
    schema: {
      description: 'Logout and invalidate session',
      tags: ['Auth'],
    },
  }, async (request, reply) => {
    if (request.user) {
      // Delete session
      const authHeader = request.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        await prisma.session.deleteMany({
          where: {
            token: authHeader.substring(7),
            userId: request.user.id,
          },
        });
      }

      await createAuditLog(request, 'LOGOUT', 'user', request.user.id);
    }

    return { success: true };
  });

  /**
   * Get current user
   */
  app.get('/me', {
    schema: {
      description: 'Get current authenticated user',
      tags: ['Auth'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    if (!request.user) {
      throw new UnauthorizedError();
    }

    const user = await prisma.user.findUnique({
      where: { id: request.user.id },
      include: {
        organizations: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    return {
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        locale: user.locale,
        preferences: user.preferences,
        organizations: user.organizations.map(o => ({
          organization: {
            id: o.organization.id,
            name: o.organization.name,
            slug: o.organization.slug,
          },
          role: o.role,
          isPrimary: o.isPrimary,
        })),
      },
    };
  });
}
