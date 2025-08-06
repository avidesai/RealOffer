const axios = require('axios');
require('dotenv').config();

const testChat = async () => {
  console.log('Testing Chat API with Claude 3.5 Sonnet...');
  
  try {
    const response = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/chat/property`, {
      propertyId: '507f1f77bcf86cd799439011', // Replace with actual property ID
      message: 'What is the condition of the roof?',
      conversationHistory: []
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_TOKEN_HERE' // Replace with actual token
      }
    });
    
    console.log('✅ Chat response received!');
    console.log('Model:', response.data.model);
    console.log('Response:', response.data.response);
    console.log('Sources:', response.data.sources);
    console.log('Citations:', response.data.citations);
    console.log('Documents:', response.data.documents);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
};

const testStreamingChat = async () => {
  console.log('\nTesting Streaming Chat API...');
  
  try {
    const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/chat/property/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_TOKEN_HERE' // Replace with actual token
      },
      body: JSON.stringify({
        propertyId: '507f1f77bcf86cd799439011', // Replace with actual property ID
        message: 'What are the main features of this property?',
        conversationHistory: []
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';

    console.log('🔄 Streaming response:');
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            
            if (data.type === 'content') {
              process.stdout.write(data.content);
              fullResponse += data.content;
            } else if (data.type === 'complete') {
              console.log('\n\n✅ Streaming completed!');
              console.log('Full response:', data.response);
              console.log('Sources:', data.sources);
              return;
            } else if (data.error) {
              console.error('\n❌ Streaming error:', data.error);
              return;
            }
          } catch (e) {
            // Ignore parsing errors for incomplete chunks
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Streaming error:', error.message);
  }
};

const runTests = async () => {
  console.log('🚀 Starting AI Chat Tests with Claude 3.5 Sonnet\n');
  
  await testChat();
  await testStreamingChat();
  
  console.log('\n✨ Tests completed!');
};

runTests(); 