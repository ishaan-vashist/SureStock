import apiClient from './client';
import type { Product } from '../types';

/**
 * Get all products from the backend
 * @returns List of products
 */
export async function listProducts(): Promise<Product[]> {
  const response = await apiClient.get<Product[]>('/products');
  return response.data;
}

/**
 * Get product by ID from the backend
 * @param productId - Product ID
 * @returns Product or null if not found
 */
export async function getProduct(productId: string): Promise<Product | null> {
  try {
    const response = await apiClient.get<Product>(`/products/${productId}`);
    return response.data;
  } catch (error) {
    // Return null if product not found (404)
    return null;
  }
}
