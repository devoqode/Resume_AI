import { Request, Response, NextFunction } from 'express';
import multer from 'multer';

interface ErrorResponse {
  success: false;
  error: string;
  details?: any;
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
  error: Error | AppError | any,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal server error';
  let details: any = undefined;

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
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation error';
    details = error.details || error.message;
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid data format';
  } else if (error.code === 11000) {
    statusCode = 400;
    message = 'Duplicate entry';
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  } else if (error.code === 'ENOENT') {
    statusCode = 404;
    message = 'File not found';
  } else if (error.code === 'EACCES') {
    statusCode = 403;
    message = 'Permission denied';
  } else if (error.message) {
    message = error.message;
  }

  // Log error for debugging (in production, you might want to use a proper logger)
  if (statusCode >= 500) {
    console.error('Server Error:', {
      error: message,
      stack: error.stack,
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
  if (process.env.NODE_ENV === 'development' && error.stack) {
    errorResponse.details = {
      ...errorResponse.details,
      stack: error.stack,
    };
  }

  res.status(statusCode).json(errorResponse);
};

export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404);
  next(error);
};

export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) => {
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
