const axios = require('axios');
require('dotenv').config();

const testEnhancedChat = async () => {
  console.log('Testing Enhanced Chat API with Claude 3.5 Sonnet...');
  console.log('Note: This test requires a valid authentication token.');
  console.log('Please update the script with a valid token for testing.\n');
  
  try {
    const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/chat/enhanced/property/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_TOKEN_HERE' // Replace with actual token
      },
      body: JSON.stringify({
        propertyId: '507f1f77bcf86cd799439011', // Replace with actual property ID
        message: 'What is the condition of the roof?',
        conversationHistory: []
      })
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.log('❌ Authentication required. Please provide a valid token.');
        console.log('To test with a valid token:');
        console.log('1. Login to the application');
        console.log('2. Get the JWT token from localStorage');
        console.log('3. Update the script with the token');
      } else {
        console.error('❌ Error:', response.statusText);
      }
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ') && line.trim().length > 6) {
          try {
            const jsonStr = line.slice(6).trim();
            if (jsonStr) {
              const data = JSON.parse(jsonStr);

              if (data.type === 'content') {
                fullResponse += data.content;
                process.stdout.write(data.content); // Stream to console
              } else if (data.type === 'complete') {
                console.log('\n\n✅ Enhanced Chat response completed!');
                console.log('Model:', data.model);
                console.log('Processing Time:', data.processingTime, 'ms');
                console.log('Sources:', data.sources?.length || 0);
                console.log('Citations:', data.citations?.length || 0);
                console.log('Cached:', data.cached || false);
              } else if (data.type === 'error') {
                console.error('❌ Error:', data.error);
              }
            }
          } catch (parseError) {
            // Skip malformed JSON
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
};

const testPerformanceStats = async () => {
  console.log('\nTesting Performance Stats API...');
  console.log('Note: This test requires a valid authentication token.\n');
  
  try {
    const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/chat/enhanced/property/507f1f77bcf86cd799439011/stats`, {
      headers: {
        'Authorization': 'Bearer YOUR_TOKEN_HERE' // Replace with actual token
      }
    });
    
    console.log('✅ Performance stats received!');
    console.log('Performance:', response.data.performance);
    console.log('Token Usage:', response.data.tokenUsage);
    
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('❌ Authentication required. Please provide a valid token.');
    } else {
      console.error('❌ Error:', error.response?.data || error.message);
    }
  }
};

const testClearCache = async () => {
  console.log('\nTesting Clear Cache API...');
  console.log('Note: This test requires a valid authentication token.\n');
  
  try {
    const response = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/chat/enhanced/clear-cache`, {}, {
      headers: {
        'Authorization': 'Bearer YOUR_TOKEN_HERE' // Replace with actual token
      }
    });
    
    console.log('✅ Cache cleared successfully!');
    console.log('Response:', response.data.message);
    
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('❌ Authentication required. Please provide a valid token.');
    } else {
      console.error('❌ Error:', error.response?.data || error.message);
    }
  }
};

const runTests = async () => {
  console.log('🧪 Testing Enhanced Chat System\n');
  
  await testEnhancedChat();
  await testPerformanceStats();
  await testClearCache();
  
  console.log('\n🎉 All tests completed!');
};

// Run tests if called directly
if (require.main === module) {
  runTests();
} 