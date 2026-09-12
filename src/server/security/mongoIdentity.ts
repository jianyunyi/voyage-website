import mongoose from 'mongoose';

export function normalizeOptionalObjectId(value: unknown): mongoose.Types.ObjectId | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!mongoose.Types.ObjectId.isValid(trimmed)) return undefined;
  return new mongoose.Types.ObjectId(trimmed);
}
