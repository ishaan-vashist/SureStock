import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

export default function Layout() {
  // TODO: Get actual cart count from cart context/hook
  const cartItemCount = 0;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar cartItemCount={cartItemCount} />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
