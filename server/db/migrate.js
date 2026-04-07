import 'dotenv/config';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { query, testConnection } from './index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function migrate() {
  console.log('[Migrate] Starting migration...');
  const connected = await testConnection();
  if (!connected) {
    console.error('[Migrate] Cannot connect to database. Aborting.');
    process.exit(1);
  }

  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
  try {
    await query(schema);
    console.log('[Migrate] Schema applied successfully.');
  } catch (err) {
    console.error('[Migrate] Error applying schema:', err.message);
    process.exit(1);
  }

  process.exit(0);
}

migrate();
