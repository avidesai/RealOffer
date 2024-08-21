import React, { createContext, useContext, useState, useEffect } from 'react';

const OfferContext = createContext();

export const useOffer = () => useContext(OfferContext);

export const OfferProvider = ({ children }) => {
  const [offerData, setOfferData] = useState(() => {
    const savedData = localStorage.getItem('offerData');
    return savedData ? JSON.parse(savedData) : {
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
      uploadedBy: ''
    };
  });

  useEffect(() => {
    localStorage.setItem('offerData', JSON.stringify(offerData));
  }, [offerData]);

  const updateOfferData = (newData) => {
    setOfferData(prevData => {
      const updatedData = { ...prevData, ...newData };
      localStorage.setItem('offerData', JSON.stringify(updatedData));
      return updatedData;
    });
  };

  return (
    <OfferContext.Provider value={{ offerData, updateOfferData }}>
      {children}
    </OfferContext.Provider>
  );
};