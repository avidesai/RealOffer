// utils/embeddingClient.js
// Switch to OpenAI embeddings. Safe to use with Claude for chat.

const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Default to 1536-dim OpenAI models. You can override via env.
const DEFAULT_EMBEDDING_MODEL = 'text-embedding-3-small';

/**
 * Generate an embedding vector for a text string
 * @param {string} text - The text to embed
 * @returns {Promise<number[]>} - Embedding vector
 */
async function getEmbedding(text) {
  if (!text || text.trim().length < 5) return [];

  try {
    const resp = await openai.embeddings.create({
      model: DEFAULT_EMBEDDING_MODEL,
      input: text
    });

    const vec = resp.data?.[0]?.embedding || [];
    if (!Array.isArray(vec) || vec.length === 0) {
      console.warn(`[embeddingClient] Empty embedding returned (model=${DEFAULT_EMBEDDING_MODEL})`);
      return [];
    }

    return vec;
  } catch (err) {
    // Log enough to debug, not secrets
    console.error('[embeddingClient] OpenAI embedding error:', err?.message || err);
    return [];
  }
}

module.exports = { getEmbedding, DEFAULT_EMBEDDING_MODEL };
