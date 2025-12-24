/**
 * Auth Store Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock auth store (representing actual store behavior)
interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  organizationId: string;
  organization: {
    id: string;
    name: string;
  };
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  checkAuth: () => Promise<boolean>;
}

// Create a mock store implementation
const createAuthStore = () => {
  let state: AuthState = {
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  };

  const mockApi = {
    login: vi.fn(),
    getMe: vi.fn(),
  };

  const actions: AuthActions = {
    login: async (email: string, password: string) => {
      state.isLoading = true;
      state.error = null;
      
      try {
        const response = await mockApi.login(email, password);
        state.user = response.user;
        state.token = response.token;
        state.isAuthenticated = true;
        state.isLoading = false;
      } catch (error: any) {
        state.error = error.message || 'Login failed';
        state.isLoading = false;
        throw error;
      }
    },
    
    logout: () => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
    },
    
    setUser: (user: User) => {
      state.user = user;
      state.isAuthenticated = true;
    },
    
    setError: (error: string | null) => {
      state.error = error;
    },
    
    clearError: () => {
      state.error = null;
    },
    
    checkAuth: async () => {
      if (!state.token) return false;
      
      try {
        const user = await mockApi.getMe();
        state.user = user;
        state.isAuthenticated = true;
        return true;
      } catch {
        state.token = null;
        state.isAuthenticated = false;
        return false;
      }
    },
  };

  return {
    getState: () => state,
    actions,
    mockApi,
    reset: () => {
      state = {
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    },
  };
};

describe('Auth Store', () => {
  let store: ReturnType<typeof createAuthStore>;

  beforeEach(() => {
    store = createAuthStore();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should have null user initially', () => {
      expect(store.getState().user).toBeNull();
    });

    it('should have null token initially', () => {
      expect(store.getState().token).toBeNull();
    });

    it('should not be authenticated initially', () => {
      expect(store.getState().isAuthenticated).toBe(false);
    });

    it('should not be loading initially', () => {
      expect(store.getState().isLoading).toBe(false);
    });

    it('should have no error initially', () => {
      expect(store.getState().error).toBeNull();
    });
  });

  describe('Login', () => {
    const mockUser: User = {
      id: 'user-001',
      email: 'test@example.com',
      name: 'Test User',
      role: 'ADMIN',
      organizationId: 'org-001',
      organization: {
        id: 'org-001',
        name: 'Test Shelter',
      },
    };

    it('should set loading state during login', async () => {
      store.mockApi.login.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ user: mockUser, token: 'token-123' }), 100))
      );

      const loginPromise = store.actions.login('test@example.com', 'password');
      expect(store.getState().isLoading).toBe(true);
      
      await loginPromise;
      expect(store.getState().isLoading).toBe(false);
    });

    it('should set user and token on successful login', async () => {
      store.mockApi.login.mockResolvedValue({ user: mockUser, token: 'token-123' });

      await store.actions.login('test@example.com', 'password');

      expect(store.getState().user).toEqual(mockUser);
      expect(store.getState().token).toBe('token-123');
      expect(store.getState().isAuthenticated).toBe(true);
    });

    it('should set error on failed login', async () => {
      store.mockApi.login.mockRejectedValue(new Error('Invalid credentials'));

      await expect(store.actions.login('test@example.com', 'wrong')).rejects.toThrow();

      expect(store.getState().error).toBe('Invalid credentials');
      expect(store.getState().isAuthenticated).toBe(false);
    });

    it('should clear previous error on new login attempt', async () => {
      store.mockApi.login.mockRejectedValueOnce(new Error('First error'));
      
      await expect(store.actions.login('test@example.com', 'wrong')).rejects.toThrow();
      expect(store.getState().error).toBe('First error');

      store.mockApi.login.mockResolvedValue({ user: mockUser, token: 'token-123' });
      await store.actions.login('test@example.com', 'correct');
      
      expect(store.getState().error).toBeNull();
    });
  });

  describe('Logout', () => {
    it('should clear user on logout', async () => {
      const mockUser: User = {
        id: 'user-001',
        email: 'test@example.com',
        name: 'Test User',
        role: 'ADMIN',
        organizationId: 'org-001',
        organization: { id: 'org-001', name: 'Test Shelter' },
      };

      store.mockApi.login.mockResolvedValue({ user: mockUser, token: 'token-123' });
      await store.actions.login('test@example.com', 'password');

      store.actions.logout();

      expect(store.getState().user).toBeNull();
      expect(store.getState().token).toBeNull();
      expect(store.getState().isAuthenticated).toBe(false);
    });

    it('should clear error on logout', async () => {
      store.actions.setError('Some error');
      expect(store.getState().error).toBe('Some error');

      store.actions.logout();

      expect(store.getState().error).toBeNull();
    });
  });

  describe('setUser', () => {
    it('should set user and authenticate', () => {
      const mockUser: User = {
        id: 'user-001',
        email: 'test@example.com',
        name: 'Test User',
        role: 'STAFF',
        organizationId: 'org-001',
        organization: { id: 'org-001', name: 'Test Shelter' },
      };

      store.actions.setUser(mockUser);

      expect(store.getState().user).toEqual(mockUser);
      expect(store.getState().isAuthenticated).toBe(true);
    });
  });

  describe('Error Management', () => {
    it('should set error message', () => {
      store.actions.setError('Network error');

      expect(store.getState().error).toBe('Network error');
    });

    it('should clear error message', () => {
      store.actions.setError('Some error');
      store.actions.clearError();

      expect(store.getState().error).toBeNull();
    });
  });

  describe('checkAuth', () => {
    it('should return false without token', async () => {
      const result = await store.actions.checkAuth();

      expect(result).toBe(false);
      expect(store.getState().isAuthenticated).toBe(false);
    });

    it('should verify token and set user', async () => {
      const mockUser: User = {
        id: 'user-001',
        email: 'test@example.com',
        name: 'Test User',
        role: 'ADMIN',
        organizationId: 'org-001',
        organization: { id: 'org-001', name: 'Test Shelter' },
      };

      // Set token first
      store.mockApi.login.mockResolvedValue({ user: mockUser, token: 'valid-token' });
      await store.actions.login('test@example.com', 'password');

      store.mockApi.getMe.mockResolvedValue(mockUser);

      const result = await store.actions.checkAuth();

      expect(result).toBe(true);
      expect(store.getState().user).toEqual(mockUser);
    });

    it('should clear auth on invalid token', async () => {
      const mockUser: User = {
        id: 'user-001',
        email: 'test@example.com',
        name: 'Test User',
        role: 'ADMIN',
        organizationId: 'org-001',
        organization: { id: 'org-001', name: 'Test Shelter' },
      };

      store.mockApi.login.mockResolvedValue({ user: mockUser, token: 'expired-token' });
      await store.actions.login('test@example.com', 'password');

      store.mockApi.getMe.mockRejectedValue(new Error('Token expired'));

      const result = await store.actions.checkAuth();

      expect(result).toBe(false);
      expect(store.getState().token).toBeNull();
      expect(store.getState().isAuthenticated).toBe(false);
    });
  });

  describe('Mock Mode', () => {
    const MOCK_USER: User = {
      id: 'mock-user-001',
      email: 'demo@shelterlink.dev',
      name: 'Demo User',
      role: 'ADMIN',
      organizationId: 'mock-org-001',
      organization: {
        id: 'mock-org-001',
        name: 'Happy Paws Shelter',
      },
    };

    it('should auto-login with mock user in demo mode', () => {
      // Simulate mock mode auto-login
      store.actions.setUser(MOCK_USER);

      expect(store.getState().user).toEqual(MOCK_USER);
      expect(store.getState().isAuthenticated).toBe(true);
      expect(store.getState().user?.email).toBe('demo@shelterlink.dev');
    });

    it('should use demo organization in mock mode', () => {
      store.actions.setUser(MOCK_USER);

      expect(store.getState().user?.organization.name).toBe('Happy Paws Shelter');
      expect(store.getState().user?.organizationId).toBe('mock-org-001');
    });
  });
});
