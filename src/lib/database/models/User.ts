import mongoose, { type Document, type Model } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: 'user' | 'admin';
  phoneEncrypted?: string;
  phoneHash?: string;
  phoneVerifiedAt?: Date;
  avatarAssetId?: string;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new mongoose.Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    phoneEncrypted: {
      type: String,
    },
    phoneHash: {
      type: String,
      unique: true,
      sparse: true,
    },
    phoneVerifiedAt: {
      type: Date,
    },
    avatarAssetId: {
      type: String,
    },
    lastLoginAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

const User: Model<IUser> =
  (mongoose.models.User as Model<IUser>) || mongoose.model<IUser>('User', userSchema);

export default User;
