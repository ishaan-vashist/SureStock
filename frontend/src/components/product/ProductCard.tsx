import { useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import Button from '../common/Button';
import StockBadge from '../product/StockBadge';
import { formatPrice } from '../../utils/format';
import type { Product } from '../../types';

interface ProductCardProps {
  product: Product;
  onAddToCart?: (productId: string, qty: number) => Promise<void>;
}

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const [isAdding, setIsAdding] = useState(false);

  const handleAddToCart = async () => {
    if (!onAddToCart || product.available === 0) return;
    
    setIsAdding(true);
    try {
      await onAddToCart(product._id, 1);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow overflow-hidden group">
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        <div className="absolute top-3 right-3">
          <StockBadge available={product.available} />
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
          {product.name}
        </h3>
        <p className="text-sm text-gray-500 mb-2">{product.sku}</p>
        
        <div className="flex items-center justify-between mb-3">
          <span className="text-2xl font-bold text-primary">
            {formatPrice(product.priceCents)}
          </span>
          <span className="text-sm text-gray-600">
            {product.available} available
          </span>
        </div>

        <Button
          onClick={handleAddToCart}
          disabled={product.available === 0 || isAdding}
          isLoading={isAdding}
          className="w-full"
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          {product.available === 0 ? 'Out of Stock' : 'Add to Cart'}
        </Button>
      </div>
    </div>
  );
}
