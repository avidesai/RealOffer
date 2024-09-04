// /context/api.js

import axios from 'axios';

const api = axios.create({
  baseURL: 'https://realoffer.onrender.com', // Ensure the correct base URL is set here
  withCredentials: true, // Include credentials in cross-site requests
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;