import React from 'react';

const PropertyPhotos = ({ handleFileChange, handleSubmit, handlePrevStep, loading }) => (
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
      <button className="next-button" onClick={handleSubmit} disabled={loading}>
        Create Package
      </button>
    </div>
  </div>
);

export default PropertyPhotos;
