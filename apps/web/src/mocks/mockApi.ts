/**
 * Mock API adapter for demo mode
 * Routes API calls to mock data instead of real backend
 */

import {
  mockAnimals,
  getAtRiskAnimals,
  searchAnimals,
} from './data/animals';
import {
  mockUser,
  mockOrganization,
  mockPartnerOrganizations,
  mockLocations,
} from './data/users';
import {
  mockTransfers,
  getIncomingTransfers,
  getOutgoingTransfers,
} from './data/transfers';
import {
  calculateDashboardStats,
  calculateRiskDashboard,
  calculateOrgStats,
} from './data/dashboard';

export interface MockApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface MockPaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Simulate network delay
const delay = (ms: number = 200): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Parse URL parameters
const parseQueryParams = (
  url: string
): Record<string, string> => {
  const params: Record<string, string> = {};
  const queryString = url.split('?')[1];
  if (queryString) {
    queryString.split('&').forEach((param) => {
      const [key, value] = param.split('=');
      params[key] = decodeURIComponent(value || '');
    });
  }
  return params;
};

// Extract path parameters
const matchRoute = (
  url: string,
  pattern: string
): Record<string, string> | null => {
  const urlPath = url.split('?')[0];
  const patternParts = pattern.split('/');
  const urlParts = urlPath.split('/');

  if (patternParts.length !== urlParts.length) return null;

  const params: Record<string, string> = {};

  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      params[patternParts[i].slice(1)] = urlParts[i];
    } else if (patternParts[i] !== urlParts[i]) {
      return null;
    }
  }

  return params;
};

// Route handlers
const routeHandlers: Record<
  string,
  (
    method: string,
    url: string,
    body?: unknown
  ) => Promise<MockApiResponse<unknown> | MockPaginatedResponse<unknown>>
> = {
  // Auth routes
  '/auth/login': async (method, _url, body) => {
    await delay(300);
    if (method !== 'POST') {
      return { success: false, data: null, error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } };
    }
    const { email } = body as { email: string; password: string };
    if (email) {
      return {
        success: true,
        data: {
          user: mockUser,
          token: 'mock-jwt-token-' + Date.now(),
          refreshToken: 'mock-refresh-token-' + Date.now(),
          expiresIn: 900,
        },
      };
    }
    return {
      success: false,
      data: null,
      error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
    };
  },

  '/auth/me': async () => {
    await delay(100);
    return { success: true, data: mockUser };
  },

  '/auth/refresh': async () => {
    await delay(100);
    return {
      success: true,
      data: {
        token: 'mock-jwt-token-refreshed-' + Date.now(),
        expiresIn: 900,
      },
    };
  },

  // Health routes
  '/health': async () => {
    return { success: true, data: { status: 'ok', timestamp: new Date().toISOString() } };
  },

  '/health/detailed': async () => {
    return {
      success: true,
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {
          database: 'mock',
          redis: 'mock',
          storage: 'mock',
        },
      },
    };
  },

  // Animals routes
  '/animals': async (method, url) => {
    await delay(200);
    if (method === 'GET') {
      const params = parseQueryParams(url);
      const page = parseInt(params.page || '1');
      const limit = parseInt(params.limit || '20');
      const search = params.search || '';
      const species = params.species;
      const status = params.status;

      let animals = [...mockAnimals];

      // Apply filters
      if (search) {
        animals = searchAnimals(search);
      }
      if (species) {
        animals = animals.filter((a) => a.species === species);
      }
      if (status) {
        animals = animals.filter((a) => a.status === status);
      }

      // Paginate
      const total = animals.length;
      const start = (page - 1) * limit;
      const paginatedAnimals = animals.slice(start, start + limit);

      return {
        success: true,
        data: paginatedAnimals,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }
    return { success: false, data: null, error: { code: 'NOT_IMPLEMENTED', message: 'Not implemented in demo mode' } };
  },

  '/animals/at-risk': async (method, url) => {
    await delay(200);
    if (method === 'GET') {
      const params = parseQueryParams(url);
      const page = parseInt(params.page || '1');
      const limit = parseInt(params.limit || '20');
      const severity = params.severity;

      let animals = getAtRiskAnimals();

      // Filter by severity if specified
      if (severity) {
        animals = animals.filter((a) => a.riskProfile?.severity === severity);
      }

      // Sort by urgency score (highest first)
      animals.sort(
        (a, b) =>
          (b.riskProfile?.urgencyScore || 0) - (a.riskProfile?.urgencyScore || 0)
      );

      // Paginate
      const total = animals.length;
      const start = (page - 1) * limit;
      const paginatedAnimals = animals.slice(start, start + limit);

      return {
        success: true,
        data: paginatedAnimals,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }
    return { success: false, data: null, error: { code: 'NOT_IMPLEMENTED', message: 'Not implemented' } };
  },

  // Risk routes
  '/risk/dashboard': async () => {
    await delay(200);
    return { success: true, data: calculateRiskDashboard() };
  },

  '/risk/recalculate': async () => {
    await delay(500);
    return {
      success: true,
      data: { message: 'Risk scores recalculated', animalsUpdated: mockAnimals.length },
    };
  },

  // Organization routes
  '/organizations': async (method, url) => {
    await delay(150);
    if (method === 'GET') {
      const params = parseQueryParams(url);
      const page = parseInt(params.page || '1');
      const limit = parseInt(params.limit || '20');

      const orgs = [mockOrganization, ...mockPartnerOrganizations];

      return {
        success: true,
        data: orgs,
        pagination: {
          page,
          limit,
          total: orgs.length,
          totalPages: 1,
        },
      };
    }
    return { success: false, data: null, error: { code: 'NOT_IMPLEMENTED', message: 'Not implemented' } };
  },

  '/organizations/me': async () => {
    await delay(100);
    return { success: true, data: mockOrganization };
  },

  '/organizations/me/stats': async () => {
    await delay(200);
    return { success: true, data: calculateOrgStats() };
  },

  // Transfer routes
  '/transfers': async (method, url) => {
    await delay(200);
    if (method === 'GET') {
      const params = parseQueryParams(url);
      const direction = params.direction;
      const page = parseInt(params.page || '1');
      const limit = parseInt(params.limit || '20');

      let transfers = [...mockTransfers];

      if (direction === 'incoming') {
        transfers = getIncomingTransfers();
      } else if (direction === 'outgoing') {
        transfers = getOutgoingTransfers();
      }

      return {
        success: true,
        data: transfers,
        pagination: {
          page,
          limit,
          total: transfers.length,
          totalPages: Math.ceil(transfers.length / limit),
        },
      };
    }
    return { success: false, data: null, error: { code: 'NOT_IMPLEMENTED', message: 'Not implemented' } };
  },

  // Dashboard
  '/dashboard': async () => {
    await delay(200);
    return { success: true, data: calculateDashboardStats() };
  },

  // Locations
  '/locations': async () => {
    await delay(100);
    return { success: true, data: mockLocations };
  },
};

// Dynamic route handlers (with path params)
const dynamicRouteHandlers: {
  pattern: string;
  handler: (
    method: string,
    params: Record<string, string>,
    url: string,
    body?: unknown
  ) => Promise<MockApiResponse<unknown>>;
}[] = [
  {
    pattern: '/animals/:id',
    handler: async (method, params) => {
      await delay(150);
      if (method === 'GET') {
        const animal = mockAnimals.find((a) => a.id === params.id);
        if (animal) {
          return { success: true, data: animal };
        }
        return {
          success: false,
          data: null,
          error: { code: 'NOT_FOUND', message: 'Animal not found' },
        };
      }
      return { success: false, data: null, error: { code: 'NOT_IMPLEMENTED', message: 'Not implemented' } };
    },
  },
  {
    pattern: '/risk/:animalId',
    handler: async (method, params) => {
      await delay(150);
      if (method === 'GET') {
        const animal = mockAnimals.find((a) => a.id === params.animalId);
        if (animal?.riskProfile) {
          return { success: true, data: animal.riskProfile };
        }
        return {
          success: false,
          data: null,
          error: { code: 'NOT_FOUND', message: 'Risk profile not found' },
        };
      }
      return { success: false, data: null, error: { code: 'NOT_IMPLEMENTED', message: 'Not implemented' } };
    },
  },
  {
    pattern: '/organizations/:slug',
    handler: async (method, params) => {
      await delay(100);
      if (method === 'GET') {
        const allOrgs = [mockOrganization, ...mockPartnerOrganizations];
        const org = allOrgs.find((o) => o.slug === params.slug);
        if (org) {
          return { success: true, data: org };
        }
        return {
          success: false,
          data: null,
          error: { code: 'NOT_FOUND', message: 'Organization not found' },
        };
      }
      return { success: false, data: null, error: { code: 'NOT_IMPLEMENTED', message: 'Not implemented' } };
    },
  },
  {
    pattern: '/organizations/:slug/stats',
    handler: async (method, params) => {
      await delay(200);
      if (method === 'GET') {
        const allOrgs = [mockOrganization, ...mockPartnerOrganizations];
        const org = allOrgs.find((o) => o.slug === params.slug);
        if (org) {
          return { success: true, data: calculateOrgStats() };
        }
        return {
          success: false,
          data: null,
          error: { code: 'NOT_FOUND', message: 'Organization not found' },
        };
      }
      return { success: false, data: null, error: { code: 'NOT_IMPLEMENTED', message: 'Not implemented' } };
    },
  },
  {
    pattern: '/transfers/:id',
    handler: async (method, params) => {
      await delay(150);
      if (method === 'GET') {
        const transfer = mockTransfers.find((t) => t.id === params.id);
        if (transfer) {
          return { success: true, data: transfer };
        }
        return {
          success: false,
          data: null,
          error: { code: 'NOT_FOUND', message: 'Transfer not found' },
        };
      }
      return { success: false, data: null, error: { code: 'NOT_IMPLEMENTED', message: 'Not implemented' } };
    },
  },
];

/**
 * Main mock API handler
 */
export async function getMockResponse<T>(
  endpoint: string,
  options: {
    method?: string;
    body?: unknown;
  } = {}
): Promise<MockApiResponse<T> | MockPaginatedResponse<T>> {
  const method = options.method || 'GET';
  const body = options.body;

  // Remove leading slash if present for consistency
  const normalizedEndpoint = endpoint.startsWith('/')
    ? endpoint
    : '/' + endpoint;
  const urlPath = normalizedEndpoint.split('?')[0];

  // Try exact route match first
  if (routeHandlers[urlPath]) {
    return routeHandlers[urlPath](method, normalizedEndpoint, body) as Promise<
      MockApiResponse<T> | MockPaginatedResponse<T>
    >;
  }

  // Try dynamic routes
  for (const { pattern, handler } of dynamicRouteHandlers) {
    const params = matchRoute(urlPath, pattern);
    if (params) {
      return handler(method, params, normalizedEndpoint, body) as Promise<
        MockApiResponse<T>
      >;
    }
  }

  // 404 for unmatched routes
  console.warn(`[MockAPI] Unhandled route: ${method} ${normalizedEndpoint}`);
  return {
    success: false,
    data: null as T,
    error: {
      code: 'NOT_FOUND',
      message: `Route not found: ${normalizedEndpoint}`,
    },
  };
}

export default getMockResponse;
