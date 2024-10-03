// AutoFillFormsLogic.js

import { useState, useEffect, useCallback } from 'react';
import { PDFDocument } from 'pdf-lib';
import axios from 'axios';
import { useOffer } from '../../../../../../../../../../context/OfferContext';
import { useAuth } from '../../../../../../../../../../context/AuthContext';

const useAutoFillFormsLogic = ({ formData, listingId }) => {
  const { replaceDocument } = useOffer();
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [listingData, setListingData] = useState({});
  const [agentData, setAgentData] = useState({});
  const [error, setError] = useState(null);

  const fetchListingData = useCallback(async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/propertyListings/${listingId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setListingData(response.data);

      const agentId = response.data.agentIds[0];
      if (agentId) {
        const agentResponse = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/users/${agentId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setAgentData(agentResponse.data);
      }
    } catch (error) {
      console.error('Error fetching listing or agent data:', error);
      setError('Failed to fetch listing data. Please try again.');
    }
  }, [listingId, token]);

  useEffect(() => {
    if (token) {
      fetchListingData();
    }
  }, [fetchListingData, token]);

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

  const handleIncludeAndUpload = useCallback(async () => {
    try {
      const pdfBytes = await fillPDF();
      const formDataToSend = new FormData();
      formDataToSend.append('documents', new Blob([pdfBytes], { type: 'application/pdf' }), 'ResidentialPurchaseAgreement.pdf');
      formDataToSend.append('type', 'Purchase Agreement');
      formDataToSend.append('title', 'Buyer Purchase Agreement');
      formDataToSend.append('purpose', 'offer');
      formDataToSend.append('uploadedBy', user._id);
      formDataToSend.append('propertyListingId', listingId);

      const response = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/documents`, formDataToSend, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const uploadedDocument = {
        id: response.data[0]._id,
        title: 'Buyer Purchase Agreement',
        type: 'Purchase Agreement',
        file: { name: 'ResidentialPurchaseAgreement.pdf', size: pdfBytes.length },
      };

      replaceDocument(uploadedDocument);
    } catch (error) {
      setError('Failed to include and upload PDF. Please try again.');
    }
  }, [fillPDF, user._id, listingId, replaceDocument, token]);

  return {
    loading,
    error,
    handleIncludeAndUpload,
  };
};

export default useAutoFillFormsLogic;
