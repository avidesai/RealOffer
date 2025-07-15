// BuyerPackageAnalysis.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../../../../../context/AuthContext';
import './BuyerPackageAnalysis.css';

const BuyerPackageAnalysis = ({ buyerPackageId }) => {
  const { token } = useAuth();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalysis();
  }, [buyerPackageId]);

  const fetchAnalysis = async () => {
    if (!buyerPackageId) return;

    try {
      setLoading(true);
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/buyerPackages/${buyerPackageId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Get the property listing analysis
      const propertyListing = response.data.propertyListing;
      if (propertyListing && propertyListing._id) {
        const analysisResponse = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/property-analysis/${propertyListing._id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        setAnalysis(analysisResponse.data);
      }
    } catch (error) {
      console.error('Error fetching analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="buyer-package-analysis-loading">
        <div className="buyer-package-analysis-spinner"></div>
        <p>Loading analysis...</p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="buyer-package-analysis">
        <div className="buyer-package-analysis-header">
          <h2>Property Analysis</h2>
          <p>AI-powered property insights and market analysis</p>
        </div>
        <div className="buyer-package-analysis-empty">
          <p>No analysis available for this property.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="buyer-package-analysis">
      <div className="buyer-package-analysis-header">
        <h2>Property Analysis</h2>
        <p>AI-powered property insights and market analysis</p>
      </div>

      <div className="buyer-package-analysis-content">
        {analysis.summary && (
          <div className="buyer-package-analysis-section">
            <h3>Property Summary</h3>
            <p>{analysis.summary}</p>
          </div>
        )}

        {analysis.marketInsights && (
          <div className="buyer-package-analysis-section">
            <h3>Market Insights</h3>
            <p>{analysis.marketInsights}</p>
          </div>
        )}

        {analysis.recommendations && (
          <div className="buyer-package-analysis-section">
            <h3>Recommendations</h3>
            <p>{analysis.recommendations}</p>
          </div>
        )}

        {analysis.risks && (
          <div className="buyer-package-analysis-section">
            <h3>Potential Risks</h3>
            <p>{analysis.risks}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BuyerPackageAnalysis; 