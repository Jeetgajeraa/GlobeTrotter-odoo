import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createResponse } from '../utils/api-response.js';
import { JwtPayload } from '../types/express.js';

const JWT_SECRET = process.env.JWT_SECRET || 'globetrotter_secret_key_2026_super_secure_jwt_token_auth';

export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    res.status(401).json(createResponse(false, 'Access token is missing or invalid', null));
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json(createResponse(false, 'Invalid or expired token', null));
    return;
  }
};

export const optionalAuthenticateToken = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
      req.user = decoded;
    } catch {
      // Ignore invalid token on optional routes
    }
  }

  next();
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json(createResponse(false, 'Unauthorized access', null));
    return;
  }

  if (req.user.role !== 'ADMIN') {
    res.status(403).json(createResponse(false, 'Forbidden: Admin privileges required', null));
    return;
  }

  next();
};


