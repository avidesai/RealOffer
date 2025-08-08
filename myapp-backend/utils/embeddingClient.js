// utils/embeddingClient.js
const OpenAI = require('openai');

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const MODEL = process.env.EMBEDDING_MODEL || 'text-embedding-3-small'; // 1536 dims
const BATCH_SIZE = Number(process.env.EMBEDDING_BATCH_SIZE || 64);
const MAX_RETRIES = 5;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function embeddingsWithRetry(inputs, attempt = 1) {
  try {
    const res = await client.embeddings.create({
      model: MODEL,
      input: inputs
    });
    return res.data.map(d => d.embedding);
  } catch (err) {
    const status = err?.status || err?.response?.status;
    const retriable = status === 429 || (status >= 500 && status < 600);
    if (retriable && attempt < MAX_RETRIES) {
      const retryAfter = Number(err?.response?.headers?.['retry-after']) || 0;
      const backoff = retryAfter ? retryAfter * 1000 : Math.min(1000 * Math.pow(2, attempt - 1), 8000);
      console.warn(`[embeddingClient] ${status} on attempt ${attempt}. Retrying in ${backoff}ms...`);
      await sleep(backoff);
      return embeddingsWithRetry(inputs, attempt + 1);
    }
    console.error(`[embeddingClient] OpenAI embedding error: ${status ?? ''} ${err?.message || err}`);
    // keep array length consistent with inputs
    return new Array(Array.isArray(inputs) ? inputs.length : 1).fill(null);
  }
}

/** Batch-embed many texts (chunks internally). Returns array of embeddings (null where failed). */
async function embedBatch(texts) {
  const results = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const slice = texts.slice(i, i + BATCH_SIZE).map(t => (t || '').toString().trim().slice(0, 8000));
    const embs = await embeddingsWithRetry(slice);
    results.push(...embs);
  }
  return results;
}

/** Single text helper */
async function embedOne(text) {
  const [emb] = await embedBatch([text]);
  return emb || [];
}

// Export a compatibility alias so existing imports of getEmbedding keep working.
module.exports = {
  embedBatch,
  embedOne,
  getEmbedding: embedOne,
  MODEL
};
