import LRU from 'lru-cache';

let cacheInstance;

export function getCache() {
  if (!cacheInstance) {
    cacheInstance = new LRU({
      max: 500,
      ttl: Number(process.env.CACHE_TTL_MS || 86400000) // 24h default
    });
  }
  return cacheInstance;
}
