import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

// Helper: set a first-party cookie (same domain as the frontend)
function setFirstPartyCookie(name, value, days = 7) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  // In production (HTTPS) mark the cookie Secure; in dev (HTTP) omit it.
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${value}; path=/; expires=${expires}; SameSite=Lax${secure}`;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const { data } = await authAPI.me();
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Check for Google OAuth redirect
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const token = params.get('token');

    // Clean sensitive params from URL immediately
    if (code || token) {
      params.delete('code');
      params.delete('token');
      const cleanUrl =
        window.location.pathname +
        (params.toString() ? `?${params.toString()}` : '') +
        window.location.hash;
      window.history.replaceState({}, '', cleanUrl);
    }

    if (code) {
      // Exchange single-use code for secure session (HIGH-011)
      authAPI.exchangeOAuthCode(code)
        .then(({ data }) => {
          if (data.token) {
            setFirstPartyCookie('token', data.token);
          }
          if (data.user) {
            setUser(data.user);
          } else {
            fetchUser();
          }
        })
        .catch((err) => {
          console.error('OAuth code exchange failed:', err);
          fetchUser();
        });
    } else if (token) {
      setFirstPartyCookie('token', token);
      fetchUser();
    } else {
      fetchUser();
    }
  }, [fetchUser]);

  const login = async (credentials) => {
    const { data } = await authAPI.login(credentials);
    // Store the token as a first-party cookie so the Bearer interceptor can
    // send it cross-origin on subsequent requests.
    if (data.token) {
      setFirstPartyCookie('token', data.token);
    }
    setUser(data.user);
    return data;
  };

  const register = async (userData) => {
    const { data } = await authAPI.register(userData);
    if (data.token) {
      setFirstPartyCookie('token', data.token);
    }
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch {
      // ignore
    }
    // Clear the first-party cookie
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    setUser(null);
  };

  const updateUser = (updates) => {
    setUser(prev => prev ? { ...prev, ...updates } : null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      register,
      logout,
      updateUser,
      refreshUser: fetchUser,
      isAuthenticated: !!user,
      isAdmin: user?.role === 'admin',
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

export default AuthContext;
