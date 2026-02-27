import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { connectDB, getDB } from './config/db';
import authRoutes from './routes/auth.routes';
import { AuthRequest, authMiddleware } from './middlewares/auth.middleware';
import { requireRole } from './middlewares/requireRole.middleware';

dotenv.config();

const app = express();

const allowedOrigins = ['http://localhost:5173', 'https://alifrestaurant.netlify.app'];

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.get('/', (_req, res) => {
  res.send('API Running');
});

app.get('/health/db', async (_req, res) => {
  try {
    const ping = await getDB().command({ ping: 1 });
    res.json({ ok: true, ping });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Database not connected', error });
  }
});

app.use('/api/auth', authRoutes);

app.get('/api/protected', authMiddleware, (req: AuthRequest, res) => {
  res.json({ message: 'Protected route access granted', user: req.user });
});

app.get('/api/admin-only', authMiddleware, requireRole('admin'), (req: AuthRequest, res) => {
  res.json({ message: 'Admin route access granted', user: req.user });
});

app.get('/api/admin/users', authMiddleware, requireRole('admin'), async (_req, res) => {
  try {
    const users = await getDB()
      .collection('users')
      .find(
        {},
        {
          projection: {
            passwordHash: 0,
          },
          sort: { createdAt: -1 },
        }
      )
      .toArray();

    res.json({ users });
  } catch {
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

const PORT = Number(process.env.PORT) || 5000;

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
