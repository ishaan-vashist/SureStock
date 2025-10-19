import { Clock } from 'lucide-react';
import Button from '../common/Button';
import { formatPrice } from '../../utils/format';
import type { CartItem, ShippingMethod } from '../../types';

interface CheckoutSummaryProps {
  items: CartItem[];
  subtotal: number;
  shippingMethod: ShippingMethod;
  onReserveStock: () => void;
  isReserving: boolean;
  showTimer?: boolean;
}

const SHIPPING_COSTS = {
  standard: 0,
  express: 999,
};

export default function CheckoutSummary({
  items,
  subtotal,
  shippingMethod,
  onReserveStock,
  isReserving,
  showTimer = true,
}: CheckoutSummaryProps) {
  const shippingCost = SHIPPING_COSTS[shippingMethod];
  const total = subtotal + shippingCost;

  return (
    <div className="bg-white rounded-2xl shadow-md p-6 sticky top-4">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Order Summary</h2>

      {/* Items */}
      <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
        {items.map((item) => (
          <div key={item.productId} className="flex gap-3">
            <img
              src={item.product.image}
              alt={item.product.name}
              className="w-16 h-16 rounded-lg object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {item.product.name}
              </p>
              <p className="text-sm text-gray-500">Qty: {item.qty}</p>
            </div>
            <div className="text-sm font-semibold text-gray-900">
              {formatPrice(item.product.priceCents * item.qty)}
            </div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="space-y-3 border-t border-gray-200 pt-4 mb-6">
        <div className="flex justify-between text-gray-600">
          <span>Subtotal</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        
        <div className="flex justify-between text-gray-600">
          <span>Shipping</span>
          <span>{shippingCost === 0 ? 'FREE' : formatPrice(shippingCost)}</span>
        </div>

        <div className="border-t border-gray-200 pt-3">
          <div className="flex justify-between text-lg font-bold text-gray-900">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
        </div>
      </div>

      {/* Reserve Stock Button */}
      <Button
        onClick={onReserveStock}
        size="lg"
        className="w-full"
        isLoading={isReserving}
        disabled={isReserving}
      >
        <Clock className="w-5 h-5 mr-2" />
        {isReserving ? 'Processing...' : 'Place Order'}
      </Button>

      {showTimer && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-blue-700">
            <Clock className="w-4 h-4" />
            <span className="font-medium">10-minute stock reservation</span>
          </div>
          <p className="text-xs text-blue-600 mt-1">
            Your items will be reserved during checkout to ensure availability
          </p>
        </div>
      )}
    </div>
  );
}
