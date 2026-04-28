import { Request, Response, NextFunction } from 'express';
import Expense, { IExpense } from '../models/Expense';
import { AppError } from '../utils/AppError';
import redis from '../config/redis';

// ─── CreateExpenseBody DTO ────────────────────────────────────────────────────
interface CreateExpenseBody {
  amount: number;
  category: string;
  description: string;
  date: string;
}

// ─── createExpense ────────────────────────────────────────────────────────────
// POST /api/expenses
// Creates a new expense entry, with strict idempotency checks.
export const createExpense = async (
  req: Request<object, object, CreateExpenseBody>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { amount, category, description, date } = req.body;
    const userId = req.user!._id; // `req.user` is guaranteed by `protect` middleware

    // 1. Idempotency Check
    // The frontend must provide an Idempotency-Key header (usually a UUID generated per form session).
    const idempotencyKey = req.header('Idempotency-Key');

    if (!idempotencyKey) {
      throw new AppError('Idempotency-Key header is required.', 400);
    }

    // Check if an expense with this exact idempotency key already exists for this user.
    const existingExpense = await Expense.findOne({ user: userId, idempotencyKey });

    if (existingExpense) {
      // Return the previously created expense with a 200 OK (not 201 Created),
      // so the client knows it was a successful duplicate request, not a new one.
      res.status(200).json({
        status: 'success',
        message: 'Returning existing record due to idempotency key match.',
        data: { expense: existingExpense },
      });
      return;
    }

    // 2. Validate core fields before DB validation to provide clearer errors
    if (amount === undefined || !category || !description || !date) {
      throw new AppError('Please provide amount, category, description, and date.', 400);
    }

    // 3. Create Expense
    // We pass the idempotency key to save it in the DB.
    // The `amount` should be in integer format (e.g., paise) as per our DB schema constraint.
    const newExpense = await Expense.create({
      user: userId,
      amount,
      category,
      description,
      date,
      idempotencyKey,
    });

    // CRITICAL: Invalidate the user's expense cache so the new item shows up
    // We scan or delete keys matching `expenses:${userId}:*`
    try {
      const keys = await redis.keys(`expenses:${userId}:*`);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (redisErr) {
      console.error('Failed to invalidate cache:', redisErr);
    }

    res.status(201).json({
      status: 'success',
      data: { expense: newExpense },
    });
  } catch (error) {
    next(error);
  }
};

// ─── getExpenses ──────────────────────────────────────────────────────────────
// GET /api/expenses
// Returns a list of expenses for the logged-in user.
// Supports `category` filter and `sort=date_desc` sorting.
export const getExpenses = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { category, sort } = req.query;

    // Define a unique cache key based on the user and their exact query parameters
    const cacheKey = `expenses:${userId}:cat_${category || 'all'}:sort_${sort || 'date_desc'}`;

    try {
      // 1. Try to fetch from Redis Cache
      const cachedExpenses = await redis.get(cacheKey);
      
      if (cachedExpenses) {
        res.status(200).json({
          status: 'success',
          results: JSON.parse(cachedExpenses).length,
          source: 'cache',
          data: { expenses: JSON.parse(cachedExpenses) },
        });
        return;
      }
    } catch (redisErr) {
      console.error('Redis GET error:', redisErr);
      // Fallback to database if Redis fails
    }

    // Build the query object
    const filter: any = { user: userId };
    
    if (category) {
      filter.category = category;
    }

    // Initialize Mongoose Query
    let query = Expense.find(filter);

    // Apply Sorting
    if (sort === 'date_desc') {
      query = query.sort({ date: -1 }); // Newest first
    } else if (sort === 'date_asc') {
      query = query.sort({ date: 1 }); // Oldest first
    } else {
      query = query.sort({ date: -1 }); // Default to Newest first
    }

    const expenses = await query;

    // 2. Save result to cache (expires in 10 minutes)
    try {
      await redis.set(cacheKey, JSON.stringify(expenses), 'EX', 600);
    } catch (redisErr) {
      console.error('Redis SET error:', redisErr);
    }

    res.status(200).json({
      status: 'success',
      results: expenses.length,
      source: 'database',
      data: { expenses },
    });
  } catch (error) {
    next(error);
  }
};
