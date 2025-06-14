import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../../../../../../../../context/AuthContext';
import './DocuSignConfig.css';

const DocuSignConfig = ({ onConfigComplete }) => {
  const { token } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const checkDocuSignConnection = useCallback(async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/docusign/status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setIsConnected(data.isConnected);
      if (data.isConnected) {
        onConfigComplete(true);
      }
    } catch (err) {
      setError('Failed to check DocuSign connection');
    } finally {
      setIsLoading(false);
    }
  }, [token, onConfigComplete]);

  useEffect(() => {
    checkDocuSignConnection();
  }, [checkDocuSignConnection]);

  const handleConnect = async () => {
    try {
      // Get the authorization URL from your backend
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/docusign/auth-url`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const { authUrl } = await response.json();
      
      // Open DocuSign OAuth in a popup
      const width = 600;
      const height = 600;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      const popup = window.open(
        authUrl,
        'DocuSign OAuth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Listen for the OAuth callback
      window.addEventListener('message', async (event) => {
        if (event.data.type === 'DOCUSIGN_OAUTH_CALLBACK') {
          popup.close();
          await checkDocuSignConnection();
        }
      });
    } catch (err) {
      setError('Failed to connect to DocuSign');
    }
  };

  if (isLoading) {
    return (
      <div className="docusign-config">
        <div className="listing-overview-spinner" style={{ margin: '40px auto' }}></div>
      </div>
    );
  }

  return (
    <div className="docusign-config">
      {error && <div className="error-message">{error}</div>}
      
      {isConnected ? (
        <div className="connected-state">
          <div className="success-icon">✓</div>
          <h3>Connected to DocuSign</h3>
          <p>You can now send documents for signature</p>
        </div>
      ) : (
        <div className="connect-state">
          <h3>Connect to DocuSign</h3>
          <p>Connect your DocuSign account to send documents for signature</p>
          <button 
            className="connect-button"
            onClick={handleConnect}
          >
            Connect DocuSign Account
          </button>
        </div>
      )}
    </div>
  );
};

export default DocuSignConfig; 