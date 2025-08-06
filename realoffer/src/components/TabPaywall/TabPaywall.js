import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, BarChart2, Calculator, Activity as ActivityIcon, Eye, Download, BarChart3, Brain, FileText, Search, Shield, MessageSquare } from 'lucide-react';
import './TabPaywall.css';

const TabPaywall = ({ feature, variant = 'analysis' }) => {
  const navigate = useNavigate();

  const handleUpgradeClick = () => {
    navigate('/upgrade');
  };
  const getFeatureConfig = () => {
    switch (feature) {
      case 'analysis':
        return {
          title: "Valuation and Comparable Market Analysis",
          description: "Access detailed property valuations, comparable sales, and rental estimates to make informed decisions.",
          icon: <TrendingUp size={32} />,
          benefits: [
            { icon: <TrendingUp size={16} />, text: "Real-time property valuations and market analysis" },
            { icon: <BarChart2 size={16} />, text: "Comparable sales data and insights" },
            { icon: <Calculator size={16} />, text: "Rental income estimates for investment analysis" },
          ]
        };
      case 'activity':
        return {
          title: "Advanced Activity Tracking",
          description: "Get real-time insights into listing activity and buyer interest to make informed decisions.",
          icon: <ActivityIcon size={32} />,
          benefits: [
            { icon: <Eye size={16} />, text: "See who is viewing your listings and track viewing patterns" },
            { icon: <Download size={16} />, text: "Monitor document downloads and offer activity" },
            { icon: <BarChart3 size={16} />, text: "Analyze listing performance and optimize your strategy" }
          ]
        };
      case 'ai-analysis':
        return {
          title: "AI Document Analysis",
          description: "Get instant AI-powered analysis of the most important disclosures to save time, identify key risks and make informed decisions.",
          icon: <Brain size={32} />,
          benefits: [
            { icon: <Brain size={16} />, text: "AI-powered analysis of disclosure documents" },
            { icon: <FileText size={16} />, text: "Instant summary of key findings and risks from all document types" },
            { icon: <Shield size={16} />, text: "Professional risk assessment and recommendations" },
            { icon: <Search size={16} />, text: "Support for inspections, TDS, SPQ, AVID, and more" }
          ]
        };
      case 'property-chat':
        return {
          title: "AI Property Assistant",
          description: "Get instant answers about any property using our AI assistant. Ask questions about property details, documents, and get personalized insights.",
          icon: <MessageSquare size={32} />,
          benefits: [
            { icon: <MessageSquare size={16} />, text: "AI-powered property assistant for instant answers" },
            { icon: <Brain size={16} />, text: "Ask questions about property details, documents, and valuation" },
            { icon: <Search size={16} />, text: "Get insights from inspection reports, disclosures, and more" },
            { icon: <FileText size={16} />, text: "Personalized recommendations and property analysis" }
          ]
        };
      default:
        return {
          title: "Pro Feature",
          description: "This feature is available exclusively to Pro users.",
          icon: <TrendingUp size={32} />,
          benefits: []
        };
    }
  };

  const config = getFeatureConfig();

  return (
    <div className="tab-paywall">
      <div className="tab-paywall-content">
        <div className="tab-paywall-header">
          <div className="tab-paywall-icon">
            {config.icon}
          </div>
          <h2 className="tab-paywall-title">{config.title}</h2>
          <p className="tab-paywall-description">{config.description}</p>
        </div>
        
        <div className="tab-paywall-benefits">
          <h3 className="tab-paywall-benefits-title">Unlock Pro Features</h3>
          <div className="tab-paywall-benefits-list">
            {config.benefits.map((benefit, index) => (
              <div key={index} className="tab-paywall-benefit">
                <div className="tab-paywall-benefit-icon">
                  {benefit.icon}
                </div>
                <span className="tab-paywall-benefit-text">{benefit.text}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="tab-paywall-cta">
          <button className="tab-paywall-button" onClick={handleUpgradeClick}>
            Upgrade to Pro
          </button>
        </div>
      </div>
    </div>
  );
};

export default TabPaywall; 