import apiClient from './client';
import type { Cart, AddToCartRequest, UpdateCartRequest } from '../types';

/**
 * Get current user's cart
 */
export async function getCart(): Promise<Cart> {
  const response = await apiClient.get<Cart>('/cart');
  return response.data;
}

/**
 * Add item to cart or update quantity if already exists
 * @param productId - Product ID
 * @param qty - Quantity (1-5)
 */
export async function addItem(productId: string, qty: number): Promise<Cart> {
  const data: AddToCartRequest = { productId, qty };
  const response = await apiClient.post<Cart>('/cart', data);
  return response.data;
}

/**
 * Update item quantity in cart
 * @param productId - Product ID
 * @param qty - New quantity (1-5)
 */
export async function updateQty(productId: string, qty: number): Promise<Cart> {
  const data: UpdateCartRequest = { qty };
  const response = await apiClient.patch<Cart>(`/cart/${productId}`, data);
  return response.data;
}

/**
 * Remove item from cart
 * @param productId - Product ID
 */
export async function removeItem(productId: string): Promise<Cart> {
  const response = await apiClient.delete<Cart>(`/cart/${productId}`);
  return response.data;
}
