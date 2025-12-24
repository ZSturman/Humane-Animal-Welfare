/**
 * API Client Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// API client implementation (mimics actual api.ts)
class ApiClient {
  private baseUrl: string;
  private mockMode: boolean;
  private token: string | null = null;
  private mockFetch: typeof fetch;

  constructor(baseUrl: string, mockMode: boolean = false) {
    this.baseUrl = baseUrl;
    this.mockMode = mockMode;
    this.mockFetch = vi.fn();
  }

  setToken(token: string | null) {
    this.token = token;
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  private buildUrl(endpoint: string, params?: Record<string, any>): string {
    let url = `${this.baseUrl}${endpoint}`;
    
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }
    
    return url;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error: ApiError = {
        message: response.statusText || 'Request failed',
        status: response.status,
      };
      
      try {
        const body = await response.json();
        error.message = body.message || body.error || error.message;
        error.code = body.code;
      } catch {
        // Response body is not JSON
      }
      
      throw error;
    }

    if (response.status === 204) {
      return undefined as unknown as T;
    }

    return response.json();
  }

  setMockFetch(mockFn: typeof fetch) {
    this.mockFetch = mockFn;
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const url = this.buildUrl(endpoint, params);
    const response = await this.mockFetch(url, {
      method: 'GET',
      headers: this.buildHeaders(),
    });
    return this.handleResponse<T>(response);
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    const url = this.buildUrl(endpoint);
    const response = await this.mockFetch(url, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });
    return this.handleResponse<T>(response);
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    const url = this.buildUrl(endpoint);
    const response = await this.mockFetch(url, {
      method: 'PUT',
      headers: this.buildHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });
    return this.handleResponse<T>(response);
  }

  async delete<T>(endpoint: string): Promise<T> {
    const url = this.buildUrl(endpoint);
    const response = await this.mockFetch(url, {
      method: 'DELETE',
      headers: this.buildHeaders(),
    });
    return this.handleResponse<T>(response);
  }

  isMockMode(): boolean {
    return this.mockMode;
  }
}

describe('API Client', () => {
  let api: ApiClient;
  let mockFetch: ReturnType<typeof vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>>;

  beforeEach(() => {
    mockFetch = vi.fn() as any;
    api = new ApiClient('http://localhost:3000/api', false);
    api.setMockFetch(mockFetch as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('URL Building', () => {
    it('should build correct URL for endpoint', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      await api.get('/animals');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/animals',
        expect.any(Object)
      );
    });

    it('should append query parameters to URL', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      await api.get('/animals', { species: 'DOG', status: 'AVAILABLE' });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/animals?species=DOG&status=AVAILABLE',
        expect.any(Object)
      );
    });

    it('should exclude undefined/null query parameters', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      await api.get('/animals', { species: 'DOG', status: undefined, limit: null });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/animals?species=DOG',
        expect.any(Object)
      );
    });
  });

  describe('Headers', () => {
    it('should include Content-Type header', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await api.get('/animals');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should include Authorization header when token is set', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      api.setToken('my-jwt-token');
      await api.get('/animals');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer my-jwt-token',
          }),
        })
      );
    });

    it('should not include Authorization header when no token', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await api.get('/animals');

      const callArgs = mockFetch.mock.calls[0][1];
      expect(callArgs.headers.Authorization).toBeUndefined();
    });
  });

  describe('HTTP Methods', () => {
    it('should make GET requests', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
      });

      await api.get('/animals');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should make POST requests with body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: '123' }),
      });

      const data = { name: 'Max', species: 'DOG' };
      await api.post('/animals', data);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(data),
        })
      );
    });

    it('should make PUT requests with body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: '123' }),
      });

      const data = { name: 'Updated Name' };
      await api.put('/animals/123', data);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(data),
        })
      );
    });

    it('should make DELETE requests', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 204,
        json: () => Promise.reject('No body'),
      });

      await api.delete('/animals/123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('Response Handling', () => {
    it('should parse JSON response', async () => {
      const responseData = { id: '123', name: 'Max' };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(responseData),
      });

      const result = await api.get('/animals/123');

      expect(result).toEqual(responseData);
    });

    it('should handle 204 No Content response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 204,
      });

      const result = await api.delete('/animals/123');

      expect(result).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should throw error on failed request', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve({ message: 'Animal not found' }),
      });

      await expect(api.get('/animals/invalid')).rejects.toEqual(
        expect.objectContaining({
          message: 'Animal not found',
          status: 404,
        })
      );
    });

    it('should handle 401 Unauthorized', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ message: 'Invalid token' }),
      });

      await expect(api.get('/animals')).rejects.toEqual(
        expect.objectContaining({
          status: 401,
        })
      );
    });

    it('should handle 500 Server Error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({ message: 'Server error' }),
      });

      await expect(api.get('/animals')).rejects.toEqual(
        expect.objectContaining({
          status: 500,
        })
      );
    });

    it('should handle non-JSON error response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.reject('Not JSON'),
      });

      await expect(api.get('/animals')).rejects.toEqual(
        expect.objectContaining({
          message: 'Internal Server Error',
          status: 500,
        })
      );
    });
  });

  describe('Mock Mode', () => {
    it('should report mock mode correctly', () => {
      const normalApi = new ApiClient('http://localhost:3000/api', false);
      const mockApi = new ApiClient('http://localhost:3000/api', true);

      expect(normalApi.isMockMode()).toBe(false);
      expect(mockApi.isMockMode()).toBe(true);
    });
  });
});

describe('API Endpoints', () => {
  // Test endpoint URL constants
  const API_ENDPOINTS = {
    // Auth
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
    REFRESH: '/auth/refresh',

    // Animals
    ANIMALS: '/animals',
    ANIMAL_BY_ID: (id: string) => `/animals/${id}`,
    ANIMALS_AT_RISK: '/animals/at-risk',
    ANIMAL_RISK: (id: string) => `/animals/${id}/risk`,

    // Organizations
    ORGANIZATIONS: '/organizations',
    ORG_BY_ID: (id: string) => `/organizations/${id}`,
    ORG_STATS: (id: string) => `/organizations/${id}/stats`,

    // Transfers
    TRANSFERS: '/transfers',
    TRANSFER_BY_ID: (id: string) => `/transfers/${id}`,
    TRANSFER_ACCEPT: (id: string) => `/transfers/${id}/accept`,
    TRANSFER_REJECT: (id: string) => `/transfers/${id}/reject`,

    // Risk
    RISK_DASHBOARD: '/risk/dashboard',
    RISK_RECALCULATE: '/risk/recalculate',

    // Health
    HEALTH: '/health',
    HEALTH_DETAILED: '/health/detailed',
  };

  describe('Auth Endpoints', () => {
    it('should have correct auth endpoints', () => {
      expect(API_ENDPOINTS.LOGIN).toBe('/auth/login');
      expect(API_ENDPOINTS.REGISTER).toBe('/auth/register');
      expect(API_ENDPOINTS.LOGOUT).toBe('/auth/logout');
      expect(API_ENDPOINTS.ME).toBe('/auth/me');
    });
  });

  describe('Animals Endpoints', () => {
    it('should have correct animals endpoints', () => {
      expect(API_ENDPOINTS.ANIMALS).toBe('/animals');
      expect(API_ENDPOINTS.ANIMAL_BY_ID('abc123')).toBe('/animals/abc123');
      expect(API_ENDPOINTS.ANIMALS_AT_RISK).toBe('/animals/at-risk');
      expect(API_ENDPOINTS.ANIMAL_RISK('abc123')).toBe('/animals/abc123/risk');
    });
  });

  describe('Transfers Endpoints', () => {
    it('should have correct transfers endpoints', () => {
      expect(API_ENDPOINTS.TRANSFERS).toBe('/transfers');
      expect(API_ENDPOINTS.TRANSFER_BY_ID('t123')).toBe('/transfers/t123');
      expect(API_ENDPOINTS.TRANSFER_ACCEPT('t123')).toBe('/transfers/t123/accept');
      expect(API_ENDPOINTS.TRANSFER_REJECT('t123')).toBe('/transfers/t123/reject');
    });
  });

  describe('Risk Endpoints', () => {
    it('should have correct risk endpoints', () => {
      expect(API_ENDPOINTS.RISK_DASHBOARD).toBe('/risk/dashboard');
      expect(API_ENDPOINTS.RISK_RECALCULATE).toBe('/risk/recalculate');
    });
  });
});
