import apiClient from './client';
import type { Alert } from '../types';

/**
 * List all alerts
 * @param processed - Filter by processed status (optional)
 */
export async function listAlerts(processed?: boolean): Promise<Alert[]> {
  const params = processed !== undefined ? { processed } : {};
  const response = await apiClient.get<{ count: number; alerts: Alert[] }>(
    '/admin/low-stock-alerts',
    { params }
  );
  return response.data.alerts;
}

/**
 * Acknowledge/mark alert as processed
 * @param alertId - Alert ID
 */
export async function ackAlert(alertId: string): Promise<Alert> {
  const response = await apiClient.post<{ message: string; alert: Alert }>(
    `/admin/low-stock-alerts/${alertId}/ack`
  );
  return response.data.alert;
}
