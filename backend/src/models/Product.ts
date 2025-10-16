import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  sku: string;
  name: string;
  priceCents: number;
  stock: number;
  reserved: number;
  lowStockThreshold: number;
  image: string;
  createdAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    sku: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    priceCents: {
      type: Number,
      required: true,
      min: [1, 'Price must be positive'],
      validate: {
        validator: Number.isInteger,
        message: 'Price must be an integer',
      },
    },
    stock: {
      type: Number,
      required: true,
      min: [0, 'Stock cannot be negative'],
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Stock must be an integer',
      },
    },
    reserved: {
      type: Number,
      required: true,
      min: [0, 'Reserved cannot be negative'],
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Reserved must be an integer',
      },
    },
    lowStockThreshold: {
      type: Number,
      required: true,
      min: [0, 'Threshold cannot be negative'],
      default: 10,
      validate: {
        validator: Number.isInteger,
        message: 'Threshold must be an integer',
      },
    },
    image: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual field for available stock (not stored in DB)
ProductSchema.virtual('available').get(function () {
  return this.stock - this.reserved;
});

// Ensure virtuals are included in JSON
ProductSchema.set('toJSON', { virtuals: true });
ProductSchema.set('toObject', { virtuals: true });

export const Product = mongoose.model<IProduct>('Product', ProductSchema);
