"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimitErrorHandler = exports.asyncHandler = exports.notFoundHandler = exports.errorHandler = exports.AppError = void 0;
const multer_1 = __importDefault(require("multer"));
class AppError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
const errorHandler = (error, req, res, next) => {
    let statusCode = 500;
    let message = 'Internal server error';
    let details = undefined;
    // Handle different types of errors
    if (error instanceof AppError) {
        statusCode = error.statusCode;
        message = error.message;
    }
    else if (error instanceof multer_1.default.MulterError) {
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
    }
    else if (error.name === 'ValidationError') {
        statusCode = 400;
        message = 'Validation error';
        details = error.details || error.message;
    }
    else if (error.name === 'CastError') {
        statusCode = 400;
        message = 'Invalid data format';
    }
    else if (error.code === 11000) {
        statusCode = 400;
        message = 'Duplicate entry';
    }
    else if (error.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
    }
    else if (error.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
    }
    else if (error.code === 'ENOENT') {
        statusCode = 404;
        message = 'File not found';
    }
    else if (error.code === 'EACCES') {
        statusCode = 403;
        message = 'Permission denied';
    }
    else if (error.message) {
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
    const errorResponse = {
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
exports.errorHandler = errorHandler;
const notFoundHandler = (req, res, next) => {
    const error = new AppError(`Route ${req.originalUrl} not found`, 404);
    next(error);
};
exports.notFoundHandler = notFoundHandler;
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
// Rate limiting error handler
const rateLimitErrorHandler = (req, res) => {
    res.status(429).json({
        success: false,
        error: 'Too many requests, please try again later',
        timestamp: new Date().toISOString(),
        path: req.path,
    });
};
exports.rateLimitErrorHandler = rateLimitErrorHandler;
//# sourceMappingURL=error.middleware.js.map