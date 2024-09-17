// /context/AuthContext.js

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from './api';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [docusignConnected, setDocusignConnected] = useState(false);

  const logout = useCallback(() => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('docusignConnected');
    setUser(null);
    setToken(null);
    setDocusignConnected(false);
    delete api.defaults.headers.common['Authorization'];
  }, []);

  const checkAuthStatus = useCallback(async () => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      try {
        const response = await api.get('/api/users/me', {
          headers: { Authorization: `Bearer ${storedToken}` }
        });
        if (response.data && response.data.user) {
          setUser(response.data.user);
          setToken(storedToken);
          api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          setDocusignConnected(localStorage.getItem('docusignConnected') === 'true');
        } else {
          // Instead of throwing an error, we'll just log the user out
          console.warn('Invalid user data received');
          logout();
        }
      } catch (error) {
        console.error('Error verifying token:', error);
        // Only logout if it's an authentication error (e.g., 401 Unauthorized)
        if (error.response && error.response.status === 401) {
          logout();
        }
        // For other errors, we'll keep the user logged in
      }
    } else {
      // No token found, log out
      logout();
    }
    setLoading(false);
  }, [logout]);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // ... rest of the code remains the same ...

  const value = {
    user,
    token,
    login,
    logout,
    loading,
    docusignConnected,
    checkDocusignConnection,
    setDocusignConnected,
    connectDocuSign,
    checkAuthStatus,
  };

  return (
    <AuthContext.Provider value={value}>
      {children} {/* Remove the loading check here */}
    </AuthContext.Provider>
  );
};

export default AuthProvider;