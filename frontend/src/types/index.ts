// Product Types
export interface Product {
  _id: string;
  sku: string;
  name: string;
  priceCents: number;
  stock: number;
  reserved: number;
  available: number; // stock - reserved
  image: string;
}

// Cart Types
export interface CartItem {
  productId: string;
  qty: number;
  product: Product;
}

export interface Cart {
  items: CartItem[];
  total: number; // in cents
}

// Address Type
export interface Address {
  name: string;
  phone: string; // 10 digits
  line1: string;
  city: string;
  state: string;
  pincode: string; // 6 digits
}

// Shipping Types
export type ShippingMethod = 'standard' | 'express';

export interface ShippingOption {
  method: ShippingMethod;
  label: string;
  priceCents: number;
  description: string;
}

// Reservation Types
export interface ReservationItem {
  productId: string;
  sku: string;
  name: string;
  priceCents: number;
  qty: number;
}

export interface Reservation {
  _id: string;
  status: 'active' | 'consumed' | 'expired';
  items: ReservationItem[];
  address: Address;
  shippingMethod: ShippingMethod;
  expiresAt: string; // ISO date
  isValid: boolean;
}

export interface ReserveRequest {
  address: Address;
  shippingMethod: ShippingMethod;
}

export interface ReserveResponse {
  reservationId: string;
  expiresAt: string; // ISO date
}

// Order Types
export interface Order {
  _id: string;
  userId: string;
  items: ReservationItem[];
  address: Address;
  shippingMethod: ShippingMethod;
  totalCents: number;
  status: 'created' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
}

export interface ConfirmRequest {
  reservationId: string;
}

export interface ConfirmResponse {
  orderId: string;
  status: 'created';
}

// Admin Alert Types
export interface Alert {
  _id: string;
  type: 'low_stock' | 'out_of_stock' | 'reservation_expired';
  productId?: string;
  sku?: string;
  message: string;
  processed: boolean;
  createdAt: string;
}

// API Error Type
export interface ApiError {
  status: number;
  message: string;
}

// Cart API Request Types
export interface AddToCartRequest {
  productId: string;
  qty: number;
}

export interface UpdateCartRequest {
  qty: number;
}
