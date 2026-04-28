import mongoose, { Schema, Document, Model } from 'mongoose';

// ─── Allowed Categories ───────────────────────────────────────────────────────
// 'as const' makes this a readonly tuple so TypeScript can derive a union type
// from the values. The array is also used at runtime for Mongoose enum validation.
export const EXPENSE_CATEGORIES = [
  'Food',
  'Transport',
  'Shopping',
  'Entertainment',
  'Health',
  'Utilities',
  'Other',
] as const;

// ExpenseCategory = "Food" | "Transport" | "Shopping" | ... (derived automatically)
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

// ─── IExpense Interface ───────────────────────────────────────────────────────
// Describes the shape of a single Expense document in MongoDB.
export interface IExpense extends Document {
  user: mongoose.Types.ObjectId; // which user this expense belongs to

  // CRITICAL: amount stored as INTEGER (paise).
  // ₹123.45 → stored as 12345. This eliminates JS floating-point bugs.
  // (0.1 + 0.2 = 0.30000000000000004 in JS — never use floats for money)
  amount: number;

  category: ExpenseCategory;
  description: string;
  date: Date;

  // CRITICAL: idempotencyKey prevents duplicate submissions.
  // Frontend generates a UUID per form load and sends it as a header.
  // If this key already exists for this user → return existing record, don't insert.
  idempotencyKey: string;

  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────
const expenseSchema = new Schema<IExpense>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',          // enables Mongoose .populate('user') if ever needed
      required: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [1, 'Amount must be at least 1 (₹0.01 minimum)'],
      validate: {
        // Extra safety: ensure no decimal slips through to the DB
        validator: (v: number) => Number.isInteger(v),
        message: 'Amount must be an integer (in paise, not rupees)',
      },
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: EXPENSE_CATEGORIES,
        message: `Category must be one of: ${EXPENSE_CATEGORIES.join(', ')}`,
      },
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [500, 'Description must be 500 characters or fewer'],
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
    },
    idempotencyKey: {
      type: String,
      required: [true, 'Idempotency key is required'],
    },
  },
  {
    timestamps: true, // auto-adds createdAt and updatedAt
  }
);

// ─── CRITICAL: Database Indexes ───────────────────────────────────────────────

// Speeds up "show all Food expenses for user X" queries
expenseSchema.index({ user: 1, category: 1 });

// Speeds up "sort by date newest first for user X" queries
expenseSchema.index({ user: 1, date: -1 });

// UNIQUE compound index: MongoDB itself blocks a second insert with the same
// (user + idempotencyKey) pair — this is the DB-level idempotency guarantee.
expenseSchema.index({ user: 1, idempotencyKey: 1 }, { unique: true });

// ─── Model ───────────────────────────────────────────────────────────────────
const Expense: Model<IExpense> = mongoose.model<IExpense>('Expense', expenseSchema);
export default Expense;
