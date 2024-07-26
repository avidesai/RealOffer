// PrivateNotes.js

import React from 'react';
import './PrivateNotes.css';

const PrivateNotes = ({ notes, handleNotesChange, handleNotesBlur }) => (
  <div className="private-notes-section">
    <h2 className="section-title">Private Notes</h2>
    <div className="private-notes-content">
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
