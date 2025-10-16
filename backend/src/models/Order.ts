import mongoose, { Schema, Document } from 'mongoose';

export interface IOrderItem {
  productId: mongoose.Types.ObjectId;
  sku: string;
  name: string;
  priceCents: number;
  qty: number;
}

export interface IOrder extends Document {
  userId: string;
  status: 'created' | 'cancelled';
  items: IOrderItem[];
  address: Record<string, unknown>;
  shippingMethod: string;
  totalCents: number;
  createdAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>(
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
      validate: {
        validator: Number.isInteger,
        message: 'Quantity must be an integer',
      },
    },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    userId: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['created', 'cancelled'],
      required: true,
      default: 'created',
    },
    items: {
      type: [OrderItemSchema],
      required: true,
      validate: {
        validator: (items: IOrderItem[]) => items.length > 0,
        message: 'Order must have at least one item',
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
    totalCents: {
      type: Number,
      required: true,
      min: [0, 'Total cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Total must be an integer',
      },
    },
  },
  {
    timestamps: true,
  }
);

// Index for user order history queries
OrderSchema.index({ userId: 1, createdAt: -1 });

export const Order = mongoose.model<IOrder>('Order', OrderSchema);
