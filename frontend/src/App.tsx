import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import HomePage from './pages/HomePage';
import ItemsPage from './pages/ItemsPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import ConfirmPage from './pages/ConfirmPage';
import OrderPage from './pages/OrderPage';
import AdminAlertsPage from './pages/AdminAlertsPage';
import ApiTestPage from './pages/ApiTestPage';
import NotFoundPage from './pages/NotFoundPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="/items" element={<ItemsPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/confirm/:reservationId" element={<ConfirmPage />} />
          <Route path="/order/:orderId" element={<OrderPage />} />
          <Route path="/admin/alerts" element={<AdminAlertsPage />} />
          <Route path="/api-test" element={<ApiTestPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
