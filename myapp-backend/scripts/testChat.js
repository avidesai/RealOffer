const axios = require('axios');

const testChat = async () => {
  try {
    console.log('Testing chat functionality...');
    
    // You'll need to replace these with actual values from your database
    const testPropertyId = 'your_test_property_id'; // Replace with actual property ID
    const testToken = 'your_test_token'; // Replace with actual JWT token
    
    const response = await axios.post('http://localhost:8000/api/chat/property', {
      propertyId: testPropertyId,
      message: 'How old is the roof?'
    }, {
      headers: {
        'Authorization': `Bearer ${testToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Chat response:', response.data);
  } catch (error) {
    console.error('Chat test failed:', error.response?.data || error.message);
  }
};

// Only run if called directly
if (require.main === module) {
  testChat();
}

module.exports = { testChat }; 