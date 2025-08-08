# RPA Upload Feature

## Overview

The RPA (Residential Purchase Agreement) Upload feature allows users to upload their completed California RPA PDF documents and automatically pre-fill the offer form with extracted data using Azure Document Intelligence.

## How It Works

### Frontend (React)
1. **Upload RPA Step**: New first step in the MakeOfferModal that allows users to upload PDF files
2. **File Validation**: Validates file type (PDF only) and size (max 50MB)
3. **Document Upload**: Uploads the RPA document to Azure Blob Storage via the existing document upload endpoint
4. **Analysis Request**: Calls the new RPA analysis endpoint to extract form fields
5. **Form Pre-filling**: Updates the offer context with extracted data and shows success feedback
6. **Auto-advance**: Automatically proceeds to the next step after successful analysis

### Backend (Node.js)
1. **RPA Analysis Controller**: New controller (`RPAAnalysisController.js`) that handles RPA document analysis
2. **Azure Document Intelligence**: Uses Azure's Form Recognizer service to extract form fields and checkbox states
3. **Field Mapping**: Maps extracted RPA fields to offer data fields using a comprehensive mapping system
4. **Data Processing**: Handles numeric values, percentages, dates, and contingency information
5. **Error Handling**: Robust error handling for various failure scenarios

## Field Mapping

The system maps RPA form fields to offer data fields:

### Financial Terms
- `purchase_price` → `purchasePrice`
- `initial_deposit` → `initialDeposit`
- `initial_deposit_percent` → `initialDepositPercent`
- `loan_amount` → `loanAmount`
- `down_payment` → `downPayment`
- `down_payment_percent` → `downPaymentPercent`
- `balance_of_down_payment` → `balanceOfDownPayment`
- `buyer_agent_commission` → `buyersAgentCommission`

### Contingencies
- `finance_contingency` → `financeContingency`
- `finance_contingency_days` → `financeContingencyDays`
- `appraisal_contingency` → `appraisalContingency`
- `appraisal_contingency_days` → `appraisalContingencyDays`
- `inspection_contingency` → `inspectionContingency`
- `inspection_contingency_days` → `inspectionContingencyDays`
- `home_sale_contingency` → `homeSaleContingency`
- `seller_rent_back` → `sellerRentBack`
- `seller_rent_back_days` → `sellerRentBackDays`

### Dates
- `close_of_escrow` → `closeOfEscrow`
- `offer_expiry_date` → `offerExpiryDate`

### Buyer Information
- `buyer_name` → `buyerName`

### Agent Information
- `agent_name` → `presentedBy.name`
- `agent_license` → `presentedBy.licenseNumber`
- `agent_email` → `presentedBy.email`
- `agent_phone` → `presentedBy.phoneNumber`
- `brokerage_name` → `brokerageInfo.name`
- `brokerage_license` → `brokerageInfo.licenseNumber`
- `brokerage_address1` → `brokerageInfo.addressLine1`
- `brokerage_address2` → `brokerageInfo.addressLine2`

### Special Terms
- `special_terms` → `specialTerms`
- `buyer_message` → `buyersAgentMessage`

## API Endpoints

### POST `/api/documents/analyze-rpa`
Analyzes an uploaded RPA document using Azure Document Intelligence.

**Request Body:**
```json
{
  "documentId": "document_id_here"
}
```

**Response:**
```json
{
  "success": true,
  "mappedData": {
    "purchasePrice": "500000",
    "initialDeposit": "15000",
    "financeType": "LOAN",
    // ... other extracted fields
  },
  "extractedFields": [...],
  "message": "RPA document analyzed successfully"
}
```

## Environment Variables Required

Add these to your backend `.env` file:

```
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
AZURE_DOCUMENT_INTELLIGENCE_KEY=your_azure_key_here
```

## Dependencies Added

- `form-data`: For handling multipart form data in Azure Document Intelligence requests

## Files Created/Modified

### Backend
- `myapp-backend/controllers/RPAAnalysisController.js` (new)
- `myapp-backend/routes/documents.js` (modified - added RPA analysis route)
- `myapp-backend/package.json` (modified - added form-data dependency)

### Frontend
- `realoffer/src/pages/Dashboard/components/MyListings/MyListingDashboard/Tabs/Offers/components/MakeOfferModal/Steps/UploadRPA.js` (new)
- `realoffer/src/pages/Dashboard/components/MyListings/MyListingDashboard/Tabs/Offers/components/MakeOfferModal/Steps/UploadRPA.css` (new)
- `realoffer/src/pages/Dashboard/components/MyListings/MyListingDashboard/Tabs/Offers/components/MakeOfferModal/MakeOfferModal.js` (modified)
- `realoffer/src/pages/Dashboard/components/ForBuyers/BuyerPackageDashboard/Tabs/BuyerPackageOffers/components/MakeOfferModal/Steps/UploadRPA.js` (new)
- `realoffer/src/pages/Dashboard/components/ForBuyers/BuyerPackageDashboard/Tabs/BuyerPackageOffers/components/MakeOfferModal/Steps/UploadRPA.css` (new)
- `realoffer/src/pages/Dashboard/components/ForBuyers/BuyerPackageDashboard/Tabs/BuyerPackageOffers/components/MakeOfferModal/MakeOfferModal.js` (modified)
- `realoffer/src/utils/offerValidation.js` (modified - updated step numbering)

## User Experience

1. **Upload**: User drags and drops or selects a PDF file
2. **Validation**: System validates file type and size
3. **Analysis**: Shows progress spinner during AI analysis
4. **Success**: Displays extracted fields and auto-advances to next step
5. **Skip Option**: Users can skip RPA upload and proceed manually

## Error Handling

- File type validation (PDF only)
- File size validation (max 50MB)
- Azure Document Intelligence errors
- Network timeout handling
- Authentication errors
- Rate limiting

## Future Enhancements

- Support for other state-specific purchase agreements
- Enhanced field mapping for different RPA versions
- Batch processing for multiple documents
- Confidence scoring for extracted fields
- Manual field correction interface 