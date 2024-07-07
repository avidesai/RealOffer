// /CreateListingPackage/Steps/PropertyPhotos.js

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
      <button className="step-back-button" onClick={handlePrevStep}>Back</button>
      <button className="next-button" onClick={handleSubmit} disabled={loading}>
        {loading ? (
          <div className="spinner-container">
            <div className="spinner"></div>
          </div>
        ) : (
          'Create Package'
        )}
      </button>
    </div>
  </div>
);

export default PropertyPhotos;
