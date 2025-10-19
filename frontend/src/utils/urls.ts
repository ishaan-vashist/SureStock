/**
 * Route builder utilities for type-safe navigation
 */

export const routes = {
  home: () => '/',
  items: () => '/items',
  cart: () => '/cart',
  checkout: () => '/checkout',
  confirm: (reservationId: string) => `/confirm/${reservationId}`,
  success: (orderId: string) => `/order/${orderId}`, // Alias for order page
  order: (orderId: string) => `/order/${orderId}`,
  adminAlerts: () => '/admin/alerts',
} as const;

/**
 * Build query string from params object
 * @param params - Query parameters
 * @returns Query string (e.g., "?key=value&foo=bar")
 */
export function buildQueryString(params: Record<string, string | number | boolean>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    searchParams.append(key, String(value));
  });
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Parse query string to object
 * @param search - Query string (e.g., "?key=value")
 * @returns Parsed object
 */
export function parseQueryString(search: string): Record<string, string> {
  const params = new URLSearchParams(search);
  const result: Record<string, string> = {};
  params.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}
