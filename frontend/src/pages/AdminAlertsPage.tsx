import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, Filter } from 'lucide-react';
import Loading from '../components/common/Loading';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import { useGlobalToast } from '../layouts/AppLayout';
import { listAlerts, ackAlert } from '../api/admin';
import { formatDateTime } from '../utils/format';
import type { Alert } from '../types';

const ALERT_TYPE_LABELS = {
  low_stock: 'Low Stock',
  out_of_stock: 'Out of Stock',
  reservation_expired: 'Reservation Expired',
};

const ALERT_TYPE_VARIANTS = {
  low_stock: 'warning' as const,
  out_of_stock: 'error' as const,
  reservation_expired: 'info' as const,
};

export default function AdminAlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProcessed, setShowProcessed] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const toast = useGlobalToast();

  useEffect(() => {
    loadAlerts();
  }, [showProcessed]);

  const loadAlerts = async () => {
    try {
      const data = await listAlerts(showProcessed ? undefined : false);
      setAlerts(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (alertId: string) => {
    setProcessingIds((prev) => new Set(prev).add(alertId));
    try {
      await ackAlert(alertId);
      toast.success('Alert acknowledged');
      // Update local state
      setAlerts((prev) =>
        prev.map((alert) =>
          alert._id === alertId ? { ...alert, processed: true } : alert
        )
      );
    } catch (error: any) {
      toast.error(error.message || 'Failed to acknowledge alert');
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(alertId);
        return next;
      });
    }
  };

  const unprocessedCount = alerts.filter((a) => !a.processed).length;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Loading text="Loading alerts..." />
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Alerts</h1>
            <p className="text-gray-600">
              {unprocessedCount} unprocessed alert{unprocessedCount !== 1 ? 's' : ''}
            </p>
          </div>
          <Button
            variant={showProcessed ? 'primary' : 'outline'}
            onClick={() => setShowProcessed(!showProcessed)}
          >
            <Filter className="w-4 h-4 mr-2" />
            {showProcessed ? 'Show Unprocessed Only' : 'Show All'}
          </Button>
        </div>

        {/* Alerts Table */}
        {alerts.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-md p-12 text-center">
            <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No alerts to display
            </h3>
            <p className="text-gray-600">
              {showProcessed
                ? 'No alerts found'
                : 'All alerts have been processed'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Message
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {alerts.map((alert) => (
                    <tr key={alert._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={ALERT_TYPE_VARIANTS[alert.type]}>
                          {ALERT_TYPE_LABELS[alert.type]}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-gray-900">{alert.message}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {alert.sku ? (
                          <span className="text-sm text-gray-900">{alert.sku}</span>
                        ) : (
                          <span className="text-sm text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDateTime(alert.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {alert.processed ? (
                          <Badge variant="success">Processed</Badge>
                        ) : (
                          <Badge variant="warning">Pending</Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {!alert.processed && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAcknowledge(alert._id)}
                            isLoading={processingIds.has(alert._id)}
                            disabled={processingIds.has(alert._id)}
                          >
                            Acknowledge
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
