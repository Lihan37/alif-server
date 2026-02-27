import { Db, MongoClient } from 'mongodb';

let client: MongoClient | null = null;
let db: Db | null = null;

export const connectDB = async (): Promise<Db> => {
  if (db) {
    return db;
  }

  const uri = process.env.MONGO_URI;
  const dbName = process.env.DB_NAME;

  if (!uri) {
    throw new Error('MONGO_URI is missing in environment variables');
  }

  if (!dbName) {
    throw new Error('DB_NAME is missing in environment variables');
  }

  client = new MongoClient(uri);
  await client.connect();

  db = client.db(dbName);
  console.log(`MongoDB connected: ${db.databaseName}`);
  return db;
};

export const getDB = (): Db => {
  if (!db) {
    throw new Error('Database is not connected. Call connectDB() first.');
  }

  return db;
};
