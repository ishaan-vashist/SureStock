import { Outlet } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import ToastContainer from '../components/common/ToastContainer';
import { useToast } from '../hooks/useToast';
import { createContext, useContext } from 'react';
import type { ToastType } from '../components/common/Toast';

// Create Toast Context for global toast access
interface ToastContextType {
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  showToast: (type: ToastType, message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useGlobalToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useGlobalToast must be used within AppLayout');
  }
  return context;
}

export default function AppLayout() {
  const { toasts, closeToast, success, error, warning, info, showToast } = useToast();

  // TODO: Get actual cart count from cart context/hook
  const cartItemCount = 0;

  return (
    <ToastContext.Provider value={{ success, error, warning, info, showToast }}>
      <div className="min-h-screen flex flex-col">
        <Navbar cartItemCount={cartItemCount} />
        <main className="flex-1">
          <Outlet />
        </main>
        <Footer />
        <ToastContainer toasts={toasts} onClose={closeToast} />
      </div>
    </ToastContext.Provider>
  );
}
