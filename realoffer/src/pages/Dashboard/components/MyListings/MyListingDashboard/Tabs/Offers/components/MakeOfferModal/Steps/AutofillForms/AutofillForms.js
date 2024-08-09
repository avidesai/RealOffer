import React, { useState, useEffect } from 'react';
import { PDFDocument } from 'pdf-lib';
import download from 'downloadjs';
import axios from 'axios';
import './AutoFillForms.css';

const AutoFillForms = ({ formData, listingId, handlePrevStep, handleNextStep }) => {
  const [selectedForm, setSelectedForm] = useState('');
  const [loading, setLoading] = useState(false);
  const [listingData, setListingData] = useState({});
  const [agentData, setAgentData] = useState({});

  useEffect(() => {
    // Fetch property listing data when the component mounts
    const fetchListingData = async () => {
      try {
        const response = await axios.get(`http://localhost:8000/api/propertyListings/${listingId}`);
        setListingData(response.data);

        // Assuming the first agent is the main agent
        const agentId = response.data.agentIds[0];
        if (agentId) {
          const agentResponse = await axios.get(`http://localhost:8000/api/users/${agentId}`);
          setAgentData(agentResponse.data);
        }
      } catch (error) {
        console.error('Error fetching listing or agent data:', error);
      }
    };

    fetchListingData();
  }, [listingId]);

  const handleFormSelect = (e) => {
    setSelectedForm(e.target.value);
  };

  const fillPDF = async () => {
    setLoading(true);
    try {
      // Fetch the PDF from the local documents folder
      const url = '/CAR_RPA.pdf'; // Ensure this URL correctly points to the local PDF file
      const existingPdfBytes = await fetch(url).then((res) => res.arrayBuffer());

      // Load a PDFDocument from the existing PDF bytes
      const pdfDoc = await PDFDocument.load(existingPdfBytes);

      // Get the form object from the PDF
      const form = pdfDoc.getForm();

      // Map the form data, listing data, and agent data to PDF fields
      const fieldMappings = {
        PurchasePrice: formData.purchasePrice,
        BuyerName: formData.buyerName,
        PropertyAddress: listingData.address,
        PropertyCity: listingData.city,
        PropertyCounty: listingData.county,
        PropertyZipCode: listingData.zip,
        PropertyAPN: listingData.apn,
        DatePrepared: new Date().toLocaleDateString(), // Current date
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
        PurchasePriceTotal: formData.purchasePrice, // Assuming it's the same as purchasePrice
        COEDays: formData.closeOfEscrow,
      };

      // Fill the PDF fields with data from formData, listingData, and agentData
      for (const [key, value] of Object.entries(fieldMappings)) {
        const pdfField = form.getTextField(key);
        if (pdfField) {
          pdfField.setText(value || '');
        }
      }

      // Handle the checkbox field
      if (formData.financeType === 'CASH') {
        const cashOfferField = form.getCheckBox('CBCashOffer');
        if (cashOfferField) {
          cashOfferField.check();
        }
      }

      // Serialize the PDFDocument to bytes (a Uint8Array)
      const pdfBytes = await pdfDoc.save();

      // Trigger the download of the filled PDF
      download(pdfBytes, 'FilledPurchaseContract.pdf', 'application/pdf');
    } catch (error) {
      console.error('Error filling PDF:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (selectedForm === 'CAR_Purchase_Contract') {
      fillPDF();
    }
  };

  return (
    <div className="modal-step">
      <div className='offer-modal-header'>
        <h2>Generate Purchase Contract</h2>
        <p>Create an auto-filled purchase contract for your offer.</p>
      </div>
      <div className="form-group">
        <label htmlFor="form-select">Choose Form:</label>
        <select
          id="form-select"
          value={selectedForm}
          onChange={handleFormSelect}
          className="form-select"
        >
          <option value="">Select a form</option>
          <option value="CAR_Purchase_Contract">CAR Purchase Contract</option>
          {/* Add more options here if needed */}
        </select>
      </div>
      <div className="form-group">
        <button className="download-button" onClick={handleDownload} disabled={loading || !selectedForm}>
          {loading ? 'Generating...' : 'Download Filled Contract'}
        </button>
      </div>
      <div className="button-container">
        <button className="step-back-button" onClick={handlePrevStep}>Back</button>
        <button className="next-button" onClick={handleNextStep}>Next</button>
      </div>
    </div>
  );
};

export default AutoFillForms;
