# Background Upload Feature

This document describes the new background upload functionality that allows users to continue working while document uploads and AI processing happen in the background.

## Overview

Previously, users had to wait for the entire upload process to complete before they could continue working. The new background upload feature allows users to:

1. **Start an upload** and close the progress modal
2. **Continue working** while uploads process in the background
3. **Check progress** by clicking the upload button again
4. **Receive notifications** when uploads complete or fail

## Key Features

### 1. Background Processing
- Uploads continue even when the progress modal is closed
- AI processing (embeddings, Pinecone upserts) happens in the background
- Users can navigate away and return without losing progress

### 2. Visual Indicators
- **Upload button changes** to "View Upload Progress" with a spinning icon when upload is active
- **Progress modal** shows current status when reopened
- **Notifications** appear when uploads complete or fail

### 3. State Management
- **Global upload state** managed by `UploadContext`
- **Persistent across navigation** - uploads continue even if user switches tabs
- **Automatic cleanup** of completed/failed uploads

## User Experience Flow

### Starting an Upload
1. User clicks "Upload" button
2. Upload Documents modal opens
3. User selects files and clicks "Upload Documents"
4. Upload starts and modal closes automatically
5. Upload button changes to "🔄 View Upload Progress"

### Checking Progress
1. User clicks "🔄 View Upload Progress" button
2. Progress modal opens showing current status
3. User can close modal and continue working
4. Progress continues in background

### Upload Completion
1. **Success**: Notification appears: "Upload completed! X documents processed."
2. **Failure**: Notification appears: "Upload failed: [error message]"
3. Upload button returns to normal "Upload" state
4. Documents list refreshes automatically

## Technical Implementation

### 1. Upload Context (`UploadContext.js`)
```javascript
// Global state management for uploads
const UploadContext = createContext();

// Key functions:
- startUpload(listingId, uploadData)
- updateUploadProgress(listingId, progressData)
- completeUpload(listingId, result)
- failUpload(listingId, error)
- hasActiveUpload(listingId)
- getUploadState(listingId)
```

### 2. Background Processing
- **Upload state persists** in React context
- **Progress updates** continue from backend streaming
- **Modal can be closed** without stopping the upload
- **State cleanup** happens automatically

### 3. Progress Modal Updates
- **Real-time progress** from context state
- **Elapsed time display** shows how long upload has been running
- **Background notice** informs users they can close the modal
- **Status indicators** for uploading, completed, or failed states

### 4. Notification System
- **Success notifications** auto-hide after 5 seconds
- **Error notifications** auto-hide after 8 seconds
- **Manual dismissal** with close button
- **Positioned** in top-right corner

## File Structure

```
src/
├── context/
│   └── UploadContext.js          # Global upload state management
├── pages/Dashboard/components/MyListings/MyListingDashboard/Tabs/Documents/
│   ├── Documents.js              # Main documents component (updated)
│   ├── Documents.css             # Styles (updated)
│   └── components/UploadDocuments/
│       ├── UploadDocumentsLogic.js    # Upload logic (updated)
│       ├── UploadProgressModal.js     # Progress modal (updated)
│       └── UploadProgressModal.css    # Progress modal styles (updated)
```

## State Management

### Upload State Structure
```javascript
{
  currentFile: 1,
  totalFiles: 5,
  currentFileName: "document.pdf",
  processingMessage: "Processing document.pdf for AI search...",
  status: "uploading", // "uploading" | "completed" | "failed"
  error: null,
  startTime: 1640995200000,
  lastUpdated: 1640995210000,
  documentIds: ["id1", "id2", "id3"]
}
```

### Context Methods
- **`startUpload(listingId, data)`**: Initialize upload state
- **`updateUploadProgress(listingId, data)`**: Update progress without changing status
- **`completeUpload(listingId, result)`**: Mark upload as completed
- **`failUpload(listingId, error)`**: Mark upload as failed
- **`hasActiveUpload(listingId)`**: Check if upload is in progress
- **`getUploadState(listingId)`**: Get current upload state
- **`clearUpload(listingId)`**: Remove upload state

## Benefits

### For Users
- **No waiting**: Can continue working while uploads process
- **Better UX**: No blocked interface during long uploads
- **Clear feedback**: Always know upload status
- **No lost work**: Uploads continue even if modal is closed

### For Developers
- **Better architecture**: Centralized upload state management
- **Easier debugging**: Clear state tracking and logging
- **Extensible**: Easy to add more upload features
- **Reliable**: Uploads don't fail due to UI interactions

### For Operations
- **Reduced support tickets**: Users don't get stuck waiting
- **Better performance**: Users can work while processing happens
- **Clear monitoring**: Upload states are easily trackable

## Future Enhancements

1. **Multiple uploads**: Support for multiple concurrent uploads
2. **Upload queue**: Queue system for managing multiple uploads
3. **Resume uploads**: Ability to resume failed uploads
4. **Upload history**: Track and display upload history
5. **Background retry**: Automatic retry for failed uploads
6. **Upload scheduling**: Schedule uploads for off-peak hours

## Error Handling

### Upload Failures
- **Network errors**: Upload state marked as failed
- **Processing errors**: AI processing fails but document uploads succeed
- **Timeout errors**: Operations timeout but don't block UI
- **User feedback**: Clear error messages in notifications

### State Recovery
- **Page refresh**: Upload state persists in context
- **Navigation**: Uploads continue across page changes
- **Browser close**: Uploads may be lost (future: localStorage persistence)

## Monitoring and Debugging

### Console Logging
- **Upload start**: "Starting upload for listing X"
- **Progress updates**: "Upload progress: 3/5 files"
- **Completion**: "Upload completed: 5 documents processed"
- **Errors**: "Upload failed: Network error"

### State Inspection
```javascript
// In browser console
const uploadContext = document.querySelector('[data-upload-context]');
console.log(uploadContext.state);
```

### Performance Metrics
- **Upload duration**: Time from start to completion
- **Processing time**: Time spent on AI processing
- **Success rate**: Percentage of successful uploads
- **Error frequency**: Common failure types
