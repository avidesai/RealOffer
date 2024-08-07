// /CreateListingPackage/Steps/Role.js

import React from 'react';

const Role = ({ formData, errors, handleChange, handleNextStep }) => (
  <div className="clp-step">
    <h2>Role</h2>
    <div className='clp-radio-buttons-container'>
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
      {errors.role && <div className="clp-error">{errors.role}</div>}
    </div>
    <div className='clp-button-container'>
      <button className="clp-next-button" onClick={handleNextStep}>Next</button>
    </div>
  </div>
);

export default Role;
