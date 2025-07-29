import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
  
  // Use useRef to store the logout function to avoid dependency cycles
  const logoutRef = useRef(null);

  // Define logout function
  const logout = useCallback(async () => {
    console.log('Logging out...');
    
    // Call backend logout endpoint to clear DocuSign tokens
    const currentToken = localStorage.getItem('token');
    if (currentToken) {
      try {
        await api.post('/api/users/logout');
        console.log('Backend logout successful - DocuSign tokens cleared');
      } catch (error) {
        console.error('Backend logout failed:', error);
        // Continue with frontend logout even if backend fails
      }
    }
    
    // Clear frontend state
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('docusignConnected');
    
    setUser(null);
    setToken(null);
    setDocusignConnected(false);
    
    delete api.defaults.headers.common['Authorization'];
  }, []);

  // Store the logout function in a ref to avoid dependency cycles
  useEffect(() => {
    logoutRef.current = logout;
  }, [logout]);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = JSON.parse(localStorage.getItem('user'));
      // Don't trust cached DocuSign status - always verify from server
      
      if (storedToken && storedUser) {
        console.log('Initializing auth state with stored credentials');
        setToken(storedToken);
        setUser(storedUser);
        // Clear cached DocuSign status - will be re-checked when needed
        setDocusignConnected(false);
        localStorage.removeItem('docusignConnected');
        api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        
        // Verify token validity and get updated user data
        try {
          const response = await api.get('/api/users/verify-token');
          console.log('Token verified successfully');
          
          // Update user data with the response from server
          if (response.data?.user) {
            const updatedUserData = response.data.user;
            updatedUserData._id = updatedUserData._id || updatedUserData.id;
            
            console.log('Updating user data with server response:', updatedUserData);
            setUser(updatedUserData);
            localStorage.setItem('user', JSON.stringify(updatedUserData));
          }
        } catch (error) {
          console.error('Token verification failed:', error);
          // Clear invalid credentials using the ref
          if (logoutRef.current) {
            logoutRef.current();
          }
        }
      } else {
        // Clear any stale DocuSign status if no valid auth
        setDocusignConnected(false);
        localStorage.removeItem('docusignConnected');
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
      
      // Create a more detailed error object for better handling
      const enhancedError = new Error();
      enhancedError.message = error.response?.data?.message || 'Login failed. Please try again.';
      enhancedError.response = error.response;
      enhancedError.status = error.response?.status;
      
      throw enhancedError;
    }
  };

  const checkDocusignConnection = useCallback(async () => {
    if (!token) {
      console.log('No token available for DocuSign check');
      setDocusignConnected(false);
      localStorage.removeItem('docusignConnected');
      return;
    }

    try {
      const response = await api.get('/api/docusign/status');
      // Backend returns { isConnected: boolean }, not { connected: boolean }
      const isConnected = response.data?.isConnected;
      
      // Ensure we have a valid boolean value
      const connectionStatus = typeof isConnected === 'boolean' ? isConnected : false;
      
      setDocusignConnected(connectionStatus);
      localStorage.setItem('docusignConnected', connectionStatus.toString());
      
      console.log('DocuSign connection status:', connectionStatus);
      return connectionStatus;
    } catch (error) {
      console.error('Error checking DocuSign connection:', error);
      setDocusignConnected(false);
      localStorage.removeItem('docusignConnected');
      return false;
    }
  }, [token]);

  const clearDocusignStatus = useCallback(() => {
    setDocusignConnected(false);
    localStorage.removeItem('docusignConnected');
    console.log('DocuSign status cleared.');
  }, []);

  const disconnectDocuSign = useCallback(async () => {
    if (!token) {
      console.log('No token available for DocuSign disconnect');
      return false;
    }

    try {
      await api.post('/api/docusign/disconnect');
      console.log('DocuSign disconnected successfully');
      
      setDocusignConnected(false);
      localStorage.removeItem('docusignConnected');
      
      return true;
    } catch (error) {
      console.error('Error disconnecting DocuSign:', error);
      return false;
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
    clearDocusignStatus,
    disconnectDocuSign,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;