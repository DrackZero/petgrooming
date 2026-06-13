import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Usa DATABASE_URL si existe (Render/Neon/Supabase), si no las variables sueltas.
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false,
    })
  : new Pool({
      host: process.env.PGHOST,
      port: process.env.PGPORT,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE,
    });

pool.on('connect', () => console.log('🟢 PostgreSQL conectado'));
pool.on('error', (err) => console.error('🔴 Error en el pool de PG:', err));

// Helper para consultas: query(text, params)
export const query = (text, params) => pool.query(text, params);

export default pool;
