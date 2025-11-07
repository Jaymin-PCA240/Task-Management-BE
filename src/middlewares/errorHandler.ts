import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  const statusCode = err instanceof ApiError ? err.statusCode : err.status || 500;
  const message =
    err instanceof ApiError
      ? err.message
      : err.message || 'Something went wrong. Please try again later.';

  const response: Record<string, any> = {
    success: false,
    message,
  };

  if (process.env.NODE_ENV !== 'production') {
    response.error = {
      stack: err.stack,
      name: err.name,
      ...(err.errors && { details: err.errors }),
    };
    console.error('[ErrorHandler]', err);
  }

  res.status(statusCode).json(response);
};
