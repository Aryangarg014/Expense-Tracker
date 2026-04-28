import { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import { generateToken } from '../middleware/auth';
import { AppError } from '../utils/AppError';

// ─── RegisterBody DTO ─────────────────────────────────────────────────────────
// DTO = Data Transfer Object. Describes what the client must send in the body.
// TypeScript will enforce this shape when we destructure the request body.
interface RegisterBody {
  name: string;
  email: string;
  password: string;
}

// ─── LoginBody DTO ────────────────────────────────────────────────────────────
interface LoginBody {
  email: string;
  password: string;
}

// ─── sendTokenResponse ────────────────────────────────────────────────────────
// Helper — generates a token and sends a consistent response shape for both
// register and login so we don't repeat ourselves (DRY principle).
const sendTokenResponse = (
  res: Response,
  statusCode: number,
  userId: string,
  userName: string,
  userEmail: string
): void => {
  const token = generateToken(userId);

  res.status(statusCode).json({
    status: 'success',
    token,         // the JWT — client stores this and sends it in future requests
    user: {
      id: userId,
      name: userName,
      email: userEmail,
    },
  });
};

// ─── register ─────────────────────────────────────────────────────────────────
// POST /api/auth/register
// Creates a new user. Password is hashed by the User model's pre-save hook.
export const register = async (
  req: Request<object, object, RegisterBody>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    // Basic presence validation — Mongoose schema handles the rest
    if (!name || !email || !password) {
      throw new AppError('Please provide name, email, and password.', 400);
    }

    // Check if email is already taken — give a clear message, not a raw DB error
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new AppError('An account with this email already exists.', 409);
    }

    const user = await User.create({ name, email, password });

    // user._id is a Mongoose ObjectId — .toString() converts it to a plain string
    sendTokenResponse(res, 201, user._id.toString(), user.name, user.email);
  } catch (error) {
    next(error);
  }
};

// ─── login ────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// Verifies credentials and returns a JWT on success.
export const login = async (
  req: Request<object, object, LoginBody>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Please provide email and password.', 400);
    }

    // We must explicitly select password because the schema has select:false
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      // Use the same vague message for both cases — don't reveal which is wrong
      throw new AppError('Invalid email or password.', 401);
    }

    sendTokenResponse(res, 200, user._id.toString(), user.name, user.email);
  } catch (error) {
    next(error);
  }
};
