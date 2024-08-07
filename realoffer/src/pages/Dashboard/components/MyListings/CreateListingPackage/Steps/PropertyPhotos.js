// /CreateListingPackage/Steps/PropertyPhotos.js

import React from 'react';

const PropertyPhotos = ({ handleFileChange, handleSubmit, handlePrevStep, loading }) => (
  <div className="clp-step">
    <h2>Property Photos (Optional)</h2>
    <input
      type="file"
      name="propertyImages"
      multiple
      onChange={handleFileChange}
      className="clp-input"
    />
    <div className='clp-button-container'>
      <button className="clp-back-button" onClick={handlePrevStep}>Back</button>
      <button className="clp-next-button" onClick={handleSubmit} disabled={loading}>
        Create Package
      </button>
    </div>
  </div>
);

export default PropertyPhotos;
