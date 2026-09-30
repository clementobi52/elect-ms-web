// lib/api/client.ts

import { setTenantSlug, withTenantHeaders } from '../tenant';
import { API_BASE_URL } from '@/lib/config';


export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  [key: string]: any;
}

class ApiClient {
  private isRedirecting = false;
  private currentPath: string = '';
  private refreshPromise: Promise<boolean> | null = null;
  private tokenExpiryTimeout: NodeJS.Timeout | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.currentPath = window.location.pathname + window.location.search;
      // Auto-refresh token on initialization if needed
      this.scheduleTokenRefresh();
    }
  }

  private getHeaders(): HeadersInit {
    const token = this.getAuthToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Every request names the tenant. The server cross-checks this against the
    // tenantId in the token, so a stale slug produces a clear 400 rather than a
    // request served against the wrong tenant's rows.
    return withTenantHeaders(headers);
  }

  private handleError(error: any): never {
    console.error('API Error:', error);
    throw error;
  }

  private redirectToLogin(message?: string): void {
    if (this.isRedirecting || typeof window === 'undefined') {
      return;
    }

    this.isRedirecting = true;
    this.clearAuthToken();
    
    const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
    let loginUrl = `/login?returnUrl=${returnUrl}`;
    if (message) {
      loginUrl += `&message=${encodeURIComponent(message)}`;
    }
    
    window.location.href = loginUrl;
  }

  private async handleUnauthorized(response: Response): Promise<never> {
    this.clearAuthToken();
    
    let errorMessage = 'Session expired. Please login again.';
    try {
      const errorData = await response.json().catch(() => ({}));
      errorMessage = errorData.message || errorMessage;
    } catch (e) {
      // Ignore parsing errors
    }
    
    this.redirectToLogin(errorMessage);
    throw new Error(errorMessage);
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (response.status === 401) {
      return this.handleUnauthorized(response);
    }

    await this.handleTenantRejection(response);

    if (response.status === 403) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Access denied. You do not have permission to perform this action.');
    }
    
    if (response.status === 404) {
      throw new Error('Resource not found.');
    }
    
    if (response.status >= 500) {
      throw new Error('Server error. Please try again later.');
    }
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `API request failed: ${response.status}`);
    }
    
    try {
      return await response.json();
    } catch (error) {
      if (response.status === 204) {
        return {} as T;
      }
      throw new Error('Invalid response format');
    }
  }

  private isOnLoginPage(): boolean {
    if (typeof window === 'undefined') return false;
    return window.location.pathname.includes('/login');
  }

  /**
   * Record the tenant the server authenticated us into, taken from the
   * login/signup response. Called alongside setAuthToken so the slug used by
   * later requests and the socket handshake always comes from a response the
   * server actually issued.
   */
  rememberTenant(tenant?: { slug?: string } | null): void {
    if (tenant?.slug) {
      setTenantSlug(tenant.slug);
    }
  }

  // ✅ SAFE: Set auth token with additional security checks
  setAuthToken(token: string | null): void {
    if (!token) {
      this.clearAuthToken();
      return;
    }

    // Validate token format (JWT has 3 parts separated by dots)
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.warn('Invalid token format received');
        this.clearAuthToken();
        return;
      }

      // Check if token is expired
      const payload = JSON.parse(atob(parts[1]));
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        console.warn('Token is already expired');
        this.clearAuthToken();
        return;
      }

      // Store token
      localStorage.setItem('authToken', token);
      sessionStorage.setItem('authToken', token);
      
      // Reset redirect flag
      this.isRedirecting = false;
      
      // Schedule token refresh based on expiry
      this.scheduleTokenRefresh();

      console.log('✅ Auth token set successfully');
    } catch (error) {
      console.error('Error setting auth token:', error);
      this.clearAuthToken();
    }
  }

  // ✅ SAFE: Get auth token with validation
  getAuthToken(): string | null {
    try {
      // Try localStorage first
      let token = localStorage.getItem('authToken');
      
      // If not in localStorage, try sessionStorage
      if (!token) {
        token = sessionStorage.getItem('authToken');
      }
      
      // Validate token format
      if (token) {
        const parts = token.split('.');
        if (parts.length !== 3) {
          console.warn('Invalid token format found, clearing...');
          this.clearAuthToken();
          return null;
        }

        // Check if token is expired
        try {
          const payload = JSON.parse(atob(parts[1]));
          if (payload.exp && payload.exp * 1000 < Date.now()) {
            console.warn('Token expired, clearing...');
            this.clearAuthToken();
            return null;
          }
        } catch (e) {
          console.warn('Failed to parse token payload, clearing...');
          this.clearAuthToken();
          return null;
        }
      }
      
      return token;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  // ✅ SAFE: Clear auth token with cleanup
  clearAuthToken(): void {
    try {
      // Remove from all storage locations
      localStorage.removeItem('authToken');
      sessionStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      sessionStorage.removeItem('refreshToken');
      // The slug belongs to the session that just ended. Leaving it behind
      // would send a new user's requests under the old tenant's name.
      setTenantSlug(null);
      
      // Clear window property if exists
      if (typeof window !== 'undefined') {
        delete (window as any).__authToken;
      }
      
      // Clear any scheduled refresh
      if (this.tokenExpiryTimeout) {
        clearTimeout(this.tokenExpiryTimeout);
        this.tokenExpiryTimeout = null;
      }
      
      // Reset refresh promise
      this.refreshPromise = null;
      
      // Reset redirect flag
      this.isRedirecting = false;
      
      console.log('✅ Auth token cleared successfully');
    } catch (error) {
      console.error('Error clearing auth token:', error);
    }
  }

  // ✅ SAFE: Validate token with API call
  async validateToken(): Promise<boolean> {
    const token = this.getAuthToken();
    if (!token) {
      return false;
    }

    // Quick client-side validation first
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return false;
      }

      const payload = JSON.parse(atob(parts[1]));
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        this.clearAuthToken();
        return false;
      }
    } catch (error) {
      console.error('Token validation failed:', error);
      return false;
    }

    // Server-side validation (optional but more secure)
    try {
      // Don't validate on login page
      if (this.isOnLoginPage()) {
        return true;
      }

      const response = await fetch(`${API_BASE_URL}/auth/validate`, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      
      if (response.status === 401) {
        this.handleUnauthorized(response);
        return false;
      }
      
      return response.ok;
    } catch (error) {
      console.error('Server validation failed:', error);
      // If server validation fails but token looks valid locally, return true
      // This prevents unnecessary logouts during network issues
      return true;
    }
  }

  // ✅ SAFE: Refresh token with proper error handling
  async refreshToken(): Promise<boolean> {
    // Prevent multiple concurrent refresh attempts
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performRefresh();
    const result = await this.refreshPromise;
    this.refreshPromise = null;
    return result;
  }

  /**
   * A token signed before tenancy existed has no tenantId, and the server
   * rejects it with a message telling the user to sign in again. Handle that
   * the same as an expired session instead of looping on failing requests.
   */
  private async handleTenantRejection(response: Response): Promise<boolean> {
    if (response.status !== 400) return false;

    let message = '';
    try {
      const data = await response.clone().json().catch(() => ({}));
      message = data.message || '';
    } catch {
      return false;
    }

    if (!/tenant/i.test(message)) return false;

    this.clearAuthToken();
    this.redirectToLogin(
      'Your account is not linked to this organization. Please sign in again.'
    );
    throw new Error(message);
  }

  private async performRefresh(): Promise<boolean> {
    const refreshToken = localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
    
    if (!refreshToken) {
      console.warn('No refresh token available');
      this.clearAuthToken();
      return false;
    }

    // Validate refresh token format
    try {
      const parts = refreshToken.split('.');
      if (parts.length !== 3) {
        console.warn('Invalid refresh token format');
        this.clearAuthToken();
        return false;
      }
    } catch (error) {
      console.error('Error validating refresh token:', error);
      this.clearAuthToken();
      return false;
    }

    try {
      console.log('🔄 Attempting to refresh token...');
      
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        // Sent on refresh too: the endpoint resolves the tenant the same way
        // every other route does, so a refresh without it is a 400.
        headers: this.getHeaders(),
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.warn('Refresh token expired, redirecting to login');
          this.clearAuthToken();
          this.redirectToLogin('Session expired. Please login again.');
        }
        return false;
      }

      const data = await response.json();
      
      if (data.token) {
        // Store new token
        this.setAuthToken(data.token);

        // The refreshed token is bound to a tenant; keep the stored slug in
        // step with whatever the server said this session is.
        this.rememberTenant(data.tenant);

        // Store new refresh token if provided
        if (data.refreshToken) {
          localStorage.setItem('refreshToken', data.refreshToken);
          sessionStorage.setItem('refreshToken', data.refreshToken);
        }
        
        console.log('✅ Token refreshed successfully');
        return true;
      }

      console.warn('No token in refresh response');
      return false;
    } catch (error) {
      console.error('❌ Token refresh failed:', error);
      
      // If it's a network error, don't clear token - try again later
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        return false;
      }
      
      this.clearAuthToken();
      return false;
    }
  }

  // ✅ SAFE: Schedule automatic token refresh
  private scheduleTokenRefresh(): void {
    // Clear any existing timeout
    if (this.tokenExpiryTimeout) {
      clearTimeout(this.tokenExpiryTimeout);
      this.tokenExpiryTimeout = null;
    }

    const token = this.getAuthToken();
    if (!token) {
      return;
    }

    try {
      const parts = token.split('.');
      const payload = JSON.parse(atob(parts[1]));
      
      if (payload.exp) {
        const expiryTime = payload.exp * 1000;
        const currentTime = Date.now();
        const timeUntilExpiry = expiryTime - currentTime;
        
        // Schedule refresh 5 minutes before expiry or at 30% of remaining time
        const refreshBuffer = Math.min(5 * 60 * 1000, timeUntilExpiry * 0.3);
        const refreshTime = Math.max(timeUntilExpiry - refreshBuffer, 60 * 1000); // At least 1 minute
        
        if (refreshTime > 0) {
          console.log(`⏰ Scheduling token refresh in ${Math.round(refreshTime / 1000)} seconds`);
          this.tokenExpiryTimeout = setTimeout(() => {
            console.log('🔄 Auto-refreshing token...');
            this.refreshToken();
          }, refreshTime);
        }
      }
    } catch (error) {
      console.error('Error scheduling token refresh:', error);
    }
  }

  // ✅ SAFE: Check if user is authenticated
  isAuthenticated(): boolean {
    const token = this.getAuthToken();
    return !!token;
  }

  // ✅ SAFE: Get token expiry time
  getTokenExpiry(): Date | null {
    const token = this.getAuthToken();
    if (!token) return null;

    try {
      const parts = token.split('.');
      const payload = JSON.parse(atob(parts[1]));
      if (payload.exp) {
        return new Date(payload.exp * 1000);
      }
    } catch (error) {
      console.error('Error getting token expiry:', error);
    }
    return null;
  }

  // ✅ SAFE: Get token time remaining in milliseconds
  getTokenTimeRemaining(): number {
    const token = this.getAuthToken();
    if (!token) return 0;

    try {
      const parts = token.split('.');
      const payload = JSON.parse(atob(parts[1]));
      if (payload.exp) {
        return (payload.exp * 1000) - Date.now();
      }
    } catch (error) {
      console.error('Error getting token time remaining:', error);
    }
    return 0;
  }

  // ✅ SAFE: Get token payload (decoded)
  getTokenPayload(): any | null {
    const token = this.getAuthToken();
    if (!token) return null;

    try {
      const parts = token.split('.');
      return JSON.parse(atob(parts[1]));
    } catch (error) {
      console.error('Error getting token payload:', error);
      return null;
    }
  }

  // HTTP Methods
  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    try {
      if (this.isOnLoginPage()) {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          method: 'GET',
          headers: this.getHeaders(),
          ...options,
        });
        
        if (response.status === 401) {
          throw new Error('Session expired. Please login again.');
        }
        
        return this.handleResponse<T>(response);
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: this.getHeaders(),
        ...options,
      });
      
      return this.handleResponse<T>(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async post<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    try {
      if (this.isOnLoginPage()) {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: data ? JSON.stringify(data) : undefined,
          ...options,
        });
        
        if (response.status === 401) {
          throw new Error('Session expired. Please login again.');
        }
        
        return this.handleResponse<T>(response);
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: data ? JSON.stringify(data) : undefined,
        ...options,
      });
      
      return this.handleResponse<T>(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async put<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    try {
      if (this.isOnLoginPage()) {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          method: 'PUT',
          headers: this.getHeaders(),
          body: data ? JSON.stringify(data) : undefined,
          ...options,
        });
        
        if (response.status === 401) {
          throw new Error('Session expired. Please login again.');
        }
        
        return this.handleResponse<T>(response);
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: data ? JSON.stringify(data) : undefined,
        ...options,
      });
      
      return this.handleResponse<T>(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async patch<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    try {
      if (this.isOnLoginPage()) {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          method: 'PATCH',
          headers: this.getHeaders(),
          body: data ? JSON.stringify(data) : undefined,
          ...options,
        });
        
        if (response.status === 401) {
          throw new Error('Session expired. Please login again.');
        }
        
        return this.handleResponse<T>(response);
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: data ? JSON.stringify(data) : undefined,
        ...options,
      });
      
      return this.handleResponse<T>(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    try {
      if (this.isOnLoginPage()) {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          method: 'DELETE',
          headers: this.getHeaders(),
          ...options,
        });
        
        if (response.status === 401) {
          throw new Error('Session expired. Please login again.');
        }
        
        return this.handleResponse<T>(response);
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
        ...options,
      });
      
      return this.handleResponse<T>(response);
    } catch (error) {
      return this.handleError(error);
    }
  }
}

// Export a singleton instance
export const apiClient = new ApiClient();

// Export hook for React components
export const useApiClient = () => {
  return {
    get: apiClient.get.bind(apiClient),
    post: apiClient.post.bind(apiClient),
    put: apiClient.put.bind(apiClient),
    patch: apiClient.patch.bind(apiClient),
    delete: apiClient.delete.bind(apiClient),
    setAuthToken: apiClient.setAuthToken.bind(apiClient),
    getAuthToken: apiClient.getAuthToken.bind(apiClient),
    isAuthenticated: apiClient.isAuthenticated.bind(apiClient),
    clearAuthToken: apiClient.clearAuthToken.bind(apiClient),
    validateToken: apiClient.validateToken.bind(apiClient),
    refreshToken: apiClient.refreshToken.bind(apiClient),
    getTokenExpiry: apiClient.getTokenExpiry.bind(apiClient),
    getTokenTimeRemaining: apiClient.getTokenTimeRemaining.bind(apiClient),
    getTokenPayload: apiClient.getTokenPayload.bind(apiClient),
  };
};