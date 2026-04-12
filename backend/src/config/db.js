import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: "postgresql://pos_database_yp36_user:4kU72OJ2lKvwiUuhJkEUibJLUgPURmCW@dpg-d7bf2np17lss73ai16qg-a.ohio-postgres.render.com/pos_database_yp36",
  ssl: {
    rejectUnauthorized: false,
  },
});

export default pool;