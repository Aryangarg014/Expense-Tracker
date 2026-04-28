import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

// ─── IUser Interface ──────────────────────────────────────────────────────────
// A TypeScript interface that describes the shape of a User document.
// Extending Document gives us access to Mongoose methods like .save(), ._id etc.
export interface IUser extends Document {
  name: string;
  email: string;
  password: string;     // stored as bcrypt hash — never plaintext
  createdAt: Date;
  updatedAt: Date;

  // Method to compare a plain password against the stored hash at login
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// ─── Schema ───────────────────────────────────────────────────────────────────
const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name must be 100 characters or fewer'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,       // MongoDB enforces one account per email
      lowercase: true,    // normalize to lowercase before saving
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,      // never returned in query results by default (security)
    },
  },
  {
    timestamps: true,     // auto-adds createdAt and updatedAt
  }
);

// ─── Pre-save Hook ────────────────────────────────────────────────────────────
// Hash the password ONLY when it has been modified.
// This prevents re-hashing an already-hashed password on unrelated updates.
userSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12); // 12 rounds = strong yet fast enough
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ─── Instance Method ──────────────────────────────────────────────────────────
// comparePassword is used at login to verify the entered password.
// bcrypt.compare is timing-safe — never compare passwords with ===
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// ─── Model ───────────────────────────────────────────────────────────────────
// Mongoose pluralises 'User' → collection name is 'users' in MongoDB
const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);
export default User;
