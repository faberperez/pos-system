import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'pos_db',
  password: 'faber1023',
  port: 5432,
});

export default pool;