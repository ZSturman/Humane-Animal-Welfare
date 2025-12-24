import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Check if mock mode is enabled
const isMockMode = (): boolean => {
  return import.meta.env.VITE_MOCK_MODE === 'true';
};

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  login: (user: User, token: string, refreshToken: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  setLoading: (loading: boolean) => void;
  initializeMockAuth: () => void;
}

// Mock user for demo mode
const MOCK_USER: User = {
  id: 'user-001',
  email: 'demo@shelterlink.dev',
  name: 'Demo User',
  role: 'ADMIN',
  organizationId: 'org-001',
  organizationName: 'Happy Paws Shelter',
  organizationSlug: 'happy-paws',
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,
      
      login: (user, token, refreshToken) => {
        set({
          user,
          token,
          refreshToken,
          isAuthenticated: true,
          isLoading: false,
        });
      },
      
      logout: () => {
        // Don't actually logout in mock mode - just reset to mock user
        if (isMockMode()) {
          get().initializeMockAuth();
          return;
        }
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },
      
      updateUser: (updates) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        }));
      },
      
      setLoading: (loading) => {
        set({ isLoading: loading });
      },
      
      initializeMockAuth: () => {
        if (isMockMode()) {
          set({
            user: MOCK_USER,
            token: 'mock-jwt-token',
            refreshToken: 'mock-refresh-token',
            isAuthenticated: true,
            isLoading: false,
          });
        }
      },
    }),
    {
      name: 'shelter-link-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Auto-login in mock mode after rehydration
        if (isMockMode() && state && !state.isAuthenticated) {
          state.initializeMockAuth();
        } else if (state) {
          state.setLoading(false);
        }
      },
    }
  )
);

// Initialize mock auth immediately if in mock mode and not authenticated
if (isMockMode()) {
  const state = useAuthStore.getState();
  if (!state.isAuthenticated) {
    state.initializeMockAuth();
  }
}

// Helper hook for getting auth headers
export function useAuthHeaders() {
  const token = useAuthStore((state) => state.token);
  
  return token
    ? { Authorization: `Bearer ${token}` }
    : {};
}
