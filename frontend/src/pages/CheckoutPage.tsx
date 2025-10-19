import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import AddressForm from '../components/checkout/AddressForm';
import ShippingSelector from '../components/checkout/ShippingSelector';
import CheckoutSummary from '../components/checkout/CheckoutSummary';
import Loading from '../components/common/Loading';
import Button from '../components/common/Button';
import { useGlobalToast } from '../layouts/AppLayout';
import { getCart } from '../api/cart';
import { placeOrder } from '../api/checkout';
import { routes } from '../utils/urls';
import type { Cart, Address, ShippingMethod } from '../types';

export default function CheckoutPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [isReserving, setIsReserving] = useState(false);
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>('standard');
  const addressFormRef = useRef<HTMLDivElement>(null);
  const toast = useGlobalToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    try {
      const data = await getCart();
      if (data.items.length === 0) {
        toast.warning('Your cart is empty');
        navigate(routes.cart());
        return;
      }
      setCart(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load cart');
      navigate(routes.cart());
    } finally {
      setLoading(false);
    }
  };

  const handleAddressSubmit = async (address: Address) => {
    setIsReserving(true);
    try {
      // Generate idempotency key for this order
      const idempotencyKey = uuidv4();
      
      // Place order - server handles reservation internally
      const response = await placeOrder(address, shippingMethod, idempotencyKey);
      
      toast.success('Order placed successfully!');
      
      // Navigate to success page
      navigate(routes.success(response.orderId));
    } catch (error: any) {
      setIsReserving(false);
      
      if (error.status === 409) {
        toast.error('Some items are out of stock. Please check your cart.');
        setTimeout(() => navigate(routes.cart()), 2000);
      } else {
        toast.error(error.message || 'Failed to place order');
      }
    }
  };

  const handleReserveStock = () => {
    // Trigger form submission
    if (addressFormRef.current) {
      const form = addressFormRef.current.querySelector('form') as HTMLFormElement;
      if (form) {
        form.requestSubmit();
      }
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Loading text="Loading checkout..." />
      </div>
    );
  }

  if (!cart) {
    return null;
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(routes.cart())}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Cart
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Forms */}
          <div className="lg:col-span-2 space-y-6">
            {/* Address Form */}
            <div className="bg-white rounded-2xl shadow-md p-6" ref={addressFormRef}>
              <AddressForm onSubmit={handleAddressSubmit} />
            </div>

            {/* Shipping Selector */}
            <div className="bg-white rounded-2xl shadow-md p-6">
              <ShippingSelector
                selected={shippingMethod}
                onChange={setShippingMethod}
              />
            </div>
          </div>

          {/* Right Column - Summary */}
          <div className="lg:col-span-1">
            <CheckoutSummary
              items={cart.items}
              subtotal={cart.total}
              shippingMethod={shippingMethod}
              onReserveStock={handleReserveStock}
              isReserving={isReserving}
              showTimer={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
