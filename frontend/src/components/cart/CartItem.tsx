import { useState } from 'react';
import { Trash2, Minus, Plus } from 'lucide-react';
import Button from '../common/Button';
import Badge from '../common/Badge';
import { formatPrice } from '../../utils/format';
import type { CartItem as CartItemType } from '../../types';

interface CartItemProps {
  item: CartItemType;
  onUpdateQty: (productId: string, qty: number) => Promise<void>;
  onRemove: (productId: string) => Promise<void>;
}

export default function CartItem({ item, onUpdateQty, onRemove }: CartItemProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  // Safety check - if product is not populated, show error state
  if (!item.product) {
    return (
      <div className="bg-white rounded-2xl shadow-md p-4 md:p-6">
        <div className="text-center py-4">
          <p className="text-error">Product not found</p>
          <button
            onClick={() => onRemove(item.productId)}
            className="text-sm text-primary hover:underline mt-2"
          >
            Remove from cart
          </button>
        </div>
      </div>
    );
  }

  const handleQtyChange = async (newQty: number) => {
    if (newQty < 1 || newQty > 5 || newQty === item.qty) return;
    
    setIsUpdating(true);
    try {
      await onUpdateQty(item.productId, newQty);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemove = async () => {
    setIsRemoving(true);
    try {
      await onRemove(item.productId);
    } catch {
      setIsRemoving(false);
    }
  };

  const subtotal = item.product.priceCents * item.qty;
  const isUnavailable = item.product.available < item.qty;

  return (
    <div className={`bg-white rounded-2xl shadow-md p-4 md:p-6 ${isRemoving ? 'opacity-50' : ''}`}>
      <div className="flex gap-4">
        {/* Image */}
        <div className="w-24 h-24 md:w-32 md:h-32 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
          <img
            src={item.product.image}
            alt={item.product.name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 mb-1 truncate">
                {item.product.name}
              </h3>
              <p className="text-sm text-gray-500">{item.product.sku}</p>
            </div>
            <button
              onClick={handleRemove}
              disabled={isRemoving}
              className="p-2 text-gray-400 hover:text-error hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              aria-label="Remove item"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>

          {/* Availability Warning */}
          {isUnavailable && (
            <div className="mb-3">
              <Badge variant="error">
                Only {item.product.available} available - Reduce quantity
              </Badge>
            </div>
          )}

          {/* Price and Quantity */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-primary">
                {formatPrice(item.product.priceCents)}
              </span>
              <span className="text-sm text-gray-500">each</span>
            </div>

            {/* Quantity Stepper */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleQtyChange(item.qty - 1)}
                disabled={item.qty <= 1 || isUpdating}
                className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Decrease quantity"
              >
                <Minus className="w-4 h-4" />
              </button>
              
              <span className="w-12 text-center font-semibold text-gray-900">
                {item.qty}
              </span>
              
              <button
                onClick={() => handleQtyChange(item.qty + 1)}
                disabled={item.qty >= 5 || item.qty >= item.product.available || isUpdating}
                className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Increase quantity"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Subtotal */}
            <div className="text-right">
              <div className="text-sm text-gray-500">Subtotal</div>
              <div className="text-lg font-bold text-gray-900">
                {formatPrice(subtotal)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
