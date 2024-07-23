import React from 'react';

const AgentInformation = ({ formData, handleNestedChange, handleNextStep, handlePrevStep }) => (
  <div className="modal-step">
    <div className='offer-modal-header'>
      <h2>Agent Information</h2>
      <p>Provide contact and brokerage info for the Buyer Agent.</p>
    </div>
    <div className="form-group">
      <label>Presented By</label>
      <input
        type="text"
        name="name"
        placeholder="Name"
        value={formData.presentedBy.name}
        onChange={(e) => handleNestedChange(e, 'presentedBy')}
      />
      <input
        type="text"
        name="licenseNumber"
        placeholder="License Number"
        value={formData.presentedBy.licenseNumber}
        onChange={(e) => handleNestedChange(e, 'presentedBy')}
      />
      <input
        type="email"
        name="email"
        placeholder="Email"
        value={formData.presentedBy.email}
        onChange={(e) => handleNestedChange(e, 'presentedBy')}
      />
      <input
        type="text"
        name="phoneNumber"
        placeholder="Phone Number"
        value={formData.presentedBy.phoneNumber}
        onChange={(e) => handleNestedChange(e, 'presentedBy')}
      />
    </div>
    <div className="form-group">
      <label>Brokerage Info</label>
      <input
        type="text"
        name="name"
        placeholder="Brokerage Name"
        value={formData.brokerageInfo.name}
        onChange={(e) => handleNestedChange(e, 'brokerageInfo')}
      />
      <input
        type="text"
        name="licenseNumber"
        placeholder="Brokerage License Number"
        value={formData.brokerageInfo.licenseNumber}
        onChange={(e) => handleNestedChange(e, 'brokerageInfo')}
      />
      <input
        type="text"
        name="addressLine1"
        placeholder="Address Line 1"
        value={formData.brokerageInfo.addressLine1}
        onChange={(e) => handleNestedChange(e, 'brokerageInfo')}
      />
      <input
        type="text"
        name="addressLine2"
        placeholder="Address Line 2"
        value={formData.brokerageInfo.addressLine2}
        onChange={(e) => handleNestedChange(e, 'brokerageInfo')}
      />
      <input
        type="file"
        name="brokerageLogo"
        onChange={(e) => handleNestedChange(e, 'brokerageInfo')}
      />
    </div>
    <div className="button-container">
      <button className="step-back-button" onClick={handlePrevStep}>
        Back
      </button>
      <button className="next-button" onClick={handleNextStep}>
        Next
      </button>
    </div>
  </div>
);

export default AgentInformation;
