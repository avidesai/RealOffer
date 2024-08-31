import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

const PrivateRoute = ({ element: Component }) => {
  const { user, token, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  return user && token ? <Component /> : <Navigate to="/login" />;
};

export default PrivateRoute;
