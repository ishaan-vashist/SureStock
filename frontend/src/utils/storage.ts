/**
 * LocalStorage helper utilities with type safety
 */

/**
 * Get item from localStorage
 * @param key - Storage key
 * @returns Parsed value or null
 */
export function getItem<T>(key: string): T | null {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error(`Error reading from localStorage key "${key}":`, error);
    return null;
  }
}

/**
 * Set item in localStorage
 * @param key - Storage key
 * @param value - Value to store
 */
export function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing to localStorage key "${key}":`, error);
  }
}

/**
 * Remove item from localStorage
 * @param key - Storage key
 */
export function removeItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing from localStorage key "${key}":`, error);
  }
}

/**
 * Clear all items from localStorage
 */
export function clear(): void {
  try {
    localStorage.clear();
  } catch (error) {
    console.error('Error clearing localStorage:', error);
  }
}

/**
 * Get idempotency key for a reservation
 * @param reservationId - Reservation ID
 * @returns Stored idempotency key or null
 */
export function getIdempotencyKey(reservationId: string): string | null {
  return getItem<string>(`idempotency-key-${reservationId}`);
}

/**
 * Set idempotency key for a reservation
 * @param reservationId - Reservation ID
 * @param key - Idempotency key (UUID)
 */
export function setIdempotencyKey(reservationId: string, key: string): void {
  setItem(`idempotency-key-${reservationId}`, key);
}

/**
 * Clear idempotency key for a reservation
 * @param reservationId - Reservation ID
 */
export function clearIdempotencyKey(reservationId: string): void {
  removeItem(`idempotency-key-${reservationId}`);
}
