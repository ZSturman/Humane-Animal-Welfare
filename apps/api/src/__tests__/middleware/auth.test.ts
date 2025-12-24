/**
 * Auth Middleware Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';

// Test JWT utilities
const JWT_SECRET = 'test-secret-key';
const JWT_EXPIRES_IN = '15m';

// Mock user payload
const createMockPayload = (overrides = {}) => ({
  sub: 'user-001',
  email: 'test@example.com',
  role: 'STAFF',
  organizationId: 'org-001',
  permissions: ['animals:read', 'animals:write'],
  ...overrides,
});

// JWT generation helper (mimics auth middleware)
const generateToken = (payload: Record<string, any>, expiresIn = JWT_EXPIRES_IN) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

// JWT verification helper (mimics auth middleware)
const verifyToken = (token: string) => {
  return jwt.verify(token, JWT_SECRET);
};

// Permission check helper (mimics auth middleware logic)
const hasPermission = (
  userPermissions: string[],
  requiredPermission: string
): boolean => {
  // Super admin has all permissions
  if (userPermissions.includes('*')) return true;
  
  // Direct match
  if (userPermissions.includes(requiredPermission)) return true;
  
  // Wildcard match (e.g., "animals:*" matches "animals:read")
  const [resource] = requiredPermission.split(':');
  if (userPermissions.includes(`${resource}:*`)) return true;
  
  return false;
};

// Role-based permission mapping
const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: ['*'],
  ORG_ADMIN: ['animals:*', 'users:*', 'transfers:*', 'settings:*', 'import:*', 'risk:*'],
  MANAGER: ['animals:*', 'users:read', 'transfers:*', 'risk:*'],
  STAFF: ['animals:read', 'animals:write', 'transfers:read', 'risk:read'],
  VOLUNTEER: ['animals:read'],
  VET_STAFF: ['animals:read', 'animals:write', 'risk:read'],
  FOSTER: ['animals:read'],
  READ_ONLY: ['animals:read', 'risk:read'],
};

const getPermissionsForRole = (role: string): string[] => {
  return ROLE_PERMISSIONS[role] || [];
};

describe('Auth Middleware', () => {
  describe('JWT Token Generation', () => {
    it('should generate valid JWT token', () => {
      const payload = createMockPayload();
      const token = generateToken(payload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });

    it('should include all payload fields in token', () => {
      const payload = createMockPayload();
      const token = generateToken(payload);
      const decoded = verifyToken(token) as jwt.JwtPayload;
      
      expect(decoded.sub).toBe(payload.sub);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.role).toBe(payload.role);
      expect(decoded.organizationId).toBe(payload.organizationId);
    });

    it('should set correct expiration time', () => {
      const payload = createMockPayload();
      const token = generateToken(payload, '1h');
      const decoded = verifyToken(token) as jwt.JwtPayload;
      
      const now = Math.floor(Date.now() / 1000);
      const expectedExp = now + 3600; // 1 hour
      
      expect(decoded.exp).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(now);
      expect(decoded.exp).toBeLessThanOrEqual(expectedExp + 5); // Allow 5s tolerance
    });
  });

  describe('JWT Token Verification', () => {
    it('should successfully verify valid token', () => {
      const payload = createMockPayload();
      const token = generateToken(payload);
      
      expect(() => verifyToken(token)).not.toThrow();
    });

    it('should reject expired token', () => {
      const payload = createMockPayload();
      const token = generateToken(payload, '-1s'); // Already expired
      
      expect(() => verifyToken(token)).toThrow();
    });

    it('should reject token with invalid signature', () => {
      const payload = createMockPayload();
      const token = jwt.sign(payload, 'wrong-secret');
      
      expect(() => verifyToken(token)).toThrow();
    });

    it('should reject malformed token', () => {
      expect(() => verifyToken('not-a-token')).toThrow();
      expect(() => verifyToken('')).toThrow();
      expect(() => verifyToken('a.b')).toThrow();
    });
  });

  describe('Permission Checking', () => {
    it('should allow super admin access to everything', () => {
      const permissions = ['*'];
      
      expect(hasPermission(permissions, 'animals:read')).toBe(true);
      expect(hasPermission(permissions, 'users:delete')).toBe(true);
      expect(hasPermission(permissions, 'settings:write')).toBe(true);
    });

    it('should allow direct permission match', () => {
      const permissions = ['animals:read', 'animals:write'];
      
      expect(hasPermission(permissions, 'animals:read')).toBe(true);
      expect(hasPermission(permissions, 'animals:write')).toBe(true);
    });

    it('should allow wildcard permission match', () => {
      const permissions = ['animals:*'];
      
      expect(hasPermission(permissions, 'animals:read')).toBe(true);
      expect(hasPermission(permissions, 'animals:write')).toBe(true);
      expect(hasPermission(permissions, 'animals:delete')).toBe(true);
    });

    it('should deny ungranted permissions', () => {
      const permissions = ['animals:read'];
      
      expect(hasPermission(permissions, 'animals:write')).toBe(false);
      expect(hasPermission(permissions, 'users:read')).toBe(false);
      expect(hasPermission(permissions, 'settings:write')).toBe(false);
    });

    it('should deny with empty permissions', () => {
      const permissions: string[] = [];
      
      expect(hasPermission(permissions, 'animals:read')).toBe(false);
    });
  });

  describe('Role-Based Permissions', () => {
    it('should grant correct permissions to SUPER_ADMIN', () => {
      const permissions = getPermissionsForRole('SUPER_ADMIN');
      
      expect(permissions).toContain('*');
    });

    it('should grant correct permissions to ORG_ADMIN', () => {
      const permissions = getPermissionsForRole('ORG_ADMIN');
      
      expect(hasPermission(permissions, 'animals:read')).toBe(true);
      expect(hasPermission(permissions, 'animals:write')).toBe(true);
      expect(hasPermission(permissions, 'users:read')).toBe(true);
      expect(hasPermission(permissions, 'transfers:write')).toBe(true);
    });

    it('should grant limited permissions to STAFF', () => {
      const permissions = getPermissionsForRole('STAFF');
      
      expect(hasPermission(permissions, 'animals:read')).toBe(true);
      expect(hasPermission(permissions, 'animals:write')).toBe(true);
      expect(hasPermission(permissions, 'users:write')).toBe(false);
      expect(hasPermission(permissions, 'settings:write')).toBe(false);
    });

    it('should grant read-only permissions to VOLUNTEER', () => {
      const permissions = getPermissionsForRole('VOLUNTEER');
      
      expect(hasPermission(permissions, 'animals:read')).toBe(true);
      expect(hasPermission(permissions, 'animals:write')).toBe(false);
      expect(hasPermission(permissions, 'transfers:read')).toBe(false);
    });

    it('should return empty array for unknown role', () => {
      const permissions = getPermissionsForRole('UNKNOWN_ROLE');
      
      expect(permissions).toEqual([]);
    });
  });

  describe('API Key Authentication', () => {
    // Mock API key validation
    const validateApiKey = (key: string): { valid: boolean; organizationId?: string; permissions?: string[] } => {
      // In production, this would look up the key in the database
      if (key === 'valid-api-key-123') {
        return {
          valid: true,
          organizationId: 'org-001',
          permissions: ['animals:read', 'animals:write'],
        };
      }
      if (key === 'read-only-key') {
        return {
          valid: true,
          organizationId: 'org-002',
          permissions: ['animals:read'],
        };
      }
      return { valid: false };
    };

    it('should validate correct API key', () => {
      const result = validateApiKey('valid-api-key-123');
      
      expect(result.valid).toBe(true);
      expect(result.organizationId).toBe('org-001');
      expect(result.permissions).toBeDefined();
    });

    it('should reject invalid API key', () => {
      const result = validateApiKey('invalid-key');
      
      expect(result.valid).toBe(false);
      expect(result.organizationId).toBeUndefined();
    });

    it('should return correct permissions for API key', () => {
      const result = validateApiKey('read-only-key');
      
      expect(result.valid).toBe(true);
      expect(result.permissions).toContain('animals:read');
      expect(result.permissions).not.toContain('animals:write');
    });
  });

  describe('Request Header Parsing', () => {
    // Mock header parsing
    const parseAuthHeader = (header: string | undefined): { type: string; token: string } | null => {
      if (!header) return null;
      
      const parts = header.split(' ');
      if (parts.length !== 2) return null;
      
      const [type, token] = parts;
      if (!['Bearer', 'ApiKey'].includes(type)) return null;
      
      return { type, token };
    };

    it('should parse Bearer token correctly', () => {
      const result = parseAuthHeader('Bearer abc123');
      
      expect(result).not.toBeNull();
      expect(result?.type).toBe('Bearer');
      expect(result?.token).toBe('abc123');
    });

    it('should parse ApiKey correctly', () => {
      const result = parseAuthHeader('ApiKey xyz789');
      
      expect(result).not.toBeNull();
      expect(result?.type).toBe('ApiKey');
      expect(result?.token).toBe('xyz789');
    });

    it('should return null for missing header', () => {
      const result = parseAuthHeader(undefined);
      
      expect(result).toBeNull();
    });

    it('should return null for malformed header', () => {
      expect(parseAuthHeader('Bearer')).toBeNull();
      expect(parseAuthHeader('InvalidType token')).toBeNull();
      expect(parseAuthHeader('Bearer token extra')).toBeNull();
    });
  });
});
