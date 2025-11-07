import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import Joi from 'joi';
import { User } from '../models/User';
import { RefreshToken } from '../models/RefreshToken';
import { ApiError } from '../utils/ApiError';
import APIResponse from '../helper/apiResponse';
import { HttpStatusCode } from '../helper/enum';

// Helpers to sign tokens
const signAccessToken = (user: { id: string; role?: string }) => {
  const secret = process.env.JWT_ACCESS_SECRET as Secret;
  const options: SignOptions = { expiresIn: (process.env.ACCESS_EXPIRES_IN as any) || '15m' };

  return jwt.sign({ id: user.id, role: user.role }, secret, options);
};

const signRefreshToken = (user: { id: string}) => {
  const secret = process.env.JWT_REFRESH_SECRET as Secret;
  const options: SignOptions = { expiresIn: (process.env.REFRESH_EXPIRES_IN as any) || '7d' };

  return jwt.sign({ id: user.id }, secret, options);
};

const registerSchema = Joi.object({
  name: Joi.string().min(2).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error } = registerSchema.validate(req.body);
    if (error) return next(new ApiError(400, error.message));

    const { name, email, password } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return next(new ApiError(400, 'User already exists'));

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed });

    const accessToken = signAccessToken({ id: user._id.toString(), role: user.role });
    const refreshToken = signRefreshToken({ id: user._id.toString() });

    // save refresh token to DB
    const expiresAt = new Date(Date.now() + (parseDuration(process.env.REFRESH_EXPIRES_IN || '7d')));
    await RefreshToken.create({ user: user._id, token: refreshToken, expiresAt });

    // set httpOnly cookie for refresh token
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
    });

    res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role }, token: accessToken });
  } catch (err) {
    next(err);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error } = loginSchema.validate(req.body);
    if (error) return next(new ApiError(400, error.message));

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

    const expiresAt = new Date(Date.now() + (parseDuration(process.env.REFRESH_EXPIRES_IN || '7d')));
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
      maxAge: 1000 * 60 * 60 * 24 * 7
    });
    APIResponse(res, true, HttpStatusCode.OK, 'Login successful..!', { user: { id: user._id, name: user.name, email: user.email, role: user.role }, token: accessToken });
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
    if (!rToken) return next(new ApiError(401, 'No refresh token'));

    // verify token signature
    let payload: any;
    try {
      payload = jwt.verify(rToken, process.env.JWT_REFRESH_SECRET || '');
    } catch (err) {
      return next(new ApiError(401, 'Invalid refresh token'));
    }

    // ensure token exists in DB
    const record = await RefreshToken.findOne({ token: rToken });
    if (!record) return next(new ApiError(401, 'Refresh token not found'));

    // create new access token
    const userId = payload.id;
    const accessToken = signAccessToken({ id: userId });

    res.json({ token: accessToken });
  } catch (err) {
    next(err);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rToken = req.cookies?.refreshToken;
    if (rToken) {
      await RefreshToken.deleteOne({ token: rToken });
      res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'lax', secure: process.env.COOKIE_SECURE === 'true' });
    }
    res.json({ message: 'Logged out' });
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
    case 's': return n * 1000;
    case 'm': return n * 60 * 1000;
    case 'h': return n * 60 * 60 * 1000;
    case 'd': return n * 24 * 60 * 60 * 1000;
    default: return n * 60 * 1000;
  }
}
