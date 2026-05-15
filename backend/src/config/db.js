import pkg from 'pg';
const { Pool } = pkg;
import dotenv from "dotenv";

// ✅ 1. Cargar las variables de entorno
dotenv.config();

// ✅ 2. Limpiar la URL de espacios o comillas accidentales
const connectionString = process.env.DATABASE_URL ? process.env.DATABASE_URL.trim() : null;

const pool = new Pool({
  connectionString: connectionString,
  ssl: {
    // ✅ 3. Obligatorio para conectar con Supabase desde Render
    rejectUnauthorized: false, 
  },
});

// ✅ 4. Prueba de conexión automática al arrancar el servidor
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ ERROR CRÍTICO: No se pudo conectar a Supabase:', err.message);
  } else {
    console.log('✅ CONEXIÓN EXITOSA: El backend ya está hablando con Supabase');
  }
});

export default pool;