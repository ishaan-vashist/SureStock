import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { CheckCircle } from 'lucide-react';
import CountdownTimer from '../components/confirm/CountdownTimer';
import ReservationSummary from '../components/confirm/ReservationSummary';
import Loading from '../components/common/Loading';
import Button from '../components/common/Button';
import { useGlobalToast } from '../layouts/AppLayout';
import { getReservation, confirm } from '../api/checkout';
import { routes } from '../utils/urls';
import { getIdempotencyKey, setIdempotencyKey, clearIdempotencyKey } from '../utils/storage';
import type { Reservation } from '../types';

export default function ConfirmPage() {
  const { reservationId } = useParams<{ reservationId: string }>();
  const navigate = useNavigate();
  const toast = useGlobalToast();

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!reservationId) {
      toast.error('Invalid reservation');
      navigate(routes.cart());
      return;
    }

    loadReservation();
  }, [reservationId]);

  const loadReservation = async () => {
    if (!reservationId) return;

    try {
      const data = await getReservation(reservationId);
      
      if (data.status === 'expired') {
        setIsExpired(true);
        toast.warning('Reservation has expired');
      } else if (data.status === 'consumed') {
        toast.info('This reservation has already been used');
        // Could redirect to order page if we have orderId
      }
      
      setReservation(data);
    } catch (error: any) {
      if (error.status === 410) {
        toast.error('Reservation expired');
        setIsExpired(true);
      } else {
        toast.error(error.message || 'Failed to load reservation');
        navigate(routes.checkout());
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExpired = () => {
    setIsExpired(true);
    toast.warning('Your reservation has expired');
  };

  const handleConfirm = async () => {
    if (!reservationId || !reservation || isExpired) return;

    setIsConfirming(true);
    try {
      // Get or generate idempotency key
      let idempotencyKey = getIdempotencyKey(reservationId);
      if (!idempotencyKey) {
        idempotencyKey = uuidv4();
        setIdempotencyKey(reservationId, idempotencyKey);
      }

      const response = await confirm(reservationId, idempotencyKey);
      
      // Clear idempotency key on success
      clearIdempotencyKey(reservationId);
      
      toast.success('Order confirmed successfully!');
      navigate(routes.order(response.orderId));
    } catch (error: any) {
      setIsConfirming(false);
      
      if (error.status === 410) {
        toast.error('Reservation expired. Please reserve again.');
        setIsExpired(true);
      } else if (error.status === 409) {
        toast.error('Some items are out of stock. Please check your cart.');
        setTimeout(() => navigate(routes.cart()), 2000);
      } else {
        toast.error(error.message || 'Failed to confirm order');
      }
    }
  };

  const handleReturnToCheckout = () => {
    if (reservationId) {
      clearIdempotencyKey(reservationId);
    }
    navigate(routes.checkout());
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Loading text="Loading reservation..." />
      </div>
    );
  }

  if (!reservation) {
    return null;
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Confirm Your Order</h1>

        {/* Countdown Timer */}
        <div className="mb-8">
          <CountdownTimer
            expiresAt={reservation.expiresAt}
            onExpired={handleExpired}
          />
        </div>

        {/* Reservation Summary */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
          <ReservationSummary reservation={reservation} />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          {isExpired ? (
            <Button
              onClick={handleReturnToCheckout}
              size="lg"
              className="flex-1"
            >
              Return to Checkout
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleReturnToCheckout}
                size="lg"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                size="lg"
                className="flex-1"
                isLoading={isConfirming}
                disabled={isConfirming || isExpired}
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                Confirm Order
              </Button>
            </>
          )}
        </div>

        <p className="text-sm text-gray-500 text-center mt-6">
          By confirming, you agree to our terms and conditions
        </p>
      </div>
    </div>
  );
}
