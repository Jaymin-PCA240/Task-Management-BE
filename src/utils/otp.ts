import crypto from "crypto";

export const generateNumericOTP = (digits = 6) => {
  const max = 10 ** digits;
  const n = Math.floor(Math.random() * max).toString().padStart(digits, "0");
  return n;
};

export const hashOTP = (otp: string) => {
  // use HMAC with server secret to avoid storing plain OTP
  const secret = process.env.OTP_HASH_SECRET || "otp-secret";
  return crypto.createHmac("sha256", secret).update(otp).digest("hex");
};
