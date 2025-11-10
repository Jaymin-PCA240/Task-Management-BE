import mongoose, { Document, Schema } from "mongoose";

export interface IOTP extends Document {
  email: string;
  otpHash: string;
  expiresAt: Date;
  createdAt: Date;
}

const OTPSchema = new Schema<IOTP>({
  email: { type: String, required: true, index: true },
  otpHash: { type: String, required: true },
  expiresAt: { type: Date, required: true, index: true },
}, { timestamps: true });

export const OTP = mongoose.model<IOTP>("OTP", OTPSchema);
