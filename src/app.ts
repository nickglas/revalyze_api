// src/app.ts
import express from 'express';
import dotenv from 'dotenv';
import morgan from 'morgan';

// routes
import authRoutes from './routes/auth.routes';
import { errorHandler } from './middlewares/error.middleware';

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(errorHandler);

if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Health check
app.get('/', (_req, res) => {
  res.send('Revalyze API is live!');
});

// Add your routes here
app.use('/api/v1/auth', authRoutes);

export default app;
