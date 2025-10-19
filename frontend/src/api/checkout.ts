import apiClient from './client';
import type {
  ReserveRequest,
  ReserveResponse,
  Reservation,
  ConfirmRequest,
  ConfirmResponse,
} from '../types';

/**
 * Place order (RECOMMENDED): Reserve + Confirm in one atomic operation
 * Server handles reservation internally - better UX, no timer pressure
 * @param address - Shipping address
 * @param shippingMethod - 'standard' or 'express'
 * @param idempotencyKey - UUID v4 for idempotency
 */
export async function placeOrder(
  address: ReserveRequest['address'],
  shippingMethod: ReserveRequest['shippingMethod'],
  idempotencyKey: string
): Promise<ConfirmResponse> {
  const data: ReserveRequest = { address, shippingMethod };
  const response = await apiClient.post<ConfirmResponse>('/checkout/place-order', data, {
    headers: {
      'Idempotency-Key': idempotencyKey,
    },
  });
  return response.data;
}

/**
 * Reserve stock for cart items (10 minute TTL)
 * DEPRECATED: Use placeOrder() instead for better UX
 * @param address - Shipping address
 * @param shippingMethod - 'standard' or 'express'
 */
export async function reserve(
  address: ReserveRequest['address'],
  shippingMethod: ReserveRequest['shippingMethod']
): Promise<ReserveResponse> {
  const data: ReserveRequest = { address, shippingMethod };
  const response = await apiClient.post<ReserveResponse>('/checkout/reserve', data);
  return response.data;
}

/**
 * Get reservation details
 * @param reservationId - Reservation ID
 */
export async function getReservation(reservationId: string): Promise<Reservation> {
  const response = await apiClient.get<Reservation>(`/checkout/reservation/${reservationId}`);
  return response.data;
}

/**
 * Confirm order and complete purchase
 * Requires Idempotency-Key header
 * @param reservationId - Reservation ID
 * @param idempotencyKey - UUID v4 for idempotency
 */
export async function confirm(
  reservationId: string,
  idempotencyKey: string
): Promise<ConfirmResponse> {
  const data: ConfirmRequest = { reservationId };
  const response = await apiClient.post<ConfirmResponse>('/checkout/confirm', data, {
    headers: {
      'Idempotency-Key': idempotencyKey,
    },
  });
  return response.data;
}
