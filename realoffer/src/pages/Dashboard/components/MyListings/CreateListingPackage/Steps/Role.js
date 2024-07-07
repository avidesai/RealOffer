// /CreateListingPackage/Steps/Role.js

import React from 'react';

const Role = ({ formData, errors, handleChange, handleNextStep }) => (
  <div className="create-package-step">
    <h2>Role</h2>
    <div className='radio-buttons-container'>
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
      {errors.role && <div className="error">{errors.role}</div>}
    </div>
    <div className='button-container'>
      <button className="next-button" onClick={handleNextStep}>Next</button>
    </div>
  </div>
);

export default Role;
