import mongoose, { Schema, Document } from 'mongoose';

export interface IIdempotencyKey extends Document {
  userId: string;
  endpoint: string;
  key: string;
  requestHash: string;
  status: 'in_progress' | 'succeeded' | 'failed';
  response: Record<string, unknown> | null;
  createdAt: Date;
}

const IdempotencyKeySchema = new Schema<IIdempotencyKey>(
  {
    userId: {
      type: String,
      required: true,
      trim: true,
    },
    endpoint: {
      type: String,
      required: true,
      trim: true,
    },
    key: {
      type: String,
      required: true,
      trim: true,
    },
    requestHash: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['in_progress', 'succeeded', 'failed'],
      required: true,
      default: 'in_progress',
    },
    response: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index for idempotency enforcement
IdempotencyKeySchema.index({ userId: 1, endpoint: 1, key: 1 }, { unique: true });

export const IdempotencyKey = mongoose.model<IIdempotencyKey>(
  'IdempotencyKey',
  IdempotencyKeySchema
);
