import { MapPin, Truck } from 'lucide-react';
import { formatPrice, formatPhone } from '../../utils/format';
import type { Reservation } from '../../types';

interface ReservationSummaryProps {
  reservation: Reservation;
}

const SHIPPING_COSTS = {
  standard: 0,
  express: 999,
};

const SHIPPING_LABELS = {
  standard: 'Standard Shipping (5-7 days)',
  express: 'Express Shipping (2-3 days)',
};

export default function ReservationSummary({ reservation }: ReservationSummaryProps) {
  const subtotal = reservation.items.reduce(
    (sum, item) => sum + item.priceCents * item.qty,
    0
  );
  const shippingCost = SHIPPING_COSTS[reservation.shippingMethod];
  const total = subtotal + shippingCost;

  return (
    <div className="space-y-6">
      {/* Items */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h3>
        <div className="space-y-3">
          {reservation.items.map((item) => (
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
      </div>

      {/* Shipping Address */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Shipping Address
        </h3>
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="font-medium text-gray-900">{reservation.address.name}</p>
          <p className="text-gray-600">{formatPhone(reservation.address.phone)}</p>
          <p className="text-gray-600 mt-2">{reservation.address.line1}</p>
          <p className="text-gray-600">
            {reservation.address.city}, {reservation.address.state}{' '}
            {reservation.address.pincode}
          </p>
        </div>
      </div>

      {/* Shipping Method */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Truck className="w-5 h-5" />
          Shipping Method
        </h3>
        <div className="p-4 bg-gray-50 rounded-lg flex items-center justify-between">
          <span className="text-gray-900">
            {SHIPPING_LABELS[reservation.shippingMethod]}
          </span>
          <span className="font-semibold text-gray-900">
            {shippingCost === 0 ? 'FREE' : formatPrice(shippingCost)}
          </span>
        </div>
      </div>

      {/* Order Total */}
      <div className="border-t border-gray-200 pt-4">
        <div className="space-y-2">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Shipping</span>
            <span>{shippingCost === 0 ? 'FREE' : formatPrice(shippingCost)}</span>
          </div>
          <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t border-gray-200">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
