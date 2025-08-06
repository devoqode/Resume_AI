"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = exports.generateToken = exports.optionalAuth = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authenticateToken = (jwtSecret) => {
    return (req, res, next) => {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Access token is required'
            });
        }
        try {
            const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
            req.userId = decoded.userId;
            next();
        }
        catch (error) {
            if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
                return res.status(401).json({
                    success: false,
                    error: 'Token has expired'
                });
            }
            else if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
                return res.status(403).json({
                    success: false,
                    error: 'Invalid token'
                });
            }
            else {
                return res.status(500).json({
                    success: false,
                    error: 'Token verification failed'
                });
            }
        }
    };
};
exports.authenticateToken = authenticateToken;
const optionalAuth = (jwtSecret) => {
    return (req, res, next) => {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) {
            // No token provided, continue without authentication
            next();
            return;
        }
        try {
            const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
            req.userId = decoded.userId;
            next();
        }
        catch (error) {
            // Invalid token, but continue anyway (optional auth)
            console.warn('Optional auth failed:', error);
            next();
        }
    };
};
exports.optionalAuth = optionalAuth;
const generateToken = (userId, email, jwtSecret, expiresIn = '7d') => {
    try {
        return jsonwebtoken_1.default.sign({ userId, email }, jwtSecret, { expiresIn });
    }
    catch (error) {
        throw new Error(`Token generation failed: ${error}`);
    }
};
exports.generateToken = generateToken;
const verifyToken = (token, jwtSecret) => {
    try {
        return jsonwebtoken_1.default.verify(token, jwtSecret);
    }
    catch (error) {
        return null;
    }
};
exports.verifyToken = verifyToken;
//# sourceMappingURL=auth.middleware.js.map