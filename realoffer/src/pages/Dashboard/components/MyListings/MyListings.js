// MyListings.js

import React from 'react';
import ListingItem from './ListingItem';
import ListingFilterSortBar from './ListingFilterSortBar';
import './MyListings.css';

import house1 from './images/house1.jpeg';
import house2 from './images/house2.jpeg';
import house3 from './images/house3.jpeg';
import house4 from './images/house4.jpeg';
import agent1 from './images/agent1.jpg'; // Placeholder image path for agent 1
import agent2 from './images/agent2.jpg'; // Placeholder image path for agent 2
import agent3 from './images/agent3.jpg'; // Placeholder image path for agent 3

function MyListings() {
  const listings = [
    {
      id: 1,
      address: '929 East El Camino Real #438h',
      city: 'Sunnyvale',
      state: 'CA',
      zip: '94087',
      imageUrl: house1,
      agents: [agent1, agent2], // Include agent images
      isNew: false,
    },
    {
      id: 2,
      address: '7231 Eagle Ridge Drive',
      city: 'Gilroy',
      state: 'CA',
      zip: '95020',
      imageUrl: house2,
      agents: [agent2, agent3], // Include agent images
      isNew: true,
    },
    {
      id: 3,
      address: '3214 Lakebrook Court',
      city: 'San Jose',
      state: 'CA',
      zip: '95148',
      imageUrl: house3,
      agents: [agent1, agent3], // Include agent images
      isNew: false,
    },
    {
      id: 4,
      address: '5357 Cribari Dell',
      city: 'San Jose',
      state: 'CA',
      zip: '95135',
      imageUrl: house4,
      agents: [agent1], // Include agent images
      isNew: true,
    },
    // ... More fake listings
  ];

  return (
    <div className="my-listings">
      <div className="create-property-package">
        <button className="create-package-button">Create Property Package</button>
      </div>
      <ListingFilterSortBar />
      {listings.map(listing => (
        <ListingItem key={listing.id} listing={listing} />
      ))}
    </div>
  );
}

export default MyListings;
