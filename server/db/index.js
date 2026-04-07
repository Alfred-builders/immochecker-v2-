import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_PUBLIC_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: { rejectUnauthorized: false },
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err);
});

export async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (duration > 500) console.warn(`[DB] Slow query (${duration}ms):`, text.slice(0, 80));
  return res;
}

export async function queryOne(text, params) {
  const res = await query(text, params);
  return res.rows[0] || null;
}

export async function queryAll(text, params) {
  const res = await query(text, params);
  return res.rows;
}

export async function getClient() {
  return pool.connect();
}

export async function testConnection() {
  try {
    const res = await queryOne('SELECT NOW() as now');
    console.log('[DB] Connected:', res.now);
    return true;
  } catch (err) {
    console.error('[DB] Connection failed:', err.message);
    return false;
  }
}

export default pool;
