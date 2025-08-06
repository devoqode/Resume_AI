import { Request, Response, NextFunction } from 'express';
import multer from 'multer';

interface ErrorResponse {
  success: false;
  error: string;
  details?: unknown;
  timestamp: string;
  path: string;
}

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  error: Error | AppError | unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal server error';
  let details: unknown = undefined;

  // Handle different types of errors
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
  } else if (error instanceof multer.MulterError) {
    statusCode = 400;
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        message = 'File size too large';
        details = { maxSize: '10MB for resumes, 25MB for audio files' };
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files uploaded';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected file field';
        break;
      default:
        message = error.message;
    }
  } else if (error && typeof error === 'object' && 'name' in error && error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation error';
    details = (error as any).details || (error as any).message;
  } else if (error && typeof error === 'object' && 'name' in error && error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid data format';
  } else if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
    statusCode = 400;
    message = 'Duplicate entry';
  } else if (error && typeof error === 'object' && 'name' in error && error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  } else if (error && typeof error === 'object' && 'name' in error && error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  } else if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
    statusCode = 404;
    message = 'File not found';
  } else if (error && typeof error === 'object' && 'code' in error && error.code === 'EACCES') {
    statusCode = 403;
    message = 'Permission denied';
  } else if (error && typeof error === 'object' && 'message' in error) {
    message = (error as any).message;
  }

  // Log error for debugging (in production, you might want to use a proper logger)
  if (statusCode >= 500) {
    console.error('Server Error:', {
      error: message,
      stack: (error as any).stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
      timestamp: new Date().toISOString(),
    });
  }

  const errorResponse: ErrorResponse = {
    success: false,
    error: message,
    timestamp: new Date().toISOString(),
    path: req.path,
  };

  if (details) {
    errorResponse.details = details;
  }

  // Add stack trace in development mode
  if (process.env.NODE_ENV === 'development' && error && typeof error === 'object' && 'stack' in error) {
    errorResponse.details = {
      ...(typeof errorResponse.details === 'object' ? errorResponse.details : {}),
      stack: (error as any).stack,
    };
  }

  res.status(statusCode).json(errorResponse);
};

export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404);
  next(error);
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Rate limiting error handler
export const rateLimitErrorHandler = (req: Request, res: Response): void => {
  res.status(429).json({
    success: false,
    error: 'Too many requests, please try again later',
    timestamp: new Date().toISOString(),
    path: req.path,
  });
};
