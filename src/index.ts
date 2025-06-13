import mongoose from 'mongoose';
import app from './app';
import dotenv from 'dotenv';
import { seedUsers } from './db/db.seed.users';

dotenv.config();

const PORT = process.env.PORT || 4500;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI is not defined in .env');
}

mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');

    //seeding
    await seedUsers();

    //starting server
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
