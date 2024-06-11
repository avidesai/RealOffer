import React from 'react';
import ReactDOM from 'react-dom';
import { AuthProvider } from './context/AuthContext';
import App from './App';
import './index.css';

ReactDOM.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
  document.getElementById('root')
);
