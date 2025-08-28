const { LRUCache } = require('lru-cache');

let cacheInstance;

function getCache() {
  if (!cacheInstance) {
    cacheInstance = new LRUCache({
      max: 500,
      ttl: Number(process.env.CACHE_TTL_MS || 86400000) // 24h default
    });
  }
  return cacheInstance;
}

module.exports = { getCache };
