// context/UploadContext.js
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const UploadContext = createContext();

export const useUploadContext = () => {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error('useUploadContext must be used within an UploadProvider');
  }
  return context;
};

export const UploadProvider = ({ children }) => {
  const [activeUploads, setActiveUploads] = useState(new Map()); // Map of listingId -> upload state

  // Load upload state from localStorage on mount
  useEffect(() => {
    try {
      const savedUploads = localStorage.getItem('realoffer_active_uploads');
      if (savedUploads) {
        const parsedUploads = JSON.parse(savedUploads);
        const uploadsMap = new Map();
        
        // Convert back to Map and filter out completed/failed uploads older than 1 hour
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        Object.entries(parsedUploads).forEach(([listingId, upload]) => {
          // Only restore uploads that are still active or completed/failed recently
          if (upload.status === 'uploading' || 
              (upload.completedAt && upload.completedAt > oneHourAgo) ||
              (upload.failedAt && upload.failedAt > oneHourAgo)) {
            uploadsMap.set(listingId, upload);
          }
        });
        
        setActiveUploads(uploadsMap);
        console.log('Restored upload state from localStorage:', uploadsMap.size, 'uploads');
      }
    } catch (error) {
      console.warn('Failed to restore upload state from localStorage:', error);
    }
  }, []);

  // Save upload state to localStorage whenever it changes
  const saveToLocalStorage = useCallback((uploads) => {
    try {
      const uploadsObject = Object.fromEntries(uploads);
      localStorage.setItem('realoffer_active_uploads', JSON.stringify(uploadsObject));
    } catch (error) {
      console.warn('Failed to save upload state to localStorage:', error);
    }
  }, []);

  // Start a new upload
  const startUpload = useCallback((listingId, uploadData) => {
    setActiveUploads(prev => {
      const newUploads = new Map(prev);
      const uploadState = {
        ...uploadData,
        startTime: Date.now(),
        status: 'uploading'
      };
      newUploads.set(listingId, uploadState);
      saveToLocalStorage(newUploads);
      return newUploads;
    });
  }, [saveToLocalStorage]);

  // Update upload progress
  const updateUploadProgress = useCallback((listingId, progressData) => {
    setActiveUploads(prev => {
      const newUploads = new Map(prev);
      const currentUpload = newUploads.get(listingId);
      if (currentUpload) {
        const updatedUpload = {
          ...currentUpload,
          ...progressData,
          lastUpdated: Date.now()
        };
        newUploads.set(listingId, updatedUpload);
        saveToLocalStorage(newUploads);
      }
      return newUploads;
    });
  }, [saveToLocalStorage]);

  // Complete an upload
  const completeUpload = useCallback((listingId, result) => {
    setActiveUploads(prev => {
      const newUploads = new Map(prev);
      const currentUpload = newUploads.get(listingId);
      if (currentUpload) {
        const completedUpload = {
          ...currentUpload,
          ...result,
          status: 'completed',
          completedAt: Date.now()
        };
        newUploads.set(listingId, completedUpload);
        saveToLocalStorage(newUploads);
      }
      return newUploads;
    });
  }, [saveToLocalStorage]);

  // Fail an upload
  const failUpload = useCallback((listingId, error) => {
    setActiveUploads(prev => {
      const newUploads = new Map(prev);
      const currentUpload = newUploads.get(listingId);
      if (currentUpload) {
        const failedUpload = {
          ...currentUpload,
          error,
          status: 'failed',
          failedAt: Date.now()
        };
        newUploads.set(listingId, failedUpload);
        saveToLocalStorage(newUploads);
      }
      return newUploads;
    });
  }, [saveToLocalStorage]);

  // Clear completed/failed uploads
  const clearUpload = useCallback((listingId) => {
    setActiveUploads(prev => {
      const newUploads = new Map(prev);
      newUploads.delete(listingId);
      saveToLocalStorage(newUploads);
      return newUploads;
    });
  }, [saveToLocalStorage]);

  // Get upload state for a specific listing
  const getUploadState = useCallback((listingId) => {
    return activeUploads.get(listingId);
  }, [activeUploads]);

  // Check if there's an active upload for a listing
  const hasActiveUpload = useCallback((listingId) => {
    const upload = activeUploads.get(listingId);
    return upload && upload.status === 'uploading';
  }, [activeUploads]);

  // Get all active uploads
  const getAllActiveUploads = useCallback(() => {
    return Array.from(activeUploads.entries()).map(([listingId, upload]) => ({
      listingId,
      ...upload
    }));
  }, [activeUploads]);

  // Clean up old upload states (completed/failed uploads older than 1 hour)
  const cleanupOldUploads = useCallback(() => {
    setActiveUploads(prev => {
      const newUploads = new Map(prev);
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      let cleaned = false;
      
      for (const [listingId, upload] of newUploads.entries()) {
        if ((upload.status === 'completed' && upload.completedAt && upload.completedAt < oneHourAgo) ||
            (upload.status === 'failed' && upload.failedAt && upload.failedAt < oneHourAgo)) {
          newUploads.delete(listingId);
          cleaned = true;
        }
      }
      
      if (cleaned) {
        saveToLocalStorage(newUploads);
      }
      
      return newUploads;
    });
  }, [saveToLocalStorage]);

  // Clean up old uploads every 30 minutes
  useEffect(() => {
    const cleanupInterval = setInterval(cleanupOldUploads, 30 * 60 * 1000);
    return () => clearInterval(cleanupInterval);
  }, [cleanupOldUploads]);

  const value = {
    activeUploads,
    startUpload,
    updateUploadProgress,
    completeUpload,
    failUpload,
    clearUpload,
    getUploadState,
    hasActiveUpload,
    getAllActiveUploads
  };

  return (
    <UploadContext.Provider value={value}>
      {children}
    </UploadContext.Provider>
  );
};
