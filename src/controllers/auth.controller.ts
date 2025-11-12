import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import Joi from 'joi';
import { User } from '../models/User';
import { RefreshToken } from '../models/RefreshToken';
import APIResponse from '../helper/apiResponse';
import { HttpStatusCode } from '../helper/enum';
import { OTP } from '../models/OTP';
import { generateNumericOTP, hashOTP } from '../utils/otp';
import { sendOTPEmail } from '../utils/mailer';

const OTP_EXPIRES_MIN = Number(process.env.OTP_EXPIRES_MIN || 10);
const RESET_TOKEN_EXPIRES_IN = process.env.RESET_TOKEN_EXPIRES_IN || '15m';
const RESET_SECRET = process.env.JWT_RESET_SECRET || 'reset-secret';

// Helpers to sign tokens
const signAccessToken = (user: { id: string; role?: string }) => {
  const secret = process.env.JWT_ACCESS_SECRET as Secret;
  const options: SignOptions = { expiresIn: (process.env.ACCESS_EXPIRES_IN as any) || '15m' };

  return jwt.sign({ id: user.id, role: user.role }, secret, options);
};

const signRefreshToken = (user: { id: string }) => {
  const secret = process.env.JWT_REFRESH_SECRET as Secret;
  const options: SignOptions = { expiresIn: (process.env.REFRESH_EXPIRES_IN as any) || '7d' };

  return jwt.sign({ id: user.id }, secret, options);
};

const registerSchema = Joi.object({
  name: Joi.string().min(2).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error } = registerSchema.validate(req.body);
    if (error) {
      APIResponse(res, false, HttpStatusCode.BAD_REQUEST, error.message);
      return;
    }

    const { name, email, password } = req.body;
    const exists = await User.findOne({ email });
    if (exists) {
      APIResponse(res, false, HttpStatusCode.BAD_REQUEST, 'User already exists');
      return;
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed });

    const accessToken = signAccessToken({ id: user._id.toString(), role: user.role });
    const refreshToken = signRefreshToken({ id: user._id.toString() });

    // save refresh token to DB
    const expiresAt = new Date(Date.now() + parseDuration(process.env.REFRESH_EXPIRES_IN || '7d'));
    await RefreshToken.create({ user: user._id, token: refreshToken, expiresAt });

    // set httpOnly cookie for refresh token
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    });
    APIResponse(res, true, HttpStatusCode.OK, 'Registration successful..!', {
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      token: accessToken,
    });
  } catch (error) {
    if (error instanceof Joi.ValidationError) {
      APIResponse(res, false, HttpStatusCode.BAD_REQUEST, error.details[0].message);
    } else {
      return next(error);
    }
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error } = loginSchema.validate(req.body);
    if (error) {
      APIResponse(res, false, HttpStatusCode.BAD_REQUEST, error.message);
      return;
    }

    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      APIResponse(res, false, HttpStatusCode.BAD_REQUEST, 'Invalid username or password..!');
      return;
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      APIResponse(res, false, HttpStatusCode.BAD_REQUEST, 'Invalid username or password..!');
      return;
    }

    const accessToken = signAccessToken({ id: user._id.toString(), role: user.role });
    const refreshToken = signRefreshToken({ id: user._id.toString() });

    const expiresAt = new Date(Date.now() + parseDuration(process.env.REFRESH_EXPIRES_IN || '7d'));
    // Check for existing refresh token
    const existingToken = await RefreshToken.findOne({ user: user._id });
    if (existingToken) {
      existingToken.token = refreshToken;
      existingToken.expiresAt = expiresAt;
      await existingToken.save();
    } else {
      await RefreshToken.create({ user: user._id, token: refreshToken, expiresAt });
    }

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });
    APIResponse(res, true, HttpStatusCode.OK, 'Login successful..!', {
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      token: accessToken,
    });
  } catch (error: unknown) {
    if (error instanceof Joi.ValidationError) {
      APIResponse(res, false, HttpStatusCode.BAD_REQUEST, error.details[0].message);
    } else {
      return next(error);
    }
  }
};

// refresh handler — uses refresh token cookie
export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rToken = req.cookies?.refreshToken;
    if (!rToken) {
      APIResponse(res, false, HttpStatusCode.UNAUTHORIZED, 'No refresh token provided');
      return;
    }

    // verify token signature
    let payload: any;
    try {
      payload = jwt.verify(rToken, process.env.JWT_REFRESH_SECRET || '');
    } catch (err) {
      APIResponse(res, false, HttpStatusCode.UNAUTHORIZED, 'Invalid or expired refresh token');
      return;
    }

    // ensure token exists in DB
    const record = await RefreshToken.findOne({ token: rToken });
    if (!record) {
      APIResponse(res, false, HttpStatusCode.UNAUTHORIZED, 'Refresh token not found');
      return;
    }

    // create new access token
    const userId = payload.id;
    const accessToken = signAccessToken({ id: userId });
    APIResponse(res, true, HttpStatusCode.OK, 'Access token refreshed successfully', {
      token: accessToken,
    });

    res.json();
  } catch (err) {
    next(err);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rToken = req.cookies?.refreshToken;
    if (rToken) {
      await RefreshToken.deleteOne({ token: rToken });
      res.clearCookie('refreshToken', {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.COOKIE_SECURE === 'true',
      });
    }
    APIResponse(res, true, HttpStatusCode.OK, 'Logged out successful..!');
  } catch (err) {
    next(err);
  }
};

function parseDuration(str: string) {
  const match = /^(\d+)([smhd])$/.exec(str);
  if (!match) {
    return 1000 * 60 * Number(str);
  }
  const n = Number(match[1]);
  const unit = match[2];
  switch (unit) {
    case 's':
      return n * 1000;
    case 'm':
      return n * 60 * 1000;
    case 'h':
      return n * 60 * 60 * 1000;
    case 'd':
      return n * 24 * 60 * 60 * 1000;
    default:
      return n * 60 * 1000;
  }
}

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return APIResponse(res, false, HttpStatusCode.BAD_REQUEST, 'Email is required');

    const user = await User.findOne({ email });
    if (!user) {
      console.log('user', user);
      return APIResponse(res, false, HttpStatusCode.NOT_FOUND, 'Email not exist!');
    }
    // create OTP
    const otp = generateNumericOTP(6);
    const otpHash = hashOTP(otp);
    const expiresAt = new Date(Date.now() + OTP_EXPIRES_MIN * 60 * 1000);

    // remove any prior OTPs for email
    await OTP.deleteMany({ email });

    await OTP.create({ email, otpHash, expiresAt });

    try {
      await sendOTPEmail(email, otp);
    } catch (e) {
      console.error('sendOTPEmail error:', e);
      return APIResponse(
        res,
        true,
        HttpStatusCode.BAD_GATEWAY,
        'OTP sent Failed! Internal server error',
      );
    }

    return APIResponse(res, true, HttpStatusCode.OK, 'OTP sent to email (if it exists)');
  } catch (err) {
    console.error(err);
    return APIResponse(
      res,
      false,
      HttpStatusCode.INTERNAL_SERVER_ERROR,
      'Failed to process request',
    );
  }
};

export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp)
      return APIResponse(res, false, HttpStatusCode.BAD_REQUEST, 'Email and OTP required');

    const record = await OTP.findOne({ email });
    if (!record)
      return APIResponse(res, false, HttpStatusCode.BAD_REQUEST, 'OTP not found or expired');

    if (record.expiresAt < new Date()) {
      await OTP.deleteMany({ email });
      return APIResponse(res, false, HttpStatusCode.BAD_REQUEST, 'OTP expired');
    }

    const otpHash = hashOTP(otp);
    if (otpHash !== record.otpHash) {
      return APIResponse(res, false, HttpStatusCode.BAD_REQUEST, 'Invalid OTP');
    }

    // OTP valid -> delete records and issue reset token
    await OTP.deleteMany({ email });

    const resetToken = jwt.sign({ email }, RESET_SECRET, {
      expiresIn: RESET_TOKEN_EXPIRES_IN as any,
    });

    return APIResponse(res, true, HttpStatusCode.OK, 'OTP verified', { resetToken });
  } catch (err) {
    console.error(err);
    return APIResponse(res, false, HttpStatusCode.INTERNAL_SERVER_ERROR, 'Failed to verify OTP');
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { resetToken, password } = req.body;
    if (!resetToken || !password)
      return APIResponse(res, false, HttpStatusCode.BAD_REQUEST, 'Token and password required');

    let payload: any;
    try {
      payload = jwt.verify(resetToken, RESET_SECRET);
    } catch (e) {
      return APIResponse(res, false, HttpStatusCode.UNAUTHORIZED, 'Invalid or expired reset token');
    }

    const email = payload.email;
    const user = await User.findOne({ email });
    if (!user) return APIResponse(res, false, HttpStatusCode.BAD_REQUEST, 'User not found');

    const hashed = await bcrypt.hash(password, 10);
    user.password = hashed;
    await user.save();

    return APIResponse(res, true, HttpStatusCode.OK, 'Password reset successful');
  } catch (err) {
    console.error(err);
    return APIResponse(
      res,
      false,
      HttpStatusCode.INTERNAL_SERVER_ERROR,
      'Failed to reset password',
    );
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    // @ts-expect-error
    const userId = req.user.id;
    const { name } = req.body;

    const user = await User.findByIdAndUpdate(userId, { name }, { new: true });

    return APIResponse(res, true, 200, 'Profile updated', {
      user: { id: user?._id, name: user?.name, email: user?.email, role: user?.role },
    });
  } catch (err) {
    return APIResponse(res, false, 500, 'Update failed', err);
  }
};
