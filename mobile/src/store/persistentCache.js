import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Cầu nối giữa CourseStore (viết theo kiểu localStorage đồng bộ của bản web)
 * và AsyncStorage của React Native — vốn là API bất đồng bộ.
 *
 * Cách làm: nạp toàn bộ key vào một Map trong bộ nhớ *trước khi* Provider mount
 * (App.tsx chờ `hydrateCache()`), nhờ vậy `readCache` vẫn đọc đồng bộ được và
 * toàn bộ logic store dùng chung với web không phải viết lại theo async.
 * Ghi thì cập nhật Map ngay lập tức rồi flush xuống đĩa theo lô, có debounce.
 */

const cache = new Map();
const dirtyKeys = new Set();
let hydrated = false;
let flushTimer = null;

const FLUSH_DELAY_MS = 400;

export function isHydrated() {
  return hydrated;
}

/** Nạp toàn bộ dữ liệu đã lưu vào Map. Gọi đúng một lần lúc khởi động app. */
export async function hydrateCache() {
  if (hydrated) return;
  try {
    const keys = await AsyncStorage.getAllKeys();
    const appKeys = keys.filter((k) => k.startsWith('mm-megalearn-'));
    if (appKeys.length) {
      const pairs = await AsyncStorage.multiGet(appKeys);
      pairs.forEach(([key, raw]) => {
        if (raw == null) return;
        try {
          cache.set(key, JSON.parse(raw));
        } catch {
          // Bỏ qua bản ghi hỏng thay vì làm sập bước khởi động.
        }
      });
    }
  } catch {
    // Không đọc được ổ đĩa: chạy tiếp với dữ liệu mặc định trong bộ nhớ.
  }
  hydrated = true;
}

export function readCache(key, fallback) {
  if (cache.has(key)) {
    const value = cache.get(key);
    if (value !== undefined && value !== null) return value;
  }
  return fallback;
}

export function writeCache(key, value) {
  const prev = cache.get(key);
  if (prev === value) return;
  cache.set(key, value);
  dirtyKeys.add(key);
  scheduleFlush();
}

export function removeCache(key) {
  cache.delete(key);
  dirtyKeys.add(key);
  scheduleFlush();
}

/** Xoá sạch dữ liệu app (dùng cho nút "Đặt lại dữ liệu demo"). */
export async function clearCache() {
  cache.clear();
  dirtyKeys.clear();
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  try {
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(keys.filter((k) => k.startsWith('mm-megalearn-')));
  } catch {
    // Không xoá được thì lần mở app sau vẫn còn dữ liệu cũ — chấp nhận được.
  }
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush();
  }, FLUSH_DELAY_MS);
}

async function flush() {
  if (!dirtyKeys.size) return;
  const keys = [...dirtyKeys];
  dirtyKeys.clear();

  const toSet = [];
  const toRemove = [];
  keys.forEach((key) => {
    if (cache.has(key)) {
      try {
        toSet.push([key, JSON.stringify(cache.get(key))]);
      } catch {
        // Giá trị không serialize được thì bỏ qua key đó.
      }
    } else {
      toRemove.push(key);
    }
  });

  try {
    if (toSet.length) await AsyncStorage.multiSet(toSet);
    if (toRemove.length) await AsyncStorage.multiRemove(toRemove);
  } catch {
    // Ghi hỏng: dữ liệu trong phiên vẫn đúng, chỉ là không bền vững qua lần mở sau.
  }
}
