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

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = JSON.parse(localStorage.getItem('user'));
      const docusignStatus = localStorage.getItem('docusignConnected') === 'true';

      if (storedToken && storedUser) {
        console.log('Initializing auth state with stored credentials');
        setToken(storedToken);
        setUser(storedUser);
        setDocusignConnected(docusignStatus);
        api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        
        // Verify token validity
        try {
          await api.get('/api/users/verify-token');
          console.log('Token verified successfully');
        } catch (error) {
          console.error('Token verification failed:', error);
          // Clear invalid credentials
          logout();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    try {
      console.log('Attempting login...');
      const response = await api.post('/api/users/login', { email, password });
      
      if (response.data?.user && response.data?.token) {
        const userData = response.data.user;
        userData._id = userData._id || userData.id;
        
        console.log('Login successful, setting credentials');
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('token', response.data.token);
        
        setUser(userData);
        setToken(response.data.token);
        api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
        
        return userData;
      } else {
        throw new Error('Invalid login response from server');
      }
    } catch (error) {
      console.error('Login error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Login failed. Please try again.');
    }
  };

  const logout = useCallback(() => {
    console.log('Logging out...');
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('docusignConnected');
    
    setUser(null);
    setToken(null);
    setDocusignConnected(false);
    
    delete api.defaults.headers.common['Authorization'];
  }, []);

  const checkDocusignConnection = useCallback(async () => {
    if (!token) {
      console.log('No token available for DocuSign check');
      return;
    }

    try {
      const response = await api.get('/api/docusign/status');
      const isConnected = response.data.connected;
      
      setDocusignConnected(isConnected);
      localStorage.setItem('docusignConnected', isConnected.toString());
      
      console.log('DocuSign connection status:', isConnected);
    } catch (error) {
      console.error('Error checking DocuSign connection:', error);
      setDocusignConnected(false);
      localStorage.removeItem('docusignConnected');
    }
  }, [token]);

  const value = {
    user,
    token,
    login,
    logout,
    loading,
    docusignConnected,
    checkDocusignConnection,
    setDocusignConnected,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;