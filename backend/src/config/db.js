import dotenv from 'dotenv';
dotenv.config();

import pkg from 'pg';
const { Pool } = pkg;

// ⚡ FALLBACK: Si DATABASE_URL no carga, usar valores directos
const connectionString = process.env.DATABASE_URL || 
  'postgresql://postgres:TU_NUEVA_PASSWORD@db.acmskphgmvyxmqjiyszv.supabase.co:5432/postgres';

console.log('🔍 URL usada:', connectionString.replace(/:.*@/, ':****@'));

const pool = new Pool({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.query('SELECT NOW()')
  .then(res => console.log('✅ Conectado a Supabase:', res.rows[0].now))
  .catch(err => {
    console.error('❌ Error:', err.message);
    console.error('Código:', err.code);
  });

export default pool;