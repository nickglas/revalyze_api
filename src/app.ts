// src/app.ts
import express from 'express';
import dotenv from 'dotenv';
import morgan from 'morgan';
import 'reflect-metadata';

//load env
dotenv.config();

//routes
import authRoutes from './routes/auth.routes';
import companyRoutes from './routes/company.routes';

//middlware
import { errorHandler } from './middlewares/error.middleware';

const app = express();

// Middleware
app.use(express.json());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Health check
app.get('/', (_req, res) => {
  res.json({
    message: 'Revalyze API is live!',
    commit: process.env.RUN_ID || 'unknown',
    buildNumber: process.env.RUN_NUMBER || 'unknown',
    attempt: process.env.RUN_ATTEMPT || 'unknown',
  });
});

// Add your routes here
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/companies', companyRoutes);

app.use(errorHandler);

export default app;
