import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, MapPin, Truck, ShoppingBag } from 'lucide-react';
import Loading from '../components/common/Loading';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import { useGlobalToast } from '../layouts/AppLayout';
import { getOrder } from '../api/orders';
import { routes } from '../utils/urls';
import { formatPrice, formatPhone, formatDateTime } from '../utils/format';
import type { Order } from '../types';

const SHIPPING_LABELS = {
  standard: 'Standard Shipping (5-7 days)',
  express: 'Express Shipping (2-3 days)',
};

const STATUS_VARIANTS = {
  created: 'info' as const,
  processing: 'warning' as const,
  shipped: 'info' as const,
  delivered: 'success' as const,
  cancelled: 'error' as const,
};

export default function OrderPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const toast = useGlobalToast();

  useEffect(() => {
    if (!orderId) {
      toast.error('Invalid order ID');
      return;
    }

    loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    if (!orderId) return;

    try {
      const data = await getOrder(orderId);
      setOrder(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Loading text="Loading order..." />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Order not found</h2>
        <Link to={routes.items()}>
          <Button>Continue Shopping</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success Header */}
        <div className="bg-white rounded-2xl shadow-md p-8 mb-8 text-center">
          <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Order Confirmed!
          </h1>
          <p className="text-gray-600 mb-4">
            Thank you for your order. We'll send you a confirmation email shortly.
          </p>
          <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
            <div>
              <span className="font-medium">Order ID:</span> {order._id}
            </div>
            <div>
              <span className="font-medium">Date:</span> {formatDateTime(order.createdAt)}
            </div>
          </div>
          <div className="mt-4">
            <Badge variant={STATUS_VARIANTS[order.status]}>
              {order.status.toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            Order Items
          </h2>
          <div className="space-y-3">
            {order.items.map((item) => (
              <div
                key={item.productId}
                className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{item.name}</p>
                  <p className="text-sm text-gray-500">{item.sku}</p>
                  <p className="text-sm text-gray-600 mt-1">Qty: {item.qty}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    {formatPrice(item.priceCents * item.qty)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatPrice(item.priceCents)} each
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-200 mt-6 pt-4">
            <div className="flex justify-between text-xl font-bold text-gray-900">
              <span>Total</span>
              <span>{formatPrice(order.totalCents)}</span>
            </div>
          </div>
        </div>

        {/* Shipping Address */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Shipping Address
          </h2>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="font-medium text-gray-900">{order.address.name}</p>
            <p className="text-gray-600">{formatPhone(order.address.phone)}</p>
            <p className="text-gray-600 mt-2">{order.address.line1}</p>
            <p className="text-gray-600">
              {order.address.city}, {order.address.state} {order.address.pincode}
            </p>
          </div>
        </div>

        {/* Shipping Method */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Shipping Method
          </h2>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-gray-900">{SHIPPING_LABELS[order.shippingMethod]}</p>
          </div>
        </div>

        {/* Continue Shopping */}
        <div className="text-center">
          <Link to={routes.items()}>
            <Button size="lg">
              Continue Shopping
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
