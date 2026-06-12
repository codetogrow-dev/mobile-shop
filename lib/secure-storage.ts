import * as SecureStore from 'expo-secure-store';

/**
 * Wrapper around expo-secure-store that chunks values larger than the platform
 * limit (~2 KB on iOS Keychain / Android Keystore items). Supabase session
 * blobs routinely exceed this, which triggers the "Value being stored in
 * SecureStore is larger than 2048 bytes..." warning and risks silent data loss
 * on future SDK versions.
 *
 * Strategy:
 *   - On set: split into 1.5 KB chunks under keys `<key>.0`, `<key>.1`, ...
 *     Store the chunk count under `<key>.count`. Remove any previous chunks.
 *   - On get: read `<key>.count`, then reassemble. Falls back to reading the
 *     bare `<key>` so anyone who upgraded from the old impl still loads their
 *     existing session once (then it gets re-chunked on next save).
 *   - On remove: delete the count + all chunks + the legacy bare key.
 */

// Comfortably under the 2048-byte limit. 1500 leaves room for the key name +
// any per-platform overhead.
const CHUNK_SIZE = 1500;
const COUNT_SUFFIX = '.count';

function chunkKey(key: string, i: number) {
  return `${key}.${i}`;
}
function countKey(key: string) {
  return `${key}${COUNT_SUFFIX}`;
}

async function clearChunks(key: string) {
  const countStr = await SecureStore.getItemAsync(countKey(key));
  if (countStr) {
    const count = Number(countStr) || 0;
    await Promise.all(
      Array.from({ length: count }, (_, i) =>
        SecureStore.deleteItemAsync(chunkKey(key, i)),
      ),
    );
    await SecureStore.deleteItemAsync(countKey(key));
  }
}

export const secureStorage = {
  getItem: async (key: string): Promise<string | null> => {
    const countStr = await SecureStore.getItemAsync(countKey(key));
    if (countStr) {
      const count = Number(countStr) || 0;
      const parts = await Promise.all(
        Array.from({ length: count }, (_, i) =>
          SecureStore.getItemAsync(chunkKey(key, i)),
        ),
      );
      if (parts.some((p) => p == null)) return null;
      return parts.join('');
    }
    // Legacy single-blob fallback (one-time upgrade path).
    return SecureStore.getItemAsync(key);
  },

  setItem: async (key: string, value: string): Promise<void> => {
    await clearChunks(key);
    // Also clear any legacy single-blob copy so we don't leave it behind.
    await SecureStore.deleteItemAsync(key).catch(() => {});

    if (value.length <= CHUNK_SIZE) {
      // Still goes through the chunked path so reads are uniform.
      await SecureStore.setItemAsync(chunkKey(key, 0), value);
      await SecureStore.setItemAsync(countKey(key), '1');
      return;
    }

    const chunks: string[] = [];
    for (let i = 0; i < value.length; i += CHUNK_SIZE) {
      chunks.push(value.slice(i, i + CHUNK_SIZE));
    }
    await Promise.all(
      chunks.map((part, i) => SecureStore.setItemAsync(chunkKey(key, i), part)),
    );
    await SecureStore.setItemAsync(countKey(key), String(chunks.length));
  },

  removeItem: async (key: string): Promise<void> => {
    await clearChunks(key);
    await SecureStore.deleteItemAsync(key).catch(() => {});
  },
};
