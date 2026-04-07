import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { MongoServerError, ObjectId } from 'mongodb';
import { connectDB, getDB } from './config/db';
import authRoutes from './routes/auth.routes';
import { AuthRequest, authMiddleware } from './middlewares/auth.middleware';
import { requireRole } from './middlewares/requireRole.middleware';
import { EMPLOYEE_SECTIONS, EMPLOYEE_SECTION_MAP, EmployeeHall, EmployeeSectionId } from './constants/employeeSections';

dotenv.config();

const app = express();

const envOrigins = (process.env.CLIENT_URL ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = Array.from(
  new Set(['http://localhost:5173', 'https://alifrestaurant.netlify.app', 'https://alifrestaurantbd.com', ...envOrigins])
);

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

type EmployeeDoc = {
  _id?: ObjectId;
  serial?: number;
  name: string;
  number?: string;
  hall: EmployeeHall;
  sectionId: EmployeeSectionId;
  sectionLabel: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

const normalizeNumber = (value: string): string => value.replace(/\D/g, '');
let employeeIndexesEnsured = false;

const employeesCollection = async () => {
  const collection = getDB().collection<EmployeeDoc>('employees');
  if (!employeeIndexesEnsured) {
    await collection.createIndex({ serial: 1 }, { unique: true, sparse: true });
    await collection.createIndex({ hall: 1, sectionId: 1, serial: 1 });
    employeeIndexesEnsured = true;
  }
  return collection;
};

const parseEmployeePayload = (payload: {
  serial?: number | string;
  name?: string;
  number?: string;
  sectionId?: string;
}) => {
  const { serial, name, number, sectionId } = payload;

  if (!name || !sectionId) {
    return { error: 'name and sectionId are required' as const };
  }

  const cleanName = name.trim();
  if (!cleanName) {
    return { error: 'Name is required' as const };
  }

  const section = EMPLOYEE_SECTION_MAP[sectionId as EmployeeSectionId];
  if (!section) {
    return { error: 'Invalid sectionId' as const };
  }

  let parsedSerial: number | undefined;
  if (serial !== undefined && serial !== null && String(serial).trim() !== '') {
    parsedSerial = Number(serial);
    if (!Number.isInteger(parsedSerial) || parsedSerial <= 0) {
      return { error: 'serial must be a positive integer' as const };
    }
  }

  let cleanNumber: string | undefined;
  if (typeof number === 'string' && number.trim()) {
    cleanNumber = normalizeNumber(number);
    if (cleanNumber.length < 11) {
      return { error: 'Valid number is required when provided' as const };
    }
  }

  return {
    value: {
      serial: parsedSerial,
      name: cleanName,
      number: cleanNumber,
      hall: section.hall,
      sectionId: section.id,
      sectionLabel: section.label,
    },
  };
};

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

app.get('/api/admin/employee-sections', authMiddleware, requireRole('admin'), (_req, res) => {
  res.json({ sections: EMPLOYEE_SECTIONS });
});

app.get('/api/employees', async (_req, res) => {
  try {
    const collection = await employeesCollection();
    const employees = await collection
      .find(
        {},
        {
          projection: {
            createdBy: 0,
          },
        }
      )
      .sort({ serial: 1, name: 1 })
      .toArray();

    res.json({ employees });
  } catch {
    res.status(500).json({ message: 'Failed to fetch employees' });
  }
});

app.get('/api/admin/employees', authMiddleware, requireRole('admin'), async (_req, res) => {
  try {
    const collection = await employeesCollection();
    const employees = await collection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    res.json({ employees });
  } catch {
    res.status(500).json({ message: 'Failed to fetch employees' });
  }
});

app.post('/api/admin/employees', authMiddleware, requireRole('admin'), async (req: AuthRequest, res) => {
  const parsed = parseEmployeePayload(req.body as {
    serial?: number | string;
    name?: string;
    number?: string;
    sectionId?: string;
  });

  if ('error' in parsed) {
    res.status(400).json({ message: parsed.error });
    return;
  }

  try {
    const now = new Date();
    const employee: EmployeeDoc = {
      ...parsed.value,
      createdBy: req.user?.sub ?? 'unknown',
      createdAt: now,
      updatedAt: now,
    };

    const collection = await employeesCollection();
    const result = await collection.insertOne(employee);
    const created = await collection.findOne({ _id: result.insertedId });

    if (!created) {
      res.status(500).json({ message: 'Failed to create employee' });
      return;
    }

    res.status(201).json({ employee: created });
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      res.status(409).json({ message: 'Serial already exists' });
      return;
    }
    res.status(500).json({ message: 'Failed to create employee' });
  }
});

app.put('/api/admin/employees/:id', authMiddleware, requireRole('admin'), async (req: AuthRequest, res) => {
  const rawId = req.params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!id || !ObjectId.isValid(id)) {
    res.status(400).json({ message: 'Invalid employee id' });
    return;
  }

  const parsed = parseEmployeePayload(req.body as {
    serial?: number | string;
    name?: string;
    number?: string;
    sectionId?: string;
  });

  if ('error' in parsed) {
    res.status(400).json({ message: parsed.error });
    return;
  }

  try {
    const collection = await employeesCollection();
    const employeeId = new ObjectId(id);
    const result = await collection.findOneAndUpdate(
      { _id: employeeId },
      {
        $set: {
          ...parsed.value,
          updatedAt: new Date(),
        },
      },
      { returnDocument: 'after' }
    );

    if (!result) {
      res.status(404).json({ message: 'Employee not found' });
      return;
    }

    res.json({ employee: result });
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      res.status(409).json({ message: 'Serial already exists' });
      return;
    }
    res.status(500).json({ message: 'Failed to update employee' });
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

