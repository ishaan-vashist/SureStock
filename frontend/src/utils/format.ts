import { format as dateFnsFormat } from 'date-fns';

/**
 * Format price in cents to dollar string
 * @param cents - Price in cents
 * @returns Formatted price string (e.g., "$12.99")
 */
export function formatPrice(cents: number): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(dollars);
}

/**
 * Format date to readable string
 * @param date - Date string or Date object
 * @param formatStr - Format string (default: 'MMM dd, yyyy')
 * @returns Formatted date string
 */
export function formatDate(date: string | Date, formatStr = 'MMM dd, yyyy'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateFnsFormat(dateObj, formatStr);
}

/**
 * Format date and time
 * @param date - Date string or Date object
 * @returns Formatted date and time string
 */
export function formatDateTime(date: string | Date): string {
  return formatDate(date, 'MMM dd, yyyy h:mm a');
}

/**
 * Format countdown timer (MM:SS)
 * @param seconds - Total seconds remaining
 * @returns Formatted time string (e.g., "09:45")
 */
export function formatCountdown(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format phone number
 * @param phone - 10 digit phone string
 * @returns Formatted phone (e.g., "(123) 456-7890")
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length !== 10) return phone;
  return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
}
