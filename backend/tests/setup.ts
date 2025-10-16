import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.test or .env
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Set NODE_ENV to test
process.env.NODE_ENV = 'test';

// Ensure MONGODB_URI is set for tests
if (!process.env.MONGODB_URI) {
  console.warn('MONGODB_URI not found in environment, using default test database');
  process.env.MONGODB_URI = 'mongodb://localhost:27017/SureStock-Test';
}
