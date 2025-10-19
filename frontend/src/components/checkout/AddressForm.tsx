import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Input from '../common/Input';
import type { Address } from '../../types';

const addressSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().regex(/^\d{10}$/, 'Phone must be 10 digits'),
  line1: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  pincode: z.string().regex(/^\d{6}$/, 'Pincode must be 6 digits'),
});

interface AddressFormProps {
  onSubmit: (address: Address) => void;
  defaultValues?: Partial<Address>;
}

export default function AddressForm({ onSubmit, defaultValues }: AddressFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Address>({
    resolver: zodResolver(addressSchema),
    defaultValues,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Shipping Address
      </h2>

      <Input
        label="Full Name"
        {...register('name')}
        error={errors.name?.message}
        required
      />

      <Input
        label="Phone Number"
        type="tel"
        placeholder="10 digits"
        {...register('phone')}
        error={errors.phone?.message}
        required
      />

      <Input
        label="Address Line 1"
        {...register('line1')}
        error={errors.line1?.message}
        required
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="City"
          {...register('city')}
          error={errors.city?.message}
          required
        />

        <Input
          label="State"
          {...register('state')}
          error={errors.state?.message}
          required
        />
      </div>

      <Input
        label="Pincode"
        placeholder="6 digits"
        {...register('pincode')}
        error={errors.pincode?.message}
        required
      />
    </form>
  );
}
