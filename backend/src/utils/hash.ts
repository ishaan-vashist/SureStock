import crypto from 'crypto';

/**
 * Creates a stable SHA-256 hash of a request payload
 * @param payload - The payload to hash (will be JSON stringified)
 * @returns Hexadecimal hash string
 */
export function requestHash(payload: unknown): string {
  const normalized = JSON.stringify(payload, Object.keys(payload as object).sort());
  return crypto.createHash('sha256').update(normalized).digest('hex');
}
