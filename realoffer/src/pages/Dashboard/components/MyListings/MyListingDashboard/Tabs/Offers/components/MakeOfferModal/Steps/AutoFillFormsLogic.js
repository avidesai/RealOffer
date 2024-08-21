// AutoFillFormsLogic.js

import { useState, useEffect, useCallback } from 'react';
import { PDFDocument } from 'pdf-lib';
import download from 'downloadjs';
import axios from 'axios';
import { useAuth } from '../../../../../../../../../../context/AuthContext';

const useAutoFillFormsLogic = ({ formData, listingId }) => {
  const [selectedForm, setSelectedForm] = useState('');
  const [loading, setLoading] = useState(false);
  const [listingData, setListingData] = useState({});
  const [agentData, setAgentData] = useState({});
  const { user } = useAuth();

  useEffect(() => {
    const fetchListingData = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/propertyListings/${listingId}`);
        setListingData(response.data);

        const agentId = response.data.agentIds[0];
        if (agentId) {
          const agentResponse = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/users/${agentId}`);
          setAgentData(agentResponse.data);
        }
      } catch (error) {
        console.error('Error fetching listing or agent data:', error);
      }
    };

    fetchListingData();
  }, [listingId]);

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
      throw error;
    } finally {
      setLoading(false);
    }
  }, [formData, listingData, agentData]);

  const handleDownload = useCallback(async () => {
    if (selectedForm === 'CAR_Purchase_Contract') {
      try {
        const pdfBytes = await fillPDF();
        download(pdfBytes, 'FilledPurchaseContract.pdf', 'application/pdf');
      } catch (error) {
        console.error('Error downloading PDF:', error);
      }
    }
  }, [selectedForm, fillPDF]);

  const handleIncludeAndUpload = useCallback(async () => {
    if (selectedForm === 'CAR_Purchase_Contract') {
      try {
        setLoading(true);
        const pdfBytes = await fillPDF();

        const formDataToSend = new FormData();
        formDataToSend.append('documents', new Blob([pdfBytes], { type: 'application/pdf' }), 'FilledPurchaseContract.pdf');
        formDataToSend.append('type[]', 'Purchase Agreement');
        formDataToSend.append('title[]', 'Filled Purchase Contract');
        formDataToSend.append('purpose', 'offer');
        formDataToSend.append('uploadedBy', user._id);
        formDataToSend.append('propertyListingId', listingId);

        const response = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/documents`, formDataToSend, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        console.log('Document uploaded:', response.data);
        
        // Format the uploaded document to match the format in Documents.js
        const uploadedDocument = {
          id: response.data._id,
          title: response.data.title,
          type: response.data.type,
          file: { name: response.data.title, size: response.data.size }
        };

        return uploadedDocument;
      } catch (error) {
        console.error('Error including and uploading PDF:', error);
        throw error;
      } finally {
        setLoading(false);
      }
    }
  }, [selectedForm, fillPDF, user._id, listingId]);

  return {
    selectedForm,
    loading,
    handleFormSelect,
    handleDownload,
    handleIncludeAndUpload,
  };
};

export default useAutoFillFormsLogic;