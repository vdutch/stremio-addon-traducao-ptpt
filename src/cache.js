const { LRUCache } = require('lru-cache');

const DEFAULT_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * A wrapper around LRUCache that adds logging for get/set operations.
 */
class LoggingCache {
  constructor() {
    const options = {
      max: 500,
      ttl: Number(process.env.CACHE_TTL_MS || DEFAULT_CACHE_TTL_MS),
      dispose: (value, key, reason) => {
        console.log(`[cache] EVICT: ${key} (reason: ${reason})`);
      },
    };
    this.cache = new LRUCache(options);
    console.log(`[cache] Cache inicializado. TTL: ${options.ttl}ms, Max items: ${options.max}`);
  }

  get(key) {
    const value = this.cache.get(key);
    if (value) {
      console.log(`[cache] HIT: ${key}`);
    } else {
      console.log(`[cache] MISS: ${key}`);
    }
    return value;
  }

  set(key, value) {
    console.log(`[cache] SET: ${key}`);
    this.cache.set(key, value);
  }
}

let cacheInstance;

function getCache() {
  if (!cacheInstance) {
    cacheInstance = new LoggingCache();
  }
  return cacheInstance;
}

module.exports = { getCache };
