// /context/AuthContext.js

import React, { createContext, useContext, useState, useEffect } from 'react';
import api from './api';  // Import the custom api instance

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user'));
    const storedToken = localStorage.getItem('token');
    if (storedUser && storedToken) {
      setUser(storedUser);
      setToken(storedToken);
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/api/users/login', { email, password });
      console.log('Login response:', response.data); // Debug log
      if (response.data && response.data.user && response.data.token) {
        const userData = response.data.user;
        if (!userData._id && !userData.id) {
          console.error('User data is missing _id or id:', userData);
          throw new Error('Invalid user data received');
        }
        // If the backend sends 'id' instead of '_id', create '_id' for consistency
        if (!userData._id && userData.id) {
          userData._id = userData.id;
        }
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('token', response.data.token);
        setUser(userData);
        setToken(response.data.token);
        console.log('Stored user:', userData); // Debug log
        console.log('Stored token:', response.data.token); // Debug log
        return userData; // Return user data for additional handling in components
      } else {
        console.error('Invalid login response:', response.data);
        throw new Error('Invalid login response from server');
      }
    } catch (error) {
      console.error('Error logging in:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    setToken(null);
  };

  const value = {
    user,
    token,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;