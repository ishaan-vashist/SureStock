import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import CartItem from '../components/cart/CartItem';
import CartSummary from '../components/cart/CartSummary';
import Loading from '../components/common/Loading';
import Button from '../components/common/Button';
import { useGlobalToast } from '../layouts/AppLayout';
import { getCart, updateQty, removeItem } from '../api/cart';
import { routes } from '../utils/urls';
import type { Cart } from '../types';

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const toast = useGlobalToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    try {
      const data = await getCart();
      setCart(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load cart');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQty = async (productId: string, qty: number) => {
    try {
      const updatedCart = await updateQty(productId, qty);
      setCart(updatedCart);
      toast.success('Quantity updated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update quantity');
      throw error;
    }
  };

  const handleRemove = async (productId: string) => {
    try {
      const updatedCart = await removeItem(productId);
      setCart(updatedCart);
      toast.success('Item removed from cart');
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove item');
      throw error;
    }
  };

  const handleCheckout = () => {
    // Check if any items are unavailable
    const hasUnavailable = cart?.items.some(
      (item) => item.product.available < item.qty
    );

    if (hasUnavailable) {
      toast.error('Please adjust quantities for unavailable items');
      return;
    }

    navigate(routes.checkout());
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Loading text="Loading cart..." />
      </div>
    );
  }

  // Empty cart state
  if (!cart || cart.items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-2xl shadow-md p-12 text-center max-w-md mx-auto">
          <ShoppingBag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Your cart is empty
          </h2>
          <p className="text-gray-600 mb-6">
            Add some products to get started!
          </p>
          <Link to={routes.items()}>
            <Button size="lg">Browse Products</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Shopping Cart</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cart.items.map((item) => (
              <CartItem
                key={item.productId}
                item={item}
                onUpdateQty={handleUpdateQty}
                onRemove={handleRemove}
              />
            ))}
          </div>

          {/* Cart Summary */}
          <div className="lg:col-span-1">
            <CartSummary
              subtotal={cart.total}
              itemCount={cart.items.reduce((sum, item) => sum + item.qty, 0)}
              onCheckout={handleCheckout}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
