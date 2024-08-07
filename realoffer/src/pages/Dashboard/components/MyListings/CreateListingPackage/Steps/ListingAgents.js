// /CreateListingPackage/Steps/ListingAgents.js

import React, { useEffect } from 'react';
import { useAuth } from '../../../../../../context/AuthContext';

const ListingAgents = ({ formData, errors, handleChange, handleNextStep, handlePrevStep }) => {
  const { user } = useAuth();

  useEffect(() => {
    if (user && !formData.agent1) {
      handleChange({
        target: {
          name: 'agent1',
          value: user._id,
        },
      });
    }
  }, [user, formData.agent1, handleChange]);

  return (
    <div className="clp-step">
      <h2>Listing Agents</h2>
      <select
        name="agent1"
        value={formData.agent1}
        onChange={handleChange}
        className="clp-select"
      >
        {user && (
          <option value={user._id}>
            {`${user.firstName} ${user.lastName}`}
          </option>
        )}
      </select>
      {errors.agent1 && <div className="clp-error">{errors.agent1}</div>}
      <div className='clp-button-container'>
        <button className="clp-back-button" onClick={handlePrevStep}>Back</button>
        <button className="clp-next-button" onClick={handleNextStep}>Next</button>
      </div>
    </div>
  );
};

export default ListingAgents;
