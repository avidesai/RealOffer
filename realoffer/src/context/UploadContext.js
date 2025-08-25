// context/UploadContext.js
import React, { createContext, useContext, useState, useCallback } from 'react';

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

  // Start a new upload
  const startUpload = useCallback((listingId, uploadData) => {
    setActiveUploads(prev => {
      const newUploads = new Map(prev);
      newUploads.set(listingId, {
        ...uploadData,
        startTime: Date.now(),
        status: 'uploading'
      });
      return newUploads;
    });
  }, []);

  // Update upload progress
  const updateUploadProgress = useCallback((listingId, progressData) => {
    setActiveUploads(prev => {
      const newUploads = new Map(prev);
      const currentUpload = newUploads.get(listingId);
      if (currentUpload) {
        newUploads.set(listingId, {
          ...currentUpload,
          ...progressData,
          lastUpdated: Date.now()
        });
      }
      return newUploads;
    });
  }, []);

  // Complete an upload
  const completeUpload = useCallback((listingId, result) => {
    setActiveUploads(prev => {
      const newUploads = new Map(prev);
      const currentUpload = newUploads.get(listingId);
      if (currentUpload) {
        newUploads.set(listingId, {
          ...currentUpload,
          ...result,
          status: 'completed',
          completedAt: Date.now()
        });
      }
      return newUploads;
    });
  }, []);

  // Fail an upload
  const failUpload = useCallback((listingId, error) => {
    setActiveUploads(prev => {
      const newUploads = new Map(prev);
      const currentUpload = newUploads.get(listingId);
      if (currentUpload) {
        newUploads.set(listingId, {
          ...currentUpload,
          error,
          status: 'failed',
          failedAt: Date.now()
        });
      }
      return newUploads;
    });
  }, []);

  // Clear completed/failed uploads
  const clearUpload = useCallback((listingId) => {
    setActiveUploads(prev => {
      const newUploads = new Map(prev);
      newUploads.delete(listingId);
      return newUploads;
    });
  }, []);

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
