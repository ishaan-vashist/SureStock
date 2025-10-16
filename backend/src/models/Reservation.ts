import mongoose, { Schema, Document } from 'mongoose';

export interface IReservationItem {
  productId: mongoose.Types.ObjectId;
  sku: string;
  name: string;
  priceCents: number;
  qty: number;
}

export interface IReservation extends Document {
  userId: string;
  status: 'active' | 'consumed' | 'expired' | 'cancelled';
  items: IReservationItem[];
  address: Record<string, unknown>;
  shippingMethod: string;
  expiresAt: Date;
  createdAt: Date;
}

const ReservationItemSchema = new Schema<IReservationItem>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    sku: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    priceCents: {
      type: Number,
      required: true,
      min: [1, 'Price must be positive'],
    },
    qty: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
      max: [5, 'Quantity cannot exceed 5'],
      validate: {
        validator: Number.isInteger,
        message: 'Quantity must be an integer',
      },
    },
  },
  { _id: false }
);

const ReservationSchema = new Schema<IReservation>(
  {
    userId: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'consumed', 'expired', 'cancelled'],
      required: true,
      default: 'active',
    },
    items: {
      type: [ReservationItemSchema],
      required: true,
      validate: {
        validator: (items: IReservationItem[]) => items.length > 0,
        message: 'Reservation must have at least one item',
      },
    },
    address: {
      type: Schema.Types.Mixed,
      required: true,
    },
    shippingMethod: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
ReservationSchema.index({ status: 1, expiresAt: 1 });
ReservationSchema.index({ userId: 1, status: 1 });

export const Reservation = mongoose.model<IReservation>('Reservation', ReservationSchema);
