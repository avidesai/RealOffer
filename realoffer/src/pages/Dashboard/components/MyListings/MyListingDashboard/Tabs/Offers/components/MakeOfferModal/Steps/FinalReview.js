import React from 'react';

const FinalReview = ({ formData, handlePrevStep, handleSubmit }) => (
  <div className="modal-step">
    <h2>Final Review</h2>
    <p>Please confirm the following is correct.</p>
    <div className="summary-section">
      <div className="summary-item">
        <h3>Summary of Terms</h3>
        <p>Purchase Price: ${formData.purchasePrice}</p>
        <p>Initial Deposit: ${formData.initialDeposit}</p>
        <p>Finance Type: {formData.financeType}</p>
        <p>Loan Amount: ${formData.loanAmount}</p>
        <p>Submitted On: {formData.submittedOn}</p>
      </div>
      <div className="summary-item">
        <h3>Presented By</h3>
        <p>Name: {formData.presentedBy.name}</p>
        <p>License Number: {formData.presentedBy.licenseNumber}</p>
        <p>Email: {formData.presentedBy.email}</p>
        <p>Phone Number: {formData.presentedBy.phoneNumber}</p>
      </div>
      <div className="summary-item">
        <h3>Brokerage Info</h3>
        <p>Name: {formData.brokerageInfo.name}</p>
        <p>License Number: {formData.brokerageInfo.licenseNumber}</p>
        <p>Address Line 1: {formData.brokerageInfo.addressLine1}</p>
        <p>Address Line 2: {formData.brokerageInfo.addressLine2}</p>
      </div>
      <div className="summary-item">
        <h3>Documents</h3>
        {formData.documents.length === 0 ? (
          <p>No documents included.</p>
        ) : (
          <ul>
            {Array.from(formData.documents).map((doc, index) => (
              <li key={index}>{doc.name}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
    <div className="button-container">
      <button className="step-back-button" onClick={handlePrevStep}>
        Back
      </button>
      <button className="next-button" onClick={handleSubmit}>
        Add Offer
      </button>
    </div>
  </div>
);

export default FinalReview;
