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

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user'));
    const storedToken = localStorage.getItem('token');
    const docusignStatus = localStorage.getItem('docusignConnected') === 'true';
    if (storedUser && storedToken) {
      setUser(storedUser);
      setToken(storedToken);
      setDocusignConnected(docusignStatus);
      api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/api/users/login', { email, password });
      if (response.data && response.data.user && response.data.token) {
        const userData = response.data.user;
        userData._id = userData._id || userData.id;
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
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('docusignConnected');
    setUser(null);
    setToken(null);
    setDocusignConnected(false);
    delete api.defaults.headers.common['Authorization'];
  }, []);

  const checkDocusignConnection = useCallback(async () => {
    try {
      const response = await api.get('/api/docusign/status');
      if (response.data.connected) {
        setDocusignConnected(true);
        localStorage.setItem('docusignConnected', 'true');
      } else {
        setDocusignConnected(false);
        localStorage.removeItem('docusignConnected');
      }
    } catch (error) {
      console.error('Error checking DocuSign connection:', error);
      setDocusignConnected(false);
      localStorage.removeItem('docusignConnected');
    }
  }, []);

  const initiateDocuSignLogin = useCallback(async (listingId) => {
    try {
      const response = await api.get(`/api/docusign/login?listingId=${listingId}`);
      window.location.href = response.data.url || response.request.responseURL;
    } catch (error) {
      console.error('Error initiating DocuSign login:', error);
      throw new Error('Failed to initiate DocuSign login. Please try again.');
    }
  }, []);

  const value = {
    user,
    token,
    login,
    logout,
    loading,
    docusignConnected,
    checkDocusignConnection,
    setDocusignConnected,
    initiateDocuSignLogin,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;