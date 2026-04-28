import { Request, Response, NextFunction } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { AppError } from '../utils/AppError';
import User, { IUser } from '../models/User';

// ─── Extend Express Request ───────────────────────────────────────────────────
// By default Express's Request type has no 'user' property.
// This module augmentation adds it so req.user is available in all route
// handlers without any casting. This is the idiomatic TypeScript approach.
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

// ─── JwtPayload ───────────────────────────────────────────────────────────────
// The shape of the data we embed inside the JWT when we sign it.
// 'iat' and 'exp' are added automatically by the jsonwebtoken library.
interface JwtPayload {
  id: string; // MongoDB user _id
  iat: number; // issued-at timestamp
  exp: number; // expiry timestamp
}

// ─── protect ──────────────────────────────────────────────────────────────────
// Middleware applied to any route that requires a logged-in user.
// 1. Reads "Authorization: Bearer <token>" from the request header
// 2. Verifies the token signature and expiry
// 3. Fetches the user from DB and attaches them to req.user
export const protect = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No authentication token provided.', 401);
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new AppError('JWT secret is not configured.', 500);

    // jwt.verify throws if the token is expired or the signature is invalid
    const decoded = jwt.verify(token, secret) as JwtPayload;

    // Confirm the user still exists (could have been deleted after token was issued)
    const user = await User.findById(decoded.id).select('+password');
    if (!user) {
      throw new AppError('The user belonging to this token no longer exists.', 401);
    }

    req.user = user; // attach to request for downstream handlers
    next();
  } catch (error) {
    next(error); // forward to global error handler
  }
};

// ─── generateToken ────────────────────────────────────────────────────────────
// Creates a signed JWT that embeds the user's MongoDB _id.
// Called after successful register or login.
export const generateToken = (userId: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT secret is not configured');

  // Cast expiresIn value — process.env returns 'string' but SignOptions
  // expects a specific 'StringValue' type. The cast is safe here.
  const options: SignOptions = {
    expiresIn: (process.env.JWT_EXPIRES_IN ?? '7d') as SignOptions['expiresIn'],
  };

  return jwt.sign({ id: userId }, secret, options);
};
