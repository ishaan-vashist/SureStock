import apiClient from './client';
import type { Order } from '../types';

/**
 * Get order by ID
 * @param orderId - Order ID
 */
export async function getOrder(orderId: string): Promise<Order> {
  const response = await apiClient.get<Order>(`/orders/${orderId}`);
  return response.data;
}
