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

  // Consider uploads stale (interrupted) if no update for this long
  const STALE_UPLOAD_MS = 2 * 60 * 1000; // 2 minutes

  // Load upload state from localStorage on mount
  useEffect(() => {
    try {
      const savedUploads = localStorage.getItem('realoffer_active_uploads');
      if (savedUploads) {
        const parsedUploads = JSON.parse(savedUploads);
        const uploadsMap = new Map();
        
        const now = Date.now();
        const oneHourAgo = now - (60 * 60 * 1000);
        Object.entries(parsedUploads).forEach(([listingId, upload]) => {
          let restored = { ...upload };

          // Auto-mark stale uploads as interrupted
          if (restored.status === 'uploading') {
            const last = restored.lastUpdated || restored.startTime || 0;
            if (now - last > STALE_UPLOAD_MS) {
              restored = {
                ...restored,
                status: 'interrupted',
                interruptedAt: now,
              };
            }
          }

          // Only restore uploads that are still active or completed/failed recently
          if (
            restored.status === 'uploading' ||
            restored.status === 'interrupted' ||
            (restored.completedAt && restored.completedAt > oneHourAgo) ||
            (restored.failedAt && restored.failedAt > oneHourAgo)
          ) {
            uploadsMap.set(listingId, restored);
          }
        });
        
        setActiveUploads(uploadsMap);
        // Persist back any interrupted updates
        const uploadsObject = Object.fromEntries(uploadsMap);
        localStorage.setItem('realoffer_active_uploads', JSON.stringify(uploadsObject));
      }
    } catch (error) {
      console.warn('Failed to restore upload state from localStorage:', error);
    }
  }, []);

  // Mark all active uploads as interrupted on page unload
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBeforeUnload = () => {
      setActiveUploads(prev => {
        const now = Date.now();
        const newUploads = new Map(prev);
        let changed = false;
        for (const [listingId, upload] of newUploads.entries()) {
          if (upload.status === 'uploading') {
            newUploads.set(listingId, {
              ...upload,
              status: 'interrupted',
              interruptedAt: now,
            });
            changed = true;
          }
        }
        if (changed) {
          const uploadsObject = Object.fromEntries(newUploads);
          try { localStorage.setItem('realoffer_active_uploads', JSON.stringify(uploadsObject)); } catch (_) {}
        }
        return newUploads;
      });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
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

  // Periodically mark stuck uploads as interrupted
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveUploads(prev => {
        const now = Date.now();
        let changed = false;
        const newUploads = new Map(prev);
        for (const [listingId, upload] of newUploads.entries()) {
          if (upload.status === 'uploading') {
            const last = upload.lastUpdated || upload.startTime || 0;
            if (now - last > STALE_UPLOAD_MS) {
              newUploads.set(listingId, {
                ...upload,
                status: 'interrupted',
                interruptedAt: now,
              });
              changed = true;
            }
          }
        }
        if (changed) {
          saveToLocalStorage(newUploads);
        }
        return newUploads;
      });
    }, 30 * 1000); // check every 30s

    return () => clearInterval(timer);
  }, [saveToLocalStorage]);

  // Start a new upload
  const startUpload = useCallback((listingId, uploadData) => {
    setActiveUploads(prev => {
      const newUploads = new Map(prev);
      const uploadState = {
        ...uploadData,
        startTime: Date.now(),
        lastUpdated: Date.now(),
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
        // If previously interrupted, revive it
        const revivedStatus = currentUpload.status === 'interrupted' ? 'uploading' : currentUpload.status;
        const updatedUpload = {
          ...currentUpload,
          ...progressData,
          status: revivedStatus,
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

  // Mark an upload as interrupted (manual)
  const interruptUpload = useCallback((listingId) => {
    setActiveUploads(prev => {
      const newUploads = new Map(prev);
      const currentUpload = newUploads.get(listingId);
      if (currentUpload && currentUpload.status === 'uploading') {
        newUploads.set(listingId, {
          ...currentUpload,
          status: 'interrupted',
          interruptedAt: Date.now(),
        });
        saveToLocalStorage(newUploads);
      }
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

  const value = {
    activeUploads,
    startUpload,
    updateUploadProgress,
    completeUpload,
    failUpload,
    clearUpload,
    interruptUpload,
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
