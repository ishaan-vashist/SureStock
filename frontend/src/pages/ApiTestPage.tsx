import { useState } from 'react';
import { getCart } from '../api/cart';
import { listProducts } from '../api/products';
import { listAlerts } from '../api/admin';
import Button from '../components/common/Button';
import Loading from '../components/common/Loading';
import { useGlobalToast } from '../layouts/AppLayout';
import type { Cart, Product, Alert } from '../types';

export default function ApiTestPage() {
  const [loading, setLoading] = useState(false);
  const [cart, setCart] = useState<Cart | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const toast = useGlobalToast();

  const testGetCart = async () => {
    setLoading(true);
    try {
      const data = await getCart();
      setCart(data);
      toast.success('Cart fetched successfully!');
      console.log('Cart:', data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch cart');
      console.error('Cart error:', error);
    } finally {
      setLoading(false);
    }
  };

  const testListProducts = async () => {
    setLoading(true);
    try {
      const data = await listProducts();
      setProducts(data);
      toast.success(`Fetched ${data.length} products!`);
      console.log('Products:', data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch products');
      console.error('Products error:', error);
    } finally {
      setLoading(false);
    }
  };

  const testListAlerts = async () => {
    setLoading(true);
    try {
      const data = await listAlerts();
      setAlerts(data);
      toast.success(`Fetched ${data.length} alerts!`);
      console.log('Alerts:', data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch alerts');
      console.error('Alerts error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">API Integration Test</h1>
      
      <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Test API Endpoints</h2>
        <p className="text-gray-600 mb-4">
          Click the buttons below to test API integration. Check the browser console for detailed logs.
        </p>
        
        <div className="flex flex-wrap gap-3">
          <Button onClick={testGetCart} disabled={loading}>
            Test Get Cart
          </Button>
          <Button onClick={testListProducts} disabled={loading} variant="secondary">
            Test List Products
          </Button>
          <Button onClick={testListAlerts} disabled={loading} variant="outline">
            Test List Alerts
          </Button>
        </div>
      </div>

      {loading && <Loading text="Loading..." />}

      {cart && (
        <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold mb-3">Cart Data</h3>
          <pre className="bg-gray-50 p-4 rounded-lg overflow-auto text-sm">
            {JSON.stringify(cart, null, 2)}
          </pre>
        </div>
      )}

      {products.length > 0 && (
        <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold mb-3">Products ({products.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product) => (
              <div key={product._id} className="border border-gray-200 rounded-lg p-4">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-32 object-cover rounded-lg mb-2"
                />
                <h4 className="font-semibold">{product.name}</h4>
                <p className="text-sm text-gray-600">{product.sku}</p>
                <p className="text-primary font-bold">
                  ${(product.priceCents / 100).toFixed(2)}
                </p>
                <p className="text-sm text-gray-600">
                  Available: {product.available} / {product.stock}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {alerts.length > 0 && (
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h3 className="text-lg font-semibold mb-3">Alerts ({alerts.length})</h3>
          <pre className="bg-gray-50 p-4 rounded-lg overflow-auto text-sm">
            {JSON.stringify(alerts, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
