import { Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { AuthenticatedRequest } from '../types';

interface JWTPayload extends JwtPayload {
  userId: string;
  email: string;
}

export const authenticateToken = (jwtSecret: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'Access token is required' 
      });
    }

    try {
      const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
      req.userId = decoded.userId;
      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return res.status(401).json({ 
          success: false, 
          error: 'Token has expired' 
        });
      } else if (error instanceof jwt.JsonWebTokenError) {
        return res.status(403).json({ 
          success: false, 
          error: 'Invalid token' 
        });
      } else {
        return res.status(500).json({ 
          success: false, 
          error: 'Token verification failed' 
        });
      }
    }
  };
};

export const optionalAuth = (jwtSecret: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      // No token provided, continue without authentication
      next();
      return;
    }

    try {
      const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
      req.userId = decoded.userId;
      next();
    } catch (error) {
      // Invalid token, but continue anyway (optional auth)
      console.warn('Optional auth failed:', error);
      next();
    }
  };
};

export const generateToken = (userId: string, email: string, jwtSecret: string, expiresIn: string = '7d'): string => {
  try {
    return jwt.sign({ userId, email }, jwtSecret, { expiresIn } as any);
  } catch (error) {
    throw new Error(`Token generation failed: ${error}`);
  }
};

export const verifyToken = (token: string, jwtSecret: string): JWTPayload | null => {
  try {
    return jwt.verify(token, jwtSecret) as JWTPayload;
  } catch (error) {
    return null;
  }
};
