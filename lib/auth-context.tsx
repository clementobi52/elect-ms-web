// lib/auth-context.tsx - Complete updated file

"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Role, ROLES } from './types';

interface User {
  role: Role;
  [key: string]: any;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  hasRole: (roles: Role | Role[]) => boolean;
  refreshToken: () => Promise<boolean>;
  checkTokenExpiry: () => boolean;
  getTokenStatus: () => { valid: boolean; expired: boolean; timeRemaining: number };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5001/api';
const TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000;

// Helper to decode token payload
const decodeToken = (token: string): any | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(atob(parts[1]));
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

// Check if token is expired
const isTokenExpired = (token: string): boolean => {
  try {
    const payload = decodeToken(token);
    if (!payload || !payload.exp) return true;
    
    const expiryTime = payload.exp * 1000;
    const currentTime = Date.now();
    const isExpired = currentTime >= expiryTime;
    
    if (isExpired) {
      console.log(`🔑 Token expired at ${new Date(expiryTime).toLocaleString()}`);
    }
    
    return isExpired;
  } catch (error) {
    console.error('Error checking token expiry:', error);
    return true;
  }
};

// Get token status with details
const getTokenStatus = (token: string): { valid: boolean; expired: boolean; timeRemaining: number; payload: any | null } => {
  try {
    const payload = decodeToken(token);
    if (!payload) return { valid: false, expired: true, timeRemaining: 0, payload: null };
    
    if (!payload.exp) return { valid: false, expired: true, timeRemaining: 0, payload };
    
    const expiryTime = payload.exp * 1000;
    const currentTime = Date.now();
    const timeRemaining = Math.max(0, expiryTime - currentTime);
    const expired = currentTime >= expiryTime;
    
    return {
      valid: !expired,
      expired,
      timeRemaining,
      payload
    };
  } catch (error) {
    console.error('Error getting token status:', error);
    return { valid: false, expired: true, timeRemaining: 0, payload: null };
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
    isAuthenticated: false,
  });
  
  const tokenCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const isRedirecting = useRef(false);

  // Debug logging
  useEffect(() => {
    console.log('🔐 Auth State:', {
      isLoading: authState.isLoading,
      isAuthenticated: authState.isAuthenticated,
      hasUser: !!authState.user,
      hasToken: !!authState.token,
      pathname
    });
  }, [authState, pathname]);

  // Check for existing auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      console.log('🔍 Checking existing auth...');
      
      try {
        const storedToken = localStorage.getItem('authToken');
        const storedUser = localStorage.getItem('user');

        console.log('📦 Stored token:', storedToken ? `${storedToken.slice(0, 20)}...` : 'No token');
        console.log('📦 Stored user:', storedUser ? 'Yes' : 'No');

        if (storedToken && storedUser) {
          const status = getTokenStatus(storedToken);
          console.log('🔑 Token status:', {
            valid: status.valid,
            expired: status.expired,
            timeRemaining: status.timeRemaining ? `${Math.round(status.timeRemaining / 60000)} minutes` : '0',
            payload: status.payload
          });

          if (status.expired) {
            console.log('🔑 Token expired, clearing...');
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            
            if (!pathname?.includes('/login')) {
              console.log('🔀 Redirecting to login from auth check...');
              const returnUrl = encodeURIComponent(pathname || '');
              router.push(`/login?returnUrl=${returnUrl}&message=Session expired`);
            }
            
            setAuthState({
              user: null,
              token: null,
              isLoading: false,
              isAuthenticated: false,
            });
            return;
          }

          const user = JSON.parse(storedUser);
          console.log('✅ Token valid, setting auth state for:', user.role);
          
          setAuthState({
            user,
            token: storedToken,
            isLoading: false,
            isAuthenticated: true,
          });

          startTokenCheck(storedToken);
          
          return;
        }

        console.log('ℹ️ No stored auth found');
        setAuthState(prev => ({ ...prev, isLoading: false }));
        
      } catch (error) {
        console.error('❌ Auth check failed:', error);
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    };

    checkAuth();

    return () => {
      if (tokenCheckInterval.current) {
        clearInterval(tokenCheckInterval.current);
      }
    };
  }, [pathname, router]);

  const startTokenCheck = useCallback((token: string) => {
    if (tokenCheckInterval.current) {
      clearInterval(tokenCheckInterval.current);
    }

    tokenCheckInterval.current = setInterval(() => {
      const currentToken = localStorage.getItem('authToken');
      if (!currentToken) {
        if (tokenCheckInterval.current) {
          clearInterval(tokenCheckInterval.current);
        }
        return;
      }

      const status = getTokenStatus(currentToken);
      
      if (status.expired) {
        console.log('🔑 Token expired during check!');
        
        const refreshTokenStr = localStorage.getItem('refreshToken');
        if (refreshTokenStr) {
          console.log('🔄 Attempting to refresh expired token...');
          refreshToken().then(success => {
            if (!success) {
              console.log('❌ Token refresh failed, logging out...');
              handleSignOut(true);
            }
          });
        } else {
          console.log('🔑 No refresh token, logging out...');
          handleSignOut(true);
        }
      }
    }, 30000);
  }, []);

  const handleSignOut = useCallback((redirectToLogin: boolean = true) => {
    console.log('🚪 Signing out...', { redirectToLogin, pathname });
    
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    localStorage.removeItem('refreshToken');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('refreshToken');
    
    if (tokenCheckInterval.current) {
      clearInterval(tokenCheckInterval.current);
      tokenCheckInterval.current = null;
    }
    
    setAuthState({
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,
    });

    if (redirectToLogin && !pathname?.includes('/login') && !pathname?.includes('/unauthorized')) {
      isRedirecting.current = true;
      const returnUrl = encodeURIComponent(pathname || '');
      console.log(`🔀 Redirecting to login with returnUrl: ${returnUrl}`);
      router.push(`/login?returnUrl=${returnUrl}&message=Please login again`);
      setTimeout(() => {
        isRedirecting.current = false;
      }, 500);
    }
  }, [pathname, router]);

  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const refreshTokenStr = localStorage.getItem('refreshToken');
      if (!refreshTokenStr) {
        console.warn('⚠️ No refresh token available');
        return false;
      }

      console.log('🔄 Attempting token refresh...');
      
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: refreshTokenStr }),
      });

      if (!response.ok) {
        console.warn('⚠️ Refresh token request failed:', response.status);
        return false;
      }

      const data = await response.json();
      
      if (data.token) {
        console.log('✅ Token refreshed successfully');
        
        localStorage.setItem('authToken', data.token);
        if (data.refreshToken) {
          localStorage.setItem('refreshToken', data.refreshToken);
        }

        setAuthState(prev => ({
          ...prev,
          token: data.token,
        }));

        startTokenCheck(data.token);
        
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Error refreshing token:', error);
      return false;
    }
  }, [startTokenCheck]);

  const checkTokenExpiry = useCallback((): boolean => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      console.log('ℹ️ No token to check');
      return false;
    }
    
    const status = getTokenStatus(token);
    console.log('🔍 Token status check:', {
      valid: status.valid,
      expired: status.expired,
      timeRemaining: status.timeRemaining ? `${Math.round(status.timeRemaining / 60000)} minutes` : '0'
    });
    
    if (status.expired) {
      console.log('🔑 Token expired, signing out...');
      handleSignOut(true);
      return false;
    }
    return true;
  }, [handleSignOut]);

  const getTokenStatusDetailed = useCallback(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      return { valid: false, expired: true, timeRemaining: 0 };
    }
    const status = getTokenStatus(token);
    return {
      valid: status.valid,
      expired: status.expired,
      timeRemaining: status.timeRemaining
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    console.log('🔐 Signing in...');
    
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Login failed');
      }

      const data = await response.json();
      const { token, user, refreshToken: newRefreshToken } = data;

      console.log(`✅ Sign in successful for ${user.email} (${user.role})`);

      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(user));
      if (newRefreshToken) {
        localStorage.setItem('refreshToken', newRefreshToken);
      }

      setAuthState({
        user,
        token,
        isLoading: false,
        isAuthenticated: true,
      });

      startTokenCheck(token);

      const redirectPath = getRedirectPath(user.role);
      console.log(`🔀 Redirecting to ${redirectPath}`);
      router.push(redirectPath);
    } catch (error) {
      console.error('❌ Sign in error:', error);
      throw error;
    }
  }, [router, startTokenCheck]);

  const signOut = useCallback(() => {
    handleSignOut(true);
  }, [handleSignOut]);

  const hasRole = useCallback((roles: Role | Role[]): boolean => {
    if (!authState.user) return false;
    
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(authState.user.role);
  }, [authState.user]);

  // ✅ FIXED: Intercept fetch requests with better handling
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const originalFetch = window.fetch;

    window.fetch = async function(...args) {
      const [url, options = {}] = args;
      
      // Skip auth endpoints, public endpoints, and health checks
      if (typeof url === 'string' && (url.includes('/auth/') || url.includes('/public/') || url.includes('/health'))) {
        return originalFetch(...args);
      }

      // Skip if not an API call
      if (typeof url !== 'string' || !url.includes('/api/')) {
        return originalFetch(...args);
      }

      // Skip if on login page
      if (typeof window !== 'undefined' && window.location?.pathname?.includes('/login')) {
        return originalFetch(...args);
      }

      try {
        const token = localStorage.getItem('authToken');
        
        // If no token, proceed without auth header
        if (!token) {
          return originalFetch(...args);
        }

        // Check if token is expired
        const status = getTokenStatus(token);
        if (status.expired) {
          console.log('🔑 Token expired before API call, attempting refresh...');
          
          try {
            const refreshed = await refreshToken();
            if (refreshed) {
              const newToken = localStorage.getItem('authToken');
              if (newToken) {
                const headers = new Headers(options.headers || {});
                headers.set('Authorization', `Bearer ${newToken}`);
                const newOptions = { ...options, headers };
                return originalFetch(url, newOptions);
              }
            }
          } catch (refreshError) {
            console.error('Refresh failed:', refreshError);
          }
          
          // If refresh failed, redirect to login
          handleSignOut(true);
          throw new Error('Session expired. Please login again.');
        }

        // Add auth header and make request
        const headers = new Headers(options.headers || {});
        if (!headers.has('Authorization')) {
          headers.set('Authorization', `Bearer ${token}`);
        }
        
        const newOptions = { ...options, headers };
        const response = await originalFetch(url, newOptions);
        
        // Handle 401 Unauthorized - try refresh
        if (response.status === 401) {
          console.log('🔄 Received 401, attempting token refresh...');
          
          try {
            const refreshed = await refreshToken();
            if (refreshed) {
              const newToken = localStorage.getItem('authToken');
              if (newToken) {
                const retryHeaders = new Headers(options.headers || {});
                retryHeaders.set('Authorization', `Bearer ${newToken}`);
                const retryOptions = { ...options, headers: retryHeaders };
                // Retry the request with new token
                const retryResponse = await originalFetch(url, retryOptions);
                return retryResponse;
              }
            }
          } catch (refreshError) {
            console.error('Refresh failed:', refreshError);
          }
          
          // If refresh failed, redirect to login
          handleSignOut(true);
          throw new Error('Session expired. Please login again.');
        }
        
        return response;
      } catch (error) {
        // Don't throw for network errors - let the caller handle it
        if (error instanceof TypeError && error.message === 'Failed to fetch') {
          console.warn('⚠️ Network error, returning original fetch');
          return originalFetch(...args);
        }
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [refreshToken, handleSignOut]);

  // Listen for storage events (for multi-tab support)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'authToken') {
        console.log('📡 Storage event: authToken changed');
        if (!e.newValue) {
          handleSignOut(false);
        } else {
          const status = getTokenStatus(e.newValue);
          if (status.expired) {
            handleSignOut(true);
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [handleSignOut]);

  return (
    <AuthContext.Provider value={{ 
      ...authState, 
      signIn, 
      signOut, 
      hasRole, 
      refreshToken,
      checkTokenExpiry,
      getTokenStatus: getTokenStatusDetailed
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Helper to get redirect path based on role
function getRedirectPath(role: Role): string {
  switch (role) {
    case ROLES.WARD_ADMIN:
      return '/admin/ward';
    case ROLES.ZONE_ADMIN:
      return '/admin/zone';
    case ROLES.SITUATION_ROOM:
      return '/admin/situation-room';
    case ROLES.SYSTEM_ADMIN:
      return '/admin/system';
    default:
      return '/';
  }
}

// Higher-order component for role-based protection
export function withRoleProtection(
  WrappedComponent: React.ComponentType<any>,
  allowedRoles: Role[]
) {
  return function ProtectedComponent(props: any) {
    const { user, isLoading, isAuthenticated, checkTokenExpiry } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!isLoading) {
        const tokenValid = checkTokenExpiry();
        
        if (!tokenValid || !isAuthenticated) {
          router.push('/login');
        } else if (user && !allowedRoles.includes(user.role)) {
          router.push('/unauthorized');
        }
      }
    }, [isLoading, isAuthenticated, user, router, checkTokenExpiry]);

    if (isLoading) {
      return (
        <div className="flex h-screen items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (!isAuthenticated || !user || !allowedRoles.includes(user.role)) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };
}