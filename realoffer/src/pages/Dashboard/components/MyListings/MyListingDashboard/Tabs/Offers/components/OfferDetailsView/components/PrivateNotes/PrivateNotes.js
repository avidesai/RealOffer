import React from 'react';
import './PrivateNotes.css';

const PrivateNotes = ({ notes, handleNotesChange, handleNotesBlur }) => (
  <div className="listing-team-notes">
    <h2 className="section-title">Private Notes</h2>
    <div className="listing-team-notes-content">
      <textarea
        value={notes}
        placeholder="Write a private note for your team..."
        onChange={handleNotesChange}
        onBlur={handleNotesBlur}
      />
    </div>
  </div>
);

export default PrivateNotes;
