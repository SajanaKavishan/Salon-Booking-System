const getBrowserStorage = () => {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
};

export const safeGetStorageItem = (key, fallback = null) => {
  try {
    return getBrowserStorage()?.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
};

export const safeSetStorageItem = (key, value) => {
  try {
    const storage = getBrowserStorage();
    if (!storage) return false;
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};

export const safeRemoveStorageItem = (key) => {
  try {
    const storage = getBrowserStorage();
    if (!storage) return false;
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
};

export const storage = Object.freeze({
  get: safeGetStorageItem,
  set: safeSetStorageItem,
  remove: safeRemoveStorageItem,
});
