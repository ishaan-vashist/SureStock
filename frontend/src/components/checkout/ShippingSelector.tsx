import { Truck, Zap } from 'lucide-react';
import { formatPrice } from '../../utils/format';
import type { ShippingMethod } from '../../types';

interface ShippingSelectorProps {
  selected: ShippingMethod;
  onChange: (method: ShippingMethod) => void;
}

const shippingOptions = [
  {
    method: 'standard' as ShippingMethod,
    label: 'Standard Shipping',
    description: '5-7 business days',
    priceCents: 0,
    icon: Truck,
  },
  {
    method: 'express' as ShippingMethod,
    label: 'Express Shipping',
    description: '2-3 business days',
    priceCents: 999,
    icon: Zap,
  },
];

export default function ShippingSelector({ selected, onChange }: ShippingSelectorProps) {
  return (
    <div className="space-y-3">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Shipping Method
      </h2>

      {shippingOptions.map((option) => {
        const Icon = option.icon;
        const isSelected = selected === option.method;

        return (
          <button
            key={option.method}
            type="button"
            onClick={() => onChange(option.method)}
            className={`w-full p-4 rounded-2xl border-2 transition-all text-left ${
              isSelected
                ? 'border-primary bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  isSelected ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                <Icon className="w-6 h-6" />
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-gray-900">
                    {option.label}
                  </span>
                  <span className="font-bold text-gray-900">
                    {option.priceCents === 0 ? 'FREE' : formatPrice(option.priceCents)}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{option.description}</p>
              </div>

              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  isSelected ? 'border-primary' : 'border-gray-300'
                }`}
              >
                {isSelected && (
                  <div className="w-3 h-3 rounded-full bg-primary" />
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
