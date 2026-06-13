import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.routes.js';
import petsRoutes from './routes/pets.routes.js';
import appointmentsRoutes from './routes/appointments.routes.js';
import coursesRoutes from './routes/courses.routes.js';
import ordersRoutes from './routes/orders.routes.js';
import adminRoutes from './routes/admin.routes.js';
import { notFound, errorHandler } from './middlewares/error.middleware.js';

dotenv.config();

const app = express();

// Necesario en Render/Vercel (detrás de proxy) para que las cookies
// "Secure" y sameSite=none funcionen correctamente en producción.
app.set('trust proxy', 1);

// ─── Middlewares globales ───────────────────────────────────
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true, // necesario para enviar/recibir cookies httpOnly
  })
);
app.use(express.json());
app.use(cookieParser());

// ─── Healthcheck ────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'petgrooming-api' }));

// ─── Rutas ──────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/pets', petsRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/admin', adminRoutes);

// ─── Manejo de errores ──────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 API PetGrooming en http://localhost:${PORT}`));
