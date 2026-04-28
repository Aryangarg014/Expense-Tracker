import { Router } from 'express';
import { register, login } from '../controllers/authController';

const router = Router();

// POST /api/auth/register — create new account
router.post('/register', register);

// POST /api/auth/login — get JWT token
router.post('/login', login);

export default router;
