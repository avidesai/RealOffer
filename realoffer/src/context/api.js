// /context/api.js

import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_BACKEND_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Add request interceptor for token handling
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    console.log('Request interceptor - Token:', token ? 'Present' : 'Missing');
    
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    // For FormData requests, let the browser set the Content-Type
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
      console.log('FormData request detected - Content-Type header removed');
    }
    
    console.log('Request config:', {
      url: config.url,
      method: config.method,
      headers: config.headers
    });
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log('Response received:', {
      status: response.status,
      url: response.config?.url
    });
    console.log('Response data:', response.data);
    return response;
  },
  (error) => {
    if (error.response) {
      console.error('Response error:', {
        status: error.response.status,
        data: error.response.data,
        url: error.config.url
      });
      
      // Handle 401 errors - but don't redirect for login attempts
      if (error.response.status === 401) {
        console.error('Unauthorized - Token may be invalid or expired');
        
        // Only redirect if this is not a login request
        const isLoginRequest = error.config.url?.includes('/api/users/login');
        if (!isLoginRequest) {
          // You might want to trigger a logout here
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
      }
    } else if (error.request) {
      console.error('Request error - No response received:', error.request);
    } else {
      console.error('Error setting up request:', error.message);
    }
    return Promise.reject(error);
  }
);

export default api;
