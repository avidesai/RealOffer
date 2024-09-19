// AutoFillFormsLogic.js

import { useState, useEffect, useCallback } from 'react';
import { PDFDocument } from 'pdf-lib';
import download from 'downloadjs';
import axios from 'axios';
import { useOffer } from '../../../../../../../../../../context/OfferContext';
import { useAuth } from '../../../../../../../../../../context/AuthContext';

const useAutoFillFormsLogic = ({ formData, listingId }) => {
  const { replaceDocument } = useOffer();
  const { user, token } = useAuth(); // Get the token from AuthContext
  const [selectedForm, setSelectedForm] = useState('');
  const [loading, setLoading] = useState(false);
  const [listingData, setListingData] = useState({});
  const [agentData, setAgentData] = useState({});
  const [error, setError] = useState(null);

  const fetchListingData = useCallback(async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/propertyListings/${listingId}`, {
        headers: {
          'Authorization': `Bearer ${token}` // Include the token in the request headers
        }
      });
      setListingData(response.data);

      const agentId = response.data.agentIds[0];
      if (agentId) {
        const agentResponse = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/users/${agentId}`, {
          headers: {
            'Authorization': `Bearer ${token}` // Include the token in the request headers
          }
        });
        setAgentData(agentResponse.data);
      }
    } catch (error) {
      console.error('Error fetching listing or agent data:', error);
      setError('Failed to fetch listing data. Please try again.');
    }
  }, [listingId, token]);

  useEffect(() => {
    if (token) { // Only fetch data if the token is available
      fetchListingData();
    }
  }, [fetchListingData, token]);

  const handleFormSelect = useCallback((e) => {
    setSelectedForm(e.target.value);
  }, []);

  const fillPDF = useCallback(async () => {
    setLoading(true);
    try {
      const url = '/CAR_RPA.pdf';
      const existingPdfBytes = await fetch(url).then((res) => res.arrayBuffer());
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const form = pdfDoc.getForm();

      const fieldMappings = {
        PurchasePrice: formData.purchasePrice,
        BuyerName: formData.buyerName,
        PropertyAddress: listingData.address,
        PropertyCity: listingData.city,
        PropertyCounty: listingData.county,
        PropertyZipCode: listingData.zip,
        PropertyAPN: listingData.apn,
        DatePrepared: new Date().toLocaleDateString(),
        SellersBrokerageFirm: agentData.agencyName,
        SellersAgent: `${agentData.firstName} ${agentData.lastName}`,
        BuyersBrokerageFirm: formData.brokerageInfo.name,
        BuyersAgent: formData.presentedBy.name,
        SellersBrokerageLicense: agentData.brokerageLicenseNumber,
        SellersAgentLicense: agentData.agentLicenseNumber,
        BuyersBrokerageLicense: formData.brokerageInfo.licenseNumber,
        BuyersAgentLicense: formData.presentedBy.licenseNumber,
        OfferExpirationDate: formData.offerExpiryDate,
        DepositAmount: formData.initialDeposit,
        LoanAmount: formData.loanAmount,
        BalanceOfDownPayment: formData.balanceOfDownPayment,
        PurchasePriceTotal: formData.purchasePrice,
        COEDays: formData.closeOfEscrow,
      };

      for (const [key, value] of Object.entries(fieldMappings)) {
        const pdfField = form.getTextField(key);
        if (pdfField) {
          pdfField.setText(value || '');
        }
      }

      if (formData.financeType === 'CASH') {
        const cashOfferField = form.getCheckBox('CBCashOffer');
        if (cashOfferField) {
          cashOfferField.check();
        }
      }

      const pdfBytes = await pdfDoc.save();
      return pdfBytes;
    } catch (error) {
      console.error('Error filling PDF:', error);
      setError('Failed to fill PDF. Please try again.');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [formData, listingData, agentData]);

  const handleDownload = useCallback(async () => {
    if (selectedForm === 'CAR_Purchase_Contract') {
      try {
        const pdfBytes = await fillPDF();
        download(pdfBytes, 'ResidentialPurchaseAgreement.pdf', 'application/pdf');
      } catch (error) {
        console.error('Error downloading PDF:', error);
        setError('Failed to download PDF. Please try again.');
      }
    }
  }, [selectedForm, fillPDF]);

  const handleIncludeAndUpload = useCallback(async () => {
    if (selectedForm === 'CAR_Purchase_Contract') {
      try {
        // Fill the PDF with the provided data
        const pdfBytes = await fillPDF();
  
        // Create a new FormData object to send the PDF
        const formDataToSend = new FormData();
        formDataToSend.append('documents', new Blob([pdfBytes], { type: 'application/pdf' }), 'ResidentialPurchaseAgreement.pdf');
        formDataToSend.append('type', 'Purchase Agreement'); // Append type (not as an array, but single value)
        formDataToSend.append('title', 'Buyer Purchase Agreement'); // Append title
        formDataToSend.append('purpose', 'offer'); // Set the purpose to 'offer'
        formDataToSend.append('uploadedBy', user._id); // Attach user ID (uploadedBy)
        formDataToSend.append('propertyListingId', listingId); // Attach the property listing ID
  
        // Send the request to upload the document
        const response = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/documents`, formDataToSend, {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}` // Include the token in the request headers
          },
        });
  
        // Add the uploaded document to the offer data
        const uploadedDocument = {
          id: response.data[0]._id, // The document ID from the response
          title: 'Buyer Purchase Agreement', // The title of the document
          type: 'Purchase Agreement', // The type of document
          file: { name: 'ResidentialPurchaseAgreement.pdf', size: pdfBytes.length }, // File details
        };
  
        // Replace the document in the offer's state
        replaceDocument(uploadedDocument);
  
        // Clear any error state
        setError(null);
      } catch (error) {
        // Handle any errors that occur during the upload process
        console.error('Error including and uploading PDF:', error);
        setError(error.response?.data?.message || 'Failed to include and upload PDF. Please try again.');
      }
    }
  }, [selectedForm, fillPDF, user._id, listingId, replaceDocument, token]);
  
  return {
    selectedForm,
    loading,
    error,
    handleFormSelect,
    handleDownload,
    handleIncludeAndUpload,
  };
};

export default useAutoFillFormsLogic;
