import bcrypt from 'bcrypt';
import { ObjectId, OptionalId } from 'mongodb';
import { Router } from 'express';
import { getDB } from '../config/db';
import { AuthRequest, authMiddleware } from '../middlewares/auth.middleware';
import { TokenPayload, UserRole, signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';

type UserDoc = {
  _id?: ObjectId;
  name: string;
  number: string;
  passwordHash: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
};

const router = Router();
const ADMIN_NUMBERS = new Set(['01716285196', '01956854076']);
const SALT_ROUNDS = 10;
const isProduction = process.env.NODE_ENV === 'production';
const refreshCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
} as const;
const clearRefreshCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
} as const;
let indexEnsured = false;

const normalizeNumber = (value: string): string => value.replace(/\D/g, '');

const usersCollection = async () => {
  const collection = getDB().collection<UserDoc>('users');
  if (!indexEnsured) {
    await collection.createIndex({ number: 1 }, { unique: true });
    indexEnsured = true;
  }
  return collection;
};

const toPayload = (user: UserDoc): TokenPayload => ({
  sub: user._id!.toString(),
  name: user.name,
  number: user.number,
  role: user.role,
});

router.post('/signup', async (req, res) => {
  const { name, number, password } = req.body as {
    name?: string;
    number?: string;
    password?: string;
  };

  if (!name || !number || !password) {
    res.status(400).json({ message: 'name, number and password are required' });
    return;
  }

  const cleanName = name.trim();
  const cleanNumber = normalizeNumber(number);

  if (!cleanName) {
    res.status(400).json({ message: 'Name is required' });
    return;
  }

  if (cleanNumber.length < 11) {
    res.status(400).json({ message: 'Valid number is required' });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ message: 'Password must be at least 6 characters' });
    return;
  }

  try {
    const collection = await usersCollection();
    const existing = await collection.findOne({ number: cleanNumber });

    if (existing) {
      res.status(409).json({ message: 'Number already registered' });
      return;
    }

    const now = new Date();
    const role: UserRole = ADMIN_NUMBERS.has(cleanNumber) ? 'admin' : 'user';
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const newUser: OptionalId<UserDoc> = {
      name: cleanName,
      number: cleanNumber,
      passwordHash,
      role,
      createdAt: now,
      updatedAt: now,
    };
    const insertResult = await collection.insertOne(newUser);

    const created = await collection.findOne({ _id: insertResult.insertedId });
    if (!created) {
      res.status(500).json({ message: 'Failed to create user' });
      return;
    }

    const payload = toPayload(created);
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    res.cookie('refreshToken', refreshToken, refreshCookieOptions);

    res.status(201).json({ accessToken, user: payload });
  } catch {
    res.status(500).json({ message: 'Signup failed' });
  }
});

router.post('/login', async (req, res) => {
  const { number, password } = req.body as {
    number?: string;
    password?: string;
  };

  if (!number || !password) {
    res.status(400).json({ message: 'number and password are required' });
    return;
  }

  const cleanNumber = normalizeNumber(number);

  try {
    const collection = await usersCollection();
    const user = await collection.findOne({ number: cleanNumber });

    if (!user) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const payload = toPayload(user);
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    res.cookie('refreshToken', refreshToken, refreshCookieOptions);

    res.json({ accessToken, user: payload });
  } catch {
    res.status(500).json({ message: 'Login failed' });
  }
});

router.post('/refresh', (req, res) => {
  const refreshToken = req.cookies?.refreshToken as string | undefined;

  if (!refreshToken) {
    res.status(401).json({ message: 'Refresh token is required' });
    return;
  }

  try {
    const payload = verifyRefreshToken(refreshToken);
    const accessToken = signAccessToken(payload);
    res.json({ accessToken });
  } catch {
    res.status(401).json({ message: 'Invalid or expired refresh token' });
  }
});

router.post('/logout', (_req, res) => {
  res.clearCookie('refreshToken', clearRefreshCookieOptions);
  res.json({ message: 'Logged out' });
});

router.get('/me', authMiddleware, (req: AuthRequest, res) => {
  res.json({ user: req.user });
});

export default router;
