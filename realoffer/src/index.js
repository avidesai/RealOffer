// index.js

import React from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from './context/AuthContext';
import { OfferProvider } from './context/OfferContext';
import App from './App';
import './index.css';
import './utils/pdfWorker'; // Initialize PDF.js worker globally

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <AuthProvider>
    <OfferProvider>
      <App />
    </OfferProvider>
  </AuthProvider>
);
