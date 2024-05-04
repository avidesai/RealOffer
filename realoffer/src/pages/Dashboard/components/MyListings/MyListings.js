// MyListings.js

import React, {useState} from 'react';
import ListingItem from './components/ListingItem';
import ListingFilterSortBar from './components/ListingFilterSortBar';
import Pagination from './components/Pagination';
import './MyListings.css';

import house1 from './images/house1.jpeg';
import house2 from './images/house2.jpeg';
import house3 from './images/house3.jpeg';
import house4 from './images/house4.jpeg';
import agent1 from './images/agent1.jpg'; // Placeholder image path for agent 1
import agent2 from './images/agent2.jpg'; // Placeholder image path for agent 2
import agent3 from './images/agent3.jpg'; // Placeholder image path for agent 3

function MyListings() {
  // Constants for pagination
  const LISTINGS_PER_PAGE = 5;
  const [currentPage, setCurrentPage] = useState(1);

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
      address: '1234 New Street',
      city: 'Palo Alto',
      state: 'CA',
      zip: '94301',
      imageUrl: house1,
      agents: [agent2, agent3], // Include agent images
      isNew: true,
    },
    {
      id: 5,
      address: '5678 Old Avenue',
      city: 'Mountain View',
      state: 'CA',
      zip: '94040',
      imageUrl: house2,
      agents: [agent1, agent2], // Include agent images
      isNew: false,
    },
    {
      id: 6,
      address: '9101 Fresh Boulevard',
      city: 'Santa Clara',
      state: 'CA',
      zip: '95050',
      imageUrl: house3,
      agents: [agent1, agent3], // Include agent images
      isNew: true,
    },
    {
      id: 7,
      address: '1213 Vintage Lane',
      city: 'Cupertino',
      state: 'CA',
      zip: '95014',
      imageUrl: house4,
      agents: [agent2], // Include agent images
      isNew: false,
    },
  ];

  const pageCount = Math.ceil(listings.length / LISTINGS_PER_PAGE);

  // Get the listings for the current page
  const startIndex = (currentPage - 1) * LISTINGS_PER_PAGE;
  const currentListings = listings.slice(startIndex, startIndex + LISTINGS_PER_PAGE);
  
  // New state for controlling opacity
  const [fade, setFade] = useState(true);

  // Change page handler
  const handlePageChange = (newPage) => {
    // Fade out the listings
    setFade(false);

    // Delay page change to allow fade effect
    setTimeout(() => {
      setCurrentPage(newPage);
      // Fade in the listings
      setFade(true);
    }, 100); // This should match the transition time in the CSS
  };

  return (
    <div className="my-listings">
      <div className="create-property-package">
        <button className="create-package-button">Create Property Package</button>
      </div>
      <ListingFilterSortBar />
      <div className={`listings-container ${fade ? 'fade-in' : 'fade-out'}`}>
        {currentListings.map(listing => (
          <ListingItem key={listing.id} listing={listing} />
        ))}
      </div>
        {pageCount > 1 && (
          <Pagination
            currentPage={currentPage}
            pageCount={pageCount}
            onPageChange={handlePageChange}
          />
        )}
    </div>
  );
}

export default MyListings;
