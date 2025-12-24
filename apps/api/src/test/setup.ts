/**
 * Test setup for API unit tests
 * Configures mocks for Prisma, Redis, and other dependencies
 */

import { vi, beforeAll, afterAll, afterEach } from 'vitest';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.API_PORT = '4001';
process.env.API_HOST = 'localhost';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.REDIS_URL = 'redis://localhost:6379';

// Mock Prisma client
vi.mock('@shelter-link/database', () => ({
  prisma: mockPrismaClient,
  Prisma: {
    PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
      code: string;
      constructor(message: string, { code }: { code: string }) {
        super(message);
        this.code = code;
      }
    },
  },
}));

// Mock Redis
vi.mock('ioredis', () => ({
  default: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    setex: vi.fn(),
    ping: vi.fn().mockResolvedValue('PONG'),
    quit: vi.fn(),
    on: vi.fn(),
  })),
}));

// Create mock Prisma client
const mockPrismaClient = {
  $connect: vi.fn(),
  $disconnect: vi.fn(),
  $transaction: vi.fn((fn: any) => fn(mockPrismaClient)),
  
  animal: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  
  user: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  
  organization: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  
  riskProfile: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  
  transferRequest: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  
  session: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
  },
  
  auditLog: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
};

// Export for use in tests
export { mockPrismaClient };

// Global setup
beforeAll(() => {
  // Any global setup
});

afterEach(() => {
  // Reset all mocks between tests
  vi.clearAllMocks();
});

afterAll(() => {
  // Cleanup
  vi.restoreAllMocks();
});

// Test utilities
export const createMockUser = (overrides = {}) => ({
  id: 'user-test-001',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz123456',
  role: 'STAFF',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockOrganization = (overrides = {}) => ({
  id: 'org-test-001',
  name: 'Test Shelter',
  slug: 'test-shelter',
  type: 'SHELTER',
  email: 'info@testshelter.org',
  phone: '555-123-4567',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockAnimal = (overrides = {}) => ({
  id: 'animal-test-001',
  organizationId: 'org-test-001',
  name: 'Test Animal',
  species: 'DOG',
  breed: 'Mixed',
  age: 3,
  ageUnit: 'YEARS',
  sex: 'MALE',
  status: 'IN_SHELTER',
  intakeDate: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockRiskProfile = (overrides = {}) => ({
  id: 'risk-test-001',
  animalId: 'animal-test-001',
  urgencyScore: 50,
  severity: 'ELEVATED',
  riskReasons: ['LONG_LOS'],
  losScore: 15,
  medicalScore: 10,
  behavioralScore: 5,
  capacityScore: 10,
  seniorScore: 0,
  specialNeedsScore: 0,
  lastCalculatedAt: new Date(),
  manualOverride: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockTransfer = (overrides = {}) => ({
  id: 'transfer-test-001',
  animalId: 'animal-test-001',
  sourceOrganizationId: 'org-test-001',
  destinationOrganizationId: 'org-test-002',
  requestedById: 'user-test-001',
  status: 'PENDING',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// JWT test helper
export const createMockJwtPayload = (overrides = {}) => ({
  sub: 'user-test-001',
  email: 'test@example.com',
  role: 'STAFF',
  organizationId: 'org-test-001',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 900,
  ...overrides,
});
