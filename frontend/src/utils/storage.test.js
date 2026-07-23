import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  safeGetStorageItem,
  safeRemoveStorageItem,
  safeSetStorageItem,
  storage,
} from './storage';

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe('safe browser storage', () => {
  it('reads, writes, and removes values when storage is available', () => {
    expect(safeSetStorageItem('theme', 'dark')).toBe(true);
    expect(safeGetStorageItem('theme')).toBe('dark');
    expect(safeRemoveStorageItem('theme')).toBe(true);
    expect(safeGetStorageItem('theme')).toBeNull();
  });

  it('provides an exception-safe storage facade', () => {
    expect(storage.set('theme', 'light')).toBe(true);
    expect(storage.get('theme')).toBe('light');
    expect(storage.remove('theme')).toBe(true);
    expect(storage.get('theme')).toBeNull();
  });

  it('returns safe fallbacks when browser storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Storage disabled', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage disabled', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('Storage disabled', 'SecurityError');
    });

    expect(safeGetStorageItem('token', 'fallback')).toBe('fallback');
    expect(safeSetStorageItem('token', 'value')).toBe(false);
    expect(safeRemoveStorageItem('token')).toBe(false);
  });
});
