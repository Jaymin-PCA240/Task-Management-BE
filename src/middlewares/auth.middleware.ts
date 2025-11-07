import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/ApiError';

export interface AuthRequest extends Request {
  user?: { id: string; role?: string };
}

export const auth = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new ApiError(401, 'No token provided');

    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET || '') as any;
    req.user = { id: payload.id, role: payload.role };
    next();
  } catch (err) {
    next(new ApiError(401, 'Unauthorized'));
  }
};
