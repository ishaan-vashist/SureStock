import { ArrowRight } from 'lucide-react';
import Button from '../common/Button';
import { formatPrice } from '../../utils/format';

interface CartSummaryProps {
  subtotal: number;
  itemCount: number;
  onCheckout: () => void;
}

export default function CartSummary({ subtotal, itemCount, onCheckout }: CartSummaryProps) {
  return (
    <div className="bg-white rounded-2xl shadow-md p-6 sticky top-4">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Order Summary</h2>

      <div className="space-y-3 mb-6">
        <div className="flex justify-between text-gray-600">
          <span>Items ({itemCount})</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        
        <div className="flex justify-between text-gray-600">
          <span>Shipping</span>
          <span className="text-sm">Calculated at checkout</span>
        </div>

        <div className="border-t border-gray-200 pt-3 mt-3">
          <div className="flex justify-between text-lg font-bold text-gray-900">
            <span>Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
        </div>
      </div>

      <Button onClick={onCheckout} size="lg" className="w-full group">
        Proceed to Checkout
        <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
      </Button>

      <p className="text-xs text-gray-500 text-center mt-4">
        Shipping and taxes calculated at checkout
      </p>
    </div>
  );
}
