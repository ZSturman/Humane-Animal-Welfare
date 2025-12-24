import { useAuthStore } from '@/stores/auth';
import { getMockResponse, isMockMode } from '@/mocks';

const API_BASE = import.meta.env.VITE_API_URL || '/api';
const MOCK_MODE = isMockMode();

interface ApiOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    errors?: Record<string, string[]>;
  };
  meta?: {
    total: number;
    limit: number;
    offset: number;
  };
}

class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public errors?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<ApiResponse<T>> {
  const { params, ...fetchOptions } = options;
  
  // Build URL with query params for mock mode
  let queryString = '';
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });
    queryString = searchParams.toString();
  }
  
  // Use mock API in demo mode
  if (MOCK_MODE) {
    const mockEndpoint = queryString ? `${endpoint}?${queryString}` : endpoint;
    const mockBody = fetchOptions.body ? JSON.parse(fetchOptions.body as string) : undefined;
    
    try {
      const response = await getMockResponse<T>(mockEndpoint, {
        method: fetchOptions.method || 'GET',
        body: mockBody,
      });
      
      if (!response.success) {
        const errorResponse = response as any;
        throw new ApiError(
          errorResponse.error?.code || 'MOCK_ERROR',
          errorResponse.error?.message || 'Mock API error',
          404
        );
      }
      
      return response as ApiResponse<T>;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('MOCK_ERROR', 'Mock API error', 500);
    }
  }
  
  // Build URL with query params
  let url = `${API_BASE}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }
  
  // Get auth token
  const token = useAuthStore.getState().token;
  
  // Default headers
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  
  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });
    
    const data: ApiResponse<T> = await response.json();
    
    if (!response.ok) {
      // Handle token expiration
      if (response.status === 401) {
        const refreshToken = useAuthStore.getState().refreshToken;
        if (refreshToken) {
          const refreshed = await refreshAccessToken(refreshToken);
          if (refreshed) {
            // Retry original request
            return request<T>(endpoint, options);
          }
        }
        useAuthStore.getState().logout();
      }
      
      throw new ApiError(
        data.error?.code || 'UNKNOWN_ERROR',
        data.error?.message || 'An error occurred',
        response.status,
        data.error?.errors
      );
    }
    
    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Network error
    throw new ApiError(
      'NETWORK_ERROR',
      'Unable to connect to server. Please check your connection.',
      0
    );
  }
}

async function refreshAccessToken(refreshToken: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    
    if (!response.ok) {
      return false;
    }
    
    const data = await response.json();
    if (data.success && data.data) {
      const state = useAuthStore.getState();
      state.login(
        state.user!,
        data.data.accessToken,
        data.data.refreshToken || refreshToken
      );
      return true;
    }
    
    return false;
  } catch {
    return false;
  }
}

// API methods
export const api = {
  get: <T>(endpoint: string, params?: Record<string, any>) =>
    request<T>(endpoint, { method: 'GET', params }),
  
  post: <T>(endpoint: string, body?: any) =>
    request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),
  
  patch: <T>(endpoint: string, body?: any) =>
    request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),
  
  put: <T>(endpoint: string, body?: any) =>
    request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),
  
  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' }),
  
  upload: async <T>(endpoint: string, file: File, onProgress?: (progress: number) => void) => {
    const token = useAuthStore.getState().token;
    
    return new Promise<ApiResponse<T>>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', file);
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress((e.loaded / e.total) * 100);
        }
      });
      
      xhr.addEventListener('load', () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(data);
          } else {
            reject(new ApiError(
              data.error?.code || 'UPLOAD_ERROR',
              data.error?.message || 'Upload failed',
              xhr.status
            ));
          }
        } catch {
          reject(new ApiError('PARSE_ERROR', 'Invalid response', xhr.status));
        }
      });
      
      xhr.addEventListener('error', () => {
        reject(new ApiError('NETWORK_ERROR', 'Upload failed', 0));
      });
      
      xhr.open('POST', `${API_BASE}${endpoint}`);
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      xhr.send(formData);
    });
  },
};

export { ApiError };
export type { ApiResponse };
