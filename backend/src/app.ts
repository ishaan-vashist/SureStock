import express, { Application } from 'express';
import { corsMiddleware } from './middleware/cors';
import { errorHandler } from './middleware/errors';
import routes from './routes';

const app: Application = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(corsMiddleware);

// Routes
app.use(routes);

// Error handler (must be last)
app.use(errorHandler);

export default app;
