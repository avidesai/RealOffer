// OfferContext.js

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const OfferContext = createContext();

export const useOffer = () => useContext(OfferContext);

const initialOfferState = {
  purchasePrice: '',
  initialDeposit: '',
  financeType: 'LOAN',
  loanAmount: '',
  percentDown: '',
  downPayment: '',
  balanceOfDownPayment: '',
  financeContingency: '',
  financeContingencyDays: '',
  appraisalContingency: '',
  appraisalContingencyDays: '',
  inspectionContingency: '',
  inspectionContingencyDays: '',
  homeSaleContingency: 'Waived',
  closeOfEscrow: '',
  submittedOn: new Date().toISOString(),
  specialTerms: '',
  buyersAgentMessage: '',
  sellerRentBack: '',
  sellerRentBackDays: '',
  buyerName: '',
  buyersAgentCommission: '',
  documents: [],
  propertyListing: '',
  offerExpiryDate: '',
  uploadedBy: '',
  presentedBy: {
    name: '',
    licenseNumber: '',
    email: '',
    phoneNumber: '',
    agentImageUrl: '',
    agentImageBackgroundColor: '',
  },
  brokerageInfo: {
    name: '',
    licenseNumber: '',
    addressLine1: '',
    addressLine2: '',
  }
};

export const OfferProvider = ({ children }) => {
  const [offerData, setOfferData] = useState(() => {
    const savedData = localStorage.getItem('offerData');
    return savedData ? { ...initialOfferState, ...JSON.parse(savedData) } : initialOfferState;
  });

  useEffect(() => {
    localStorage.setItem('offerData', JSON.stringify(offerData));
  }, [offerData]);

  const updateOfferData = useCallback((newData) => {
    setOfferData(prevData => {
      const updatedData = typeof newData === 'function' ? newData(prevData) : { ...prevData, ...newData };
      localStorage.setItem('offerData', JSON.stringify(updatedData));
      return updatedData;
    });
  }, []);

  const deleteDocument = useCallback((documentId) => {
    setOfferData(prevData => {
      const updatedDocuments = prevData.documents.filter(doc => doc.id !== documentId);
      const updatedData = { ...prevData, documents: updatedDocuments };
      localStorage.setItem('offerData', JSON.stringify(updatedData));
      return updatedData;
    });
  }, []);

  const replaceDocument = useCallback((newDocument) => {
    setOfferData(prevData => {
      // Filter out existing Signature Package or Purchase Agreement if they exist
      const filteredDocuments = prevData.documents.filter(
        doc => (doc.type !== 'Signature Package' && doc.type !== 'Purchase Agreement') || doc.id === newDocument.id
      );
  
      // Add the new document
      filteredDocuments.push(newDocument);
  
      const updatedData = { ...prevData, documents: filteredDocuments };
      localStorage.setItem('offerData', JSON.stringify(updatedData));
      return updatedData;
    });
  }, []);  

  return (
    <OfferContext.Provider value={{ offerData, updateOfferData, deleteDocument, replaceDocument }}>
      {children}
    </OfferContext.Provider>
  );
};
