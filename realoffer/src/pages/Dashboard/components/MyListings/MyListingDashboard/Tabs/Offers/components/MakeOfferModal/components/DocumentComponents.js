// DocumentComponents.js
// Reusable components for the enhanced document workflow

import React, { useState } from 'react';
import './DocumentComponents.css';

// Option Card for different document choices
export const OptionCard = ({ 
  id, 
  selected, 
  onSelect, 
  icon, 
  title, 
  description, 
  recommended = false,
  greenOutline = false,
  children 
}) => {
  return (
    <div 
      className={`option-card${selected ? ' selected' : ''}${recommended ? ' recommended' : ''}${greenOutline && selected ? ' option-card-green-outline' : ''}`}
      onClick={() => onSelect(id)}
    >
      <div className="option-card-header">
        <span className="option-icon">{icon}</span>
        <div className="option-content">
          <h4 className="option-title">
            {title}
            {recommended && <span className="recommended-badge">Recommended</span>}
          </h4>
          <p className="option-description">{description}</p>
        </div>
        <div className="option-selector">
          <input 
            type="radio" 
            checked={selected} 
            onChange={() => onSelect(id)}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </div>
      {selected && children && (
        <div className="option-card-content">
          {children}
        </div>
      )}
    </div>
  );
};

// Document Status Badge
export const StatusBadge = ({ status, type = 'default' }) => {
  const getStatusConfig = (status) => {
    switch(status) {
      case 'ready':
      case 'completed':
      case 'uploaded':
        return { text: '✓ Ready', className: 'status-success' };
      case 'needed':
      case 'required':
        return { text: '⚠ Required', className: 'status-warning' };
      case 'recommended':
        return { text: '💡 Recommended', className: 'status-info' };
      case 'pending':
        return { text: '⏳ Pending', className: 'status-pending' };
      case 'available':
        return { text: '📄 Available', className: 'status-available' };
      case 'send-to-docusign':
        return { text: 'DocuSign', className: 'status-docusign' };
      case 'error':
      case 'failed':
        return { text: '❌ Error', className: 'status-error' };
      default:
        return { text: status, className: 'status-default' };
    }
  };

  const config = getStatusConfig(status);
  
  return (
    <span className={`status-badge ${config.className} ${type}`}>
      {config.text}
    </span>
  );
};

// Document Preview Component
export const DocumentPreview = ({ 
  document, 
  canRegenerate = false, 
  onRegenerate, 
  onReplace, 
  onRemove,
  showStatus = false,
  compact = false
}) => {
  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size';
    return bytes > 1024 ? `${Math.round(bytes / 1024)}KB` : `${bytes}B`;
  };

  const getDocumentIcon = (document) => {
    if (document.type?.toLowerCase().includes('pdf')) return '📄';
    if (document.type?.toLowerCase().includes('image')) return '🖼️';
    if (document.type?.toLowerCase().includes('agreement')) return '📋';
    if (document.type?.toLowerCase().includes('signature')) return '✍️';
    return '📄';
  };

  if (compact) {
    return (
      <div className="offer-docs-preview compact">
        <div className="offer-docs-icon">{getDocumentIcon(document)}</div>
        <div className="offer-docs-info">
          <span className="offer-docs-title">{document.title}</span>
          <span className="offer-docs-meta">
            {document.type}
          </span>
        </div>
        {showStatus && (
          <StatusBadge status={document.sendForSigning ? 'send-to-docusign' : (document.status || 'ready')} />
        )}
      </div>
    );
  }

  return (
    <div className="offer-docs-preview">
      <div className="offer-docs-preview-header">
        <div className="offer-docs-info">
          <span className="offer-docs-icon">{getDocumentIcon(document)}</span>
          <div>
            <h5 className="offer-docs-title">{document.title}</h5>
            <p className="offer-docs-meta">
              {document.type}
            </p>
          </div>
        </div>
        {showStatus && <StatusBadge status={document.sendForSigning ? 'send-to-docusign' : (document.status || 'ready')} />}
      </div>
      
      <div className="offer-docs-preview-actions">
        <button className="docs-clp-button">Preview</button>
        {canRegenerate && (
          <button className="docs-clp-button" onClick={onRegenerate}>
            Regenerate
          </button>
        )}
        {onReplace && (
          <button className="docs-clp-button" onClick={onReplace}>
            Replace
          </button>
        )}
        {onRemove && (
          <button className="docs-clp-button" onClick={onRemove}>
            Remove
          </button>
        )}
      </div>
    </div>
  );
};

// Requirement Card for required documents
export const RequirementCard = ({ 
  requirement, 
  document = null,
  onUpload, 
  onRemove 
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onUpload(requirement.type, files[0]);
    }
  };

  if (document) {
    return (
      <div className="requirement-card fulfilled">
        <div className="requirement-info">
          <h4>{requirement.title}</h4>
          <p>{requirement.description}</p>
        </div>
        <DocumentPreview 
          document={document}
          onRemove={() => onRemove(requirement.type)}
        />
      </div>
    );
  }

  return (
    <div 
      className={`requirement-card ${requirement.required ? 'required' : 'optional'} ${isDragOver ? 'drag-over' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      <div className="requirement-header">
        <div className="requirement-info">
          <h4>{requirement.title}</h4>
          <p>{requirement.description}</p>
        </div>
        <StatusBadge status={requirement.status} />
      </div>
      
      <div className="requirement-upload">
        <div className="upload-prompt">
          <span className="upload-icon">📤</span>
          <p>{requirement.uploadPrompt}</p>
          <p className="accepted-types">Accepted: {requirement.acceptedTypes}</p>
        </div>
        <button 
          className="docs-clp-primary-button"
          onClick={() => document.getElementById(`upload-${requirement.type}`).click()}
        >
          Upload Document
        </button>
        <input
          id={`upload-${requirement.type}`}
          type="file"
          accept={requirement.acceptedTypes}
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files[0]) {
              onUpload(requirement.type, e.target.files[0]);
            }
          }}
        />
      </div>
    </div>
  );
};

// Progress Indicator for document completion
export const DocumentProgress = ({ 
  completed, 
  total, 
  requiredCompleted = 0, 
  requiredTotal = 0 
}) => {
  const completionPercent = total > 0 ? (completed / total) * 100 : 0;
  const requiredCompletionPercent = requiredTotal > 0 ? (requiredCompleted / requiredTotal) * 100 : 100;
  
  return (
    <div className="document-progress">
      <div className="progress-header">
        <h4>Document Progress</h4>
        <span className="progress-text">
          {completed}/{total} documents ready
          {requiredTotal > 0 && ` • ${requiredCompleted}/${requiredTotal} required`}
        </span>
      </div>
      
      <div className="progress-bars">
        <div className="progress-bar">
          <div className="progress-label">Overall Progress</div>
          <div className="progress-track">
            <div 
              className="progress-fill"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
        </div>
        
        {requiredTotal > 0 && (
          <div className="progress-bar">
            <div className="progress-label">Required Documents</div>
            <div className="progress-track required">
              <div 
                className="progress-fill required"
                style={{ width: `${requiredCompletionPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Tab Navigation for the document sections
export const DocumentTabs = ({ activeTab, onTabChange, tabs, validation = {} }) => {
  return (
    <div className="document-tabs">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`document-tab ${activeTab === tab.id ? 'active' : ''} ${validation[tab.id] === true ? 'completed' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          <span className="tab-icon">{tab.icon}</span>
          <span className="tab-label">{tab.label}</span>
          {validation[tab.id] === true && <span className="tab-check">✓</span>}
        </button>
      ))}
    </div>
  );
};

// Smart Drop Zone with type detection
export const SmartDropZone = ({ 
  onDrop, 
  suggestions = [], 
  autoDetectType = false,
  placeholder = "Drag files here or click to upload",
  accept = "application/pdf,image/*"
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    onDrop(files, autoDetectType);
  };

  return (
    <div 
      className={`smart-drop-zone ${isDragOver ? 'drag-over' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      onClick={() => document.getElementById('smart-file-input').click()}
    >
      <div className="drop-zone-content">
        <span className="drop-zone-icon">📁</span>
        <p className="drop-zone-text">{placeholder}</p>
        <button className="docs-clp-button">Choose Files</button>
      </div>
      
      <input
        id="smart-file-input"
        type="file"
        multiple
        accept={accept}
        style={{ display: 'none' }}
        onChange={(e) => {
          const files = Array.from(e.target.files);
          onDrop(files, autoDetectType);
        }}
      />
    </div>
  );
}; 