/**
 * Session cache & storage helper to prevent repeated API calls
 */

const memoryCache = new Map();

export const sessionCache = {
  get(key) {
    if (memoryCache.has(key)) {
      return memoryCache.get(key);
    }
    try {
      const val = sessionStorage.getItem(key);
      if (val) {
        const parsed = JSON.parse(val);
        memoryCache.set(key, parsed);
        return parsed;
      }
    } catch {
      // sessionStorage unavailable
    }
    return null;
  },

  set(key, value) {
    memoryCache.set(key, value);
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore storage error
    }
  },

  remove(key) {
    memoryCache.delete(key);
    try {
      sessionStorage.removeItem(key);
    } catch {
      // ignore
    }
  },

  clear() {
    memoryCache.clear();
    try {
      sessionStorage.clear();
    } catch {
      // ignore
    }
  }
};

export default sessionCache;
