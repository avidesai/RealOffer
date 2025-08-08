// utils/embeddingClient.js

const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY
});

/**
 * Generate Claude v3.5 Embeddings for a text string
 * @param {string} text - The text to embed
 * @returns {Promise<number[]>} - The 1536-dim embedding vector
 */
async function getClaudeEmbedding(text) {
  if (!text || text.trim().length < 5) return [];

  try {
    const response = await anthropic.embeddings.create({
      model: 'claude-3-embedding-20240229',
      input: text.substring(0, 2000) // Claude limit is 2000 tokens
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Claude embedding error:', error.message);
    return [];
  }
}

module.exports = { getClaudeEmbedding };
