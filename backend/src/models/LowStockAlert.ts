import mongoose, { Schema, Document } from 'mongoose';

export interface ILowStockAlert extends Document {
  productId: mongoose.Types.ObjectId;
  stockAfter: number;
  threshold: number;
  processed: boolean;
  createdAt: Date;
}

const LowStockAlertSchema = new Schema<ILowStockAlert>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    stockAfter: {
      type: Number,
      required: true,
      min: [0, 'Stock cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Stock must be an integer',
      },
    },
    threshold: {
      type: Number,
      required: true,
      min: [0, 'Threshold cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Threshold must be an integer',
      },
    },
    processed: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for querying unprocessed alerts
LowStockAlertSchema.index({ processed: 1, createdAt: -1 });

export const LowStockAlert = mongoose.model<ILowStockAlert>('LowStockAlert', LowStockAlertSchema);
