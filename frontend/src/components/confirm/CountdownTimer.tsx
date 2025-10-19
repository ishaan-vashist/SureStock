import { useEffect, useState } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { formatCountdown } from '../../utils/format';

interface CountdownTimerProps {
  expiresAt: string;
  onExpired: () => void;
}

export default function CountdownTimer({ expiresAt, onExpired }: CountdownTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    const calculateSecondsLeft = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const diff = Math.max(0, Math.floor((expiry - now) / 1000));
      return diff;
    };

    // Initial calculation
    const initial = calculateSecondsLeft();
    setSecondsLeft(initial);

    if (initial === 0) {
      onExpired();
      return;
    }

    // Update every second
    const interval = setInterval(() => {
      const remaining = calculateSecondsLeft();
      setSecondsLeft(remaining);

      if (remaining === 0) {
        clearInterval(interval);
        onExpired();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpired]);

  const isWarning = secondsLeft < 120; // Less than 2 minutes
  const isExpired = secondsLeft === 0;

  return (
    <div
      className={`rounded-2xl p-6 text-center ${
        isExpired
          ? 'bg-red-50 border-2 border-error'
          : isWarning
          ? 'bg-orange-50 border-2 border-warning'
          : 'bg-blue-50 border-2 border-primary'
      }`}
    >
      <div className="flex items-center justify-center gap-3 mb-2">
        {isExpired ? (
          <AlertTriangle className="w-6 h-6 text-error" />
        ) : (
          <Clock className="w-6 h-6 text-primary" />
        )}
        <h3
          className={`text-lg font-semibold ${
            isExpired ? 'text-error' : isWarning ? 'text-warning' : 'text-primary'
          }`}
        >
          {isExpired ? 'Reservation Expired' : 'Time Remaining'}
        </h3>
      </div>

      {!isExpired && (
        <div
          className={`text-4xl font-bold mb-2 ${
            isWarning ? 'text-warning' : 'text-primary'
          }`}
        >
          {formatCountdown(secondsLeft)}
        </div>
      )}

      <p className={`text-sm ${isExpired ? 'text-error' : 'text-gray-600'}`}>
        {isExpired
          ? 'Your reservation has expired. Please reserve again.'
          : isWarning
          ? 'Hurry! Complete your order soon.'
          : 'Your items are reserved. Complete your order to confirm.'}
      </p>
    </div>
  );
}
