import React, { useState } from 'react';
import './CreateListingPackage.css';

const CreateListingPackage = ({ onClose }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    role: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    propertyType: '',
    askingPrice: '',
    bedrooms: '',
    bathrooms: '',
    yearBuilt: '',
    sqFootage: '',
    lotSize: '',
    description: '',
    agent1: '',
    agent2: '',
    companyName: '',
    officerName: '',
    officerPhone: '',
    officerEmail: '',
    officerNumber: '',
    propertyImages: [],
  });

  const handleNextStep = () => setStep(step + 1);
  const handlePrevStep = () => setStep(step - 1);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setFormData({ ...formData, propertyImages: e.target.files });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission
    console.log(formData);
    onClose(); // Close the modal after submission
  };

  return (
    <div className="create-package-modal">
      <div className="create-package-content">
        <button className="close-button" onClick={onClose}>X</button>
        <h1 className="create-package-title">Create Listing Package</h1>
        {step === 1 && (
          <div className="create-package-step">
            <h2>Role</h2>
            <label>
              <input
                type="radio"
                name="role"
                value="seller"
                checked={formData.role === 'seller'}
                onChange={handleChange}
              />
              I represent the Seller
            </label>
            <label>
              <input
                type="radio"
                name="role"
                value="buyer"
                checked={formData.role === 'buyer'}
                onChange={handleChange}
              />
              I represent the Buyer
            </label>
            <div className='button-container'>
              <button className="next-button" onClick={handleNextStep}>Next</button>
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="create-package-step">
            <h2>Address</h2>
            <input
              type="text"
              name="address"
              placeholder="Street Address"
              value={formData.address}
              onChange={handleChange}
            />
            <input
              type="text"
              name="city"
              placeholder="City"
              value={formData.city}
              onChange={handleChange}
            />
            <input
              type="text"
              name="state"
              placeholder="State"
              value={formData.state}
              onChange={handleChange}
            />
            <input
              type="text"
              name="zip"
              placeholder="Zip"
              value={formData.zip}
              onChange={handleChange}
            />
            <div className='button-container'>
              <button className="back-button" onClick={handlePrevStep}>Back</button>
              <button className="next-button" onClick={handleNextStep}>Next</button>
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="create-package-step">
            <h2>Property Features</h2>
            <input
              type="text"
              name="propertyType"
              placeholder="Property Type"
              value={formData.propertyType}
              onChange={handleChange}
            />
            <input
              type="text"
              name="askingPrice"
              placeholder="Asking Price"
              value={formData.askingPrice}
              onChange={handleChange}
            />
            <input
              type="text"
              name="bedrooms"
              placeholder="Bedrooms"
              value={formData.bedrooms}
              onChange={handleChange}
            />
            <input
              type="text"
              name="bathrooms"
              placeholder="Bathrooms"
              value={formData.bathrooms}
              onChange={handleChange}
            />
            <input
              type="text"
              name="yearBuilt"
              placeholder="Year Built"
              value={formData.yearBuilt}
              onChange={handleChange}
            />
            <input
              type="text"
              name="sqFootage"
              placeholder="Square Footage"
              value={formData.sqFootage}
              onChange={handleChange}
            />
            <input
              type="text"
              name="lotSize"
              placeholder="Lot Size"
              value={formData.lotSize}
              onChange={handleChange}
            />
            <textarea
              name="description"
              placeholder="Description"
              value={formData.description}
              onChange={handleChange}
            />
            <div className='button-container'>
              <button className="back-button" onClick={handlePrevStep}>Back</button>
              <button className="next-button" onClick={handleNextStep}>Next</button>
            </div>
          </div>
        )}
        {step === 4 && (
          <div className="create-package-step">
            <h2>Listing Agents</h2>
            <input
              type="text"
              name="agent1"
              placeholder="Agent 1"
              value={formData.agent1}
              onChange={handleChange}
            />
            <input
              type="text"
              name="agent2"
              placeholder="Agent 2"
              value={formData.agent2}
              onChange={handleChange}
            />
            <div className='button-container'>
              <button className="back-button" onClick={handlePrevStep}>Back</button>
              <button className="next-button" onClick={handleNextStep}>Next</button>
            </div>
          </div>
        )}
        {step === 5 && (
          <div className="create-package-step">
            <h2>Escrow</h2>
            <input
              type="text"
              name="companyName"
              placeholder="Company Name"
              value={formData.companyName}
              onChange={handleChange}
            />
            <input
              type="text"
              name="officerName"
              placeholder="Escrow Officer Name"
              value={formData.officerName}
              onChange={handleChange}
            />
            <input
              type="text"
              name="officerPhone"
              placeholder="Escrow Officer Phone"
              value={formData.officerPhone}
              onChange={handleChange}
            />
            <input
              type="text"
              name="officerEmail"
              placeholder="Escrow Officer Email"
              value={formData.officerEmail}
              onChange={handleChange}
            />
            <input
              type="text"
              name="officerNumber"
              placeholder="Escrow Number (Optional)"
              value={formData.officerNumber}
              onChange={handleChange}
            />
            <div className='button-container'>
              <button className="back-button" onClick={handlePrevStep}>Back</button>
              <button className="next-button" onClick={handleNextStep}>Next</button>
            </div>
          </div>
        )}
        {step === 6 && (
          <div className="create-package-step">
            <h2>Property Photos (Optional)</h2>
            <input
              type="file"
              name="propertyImages"
              multiple
              onChange={handleFileChange}
            />
            <div className='button-container'>
              <button className="back-button" onClick={handlePrevStep}>Back</button>
              <button className="next-button" onClick={handleSubmit}>Create Package</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateListingPackage;
