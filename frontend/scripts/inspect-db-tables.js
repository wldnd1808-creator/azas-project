// Inspect MariaDB schemas/tables via mysql2
// Usage: node scripts/inspect-db-tables.js
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config({ path: '.env.local' });

const host = process.env.DB_HOST || 'localhost';
const port = Number(process.env.DB_PORT || 3306);
const user = process.env.DB_USER || 'root';
const password = process.env.DB_PASSWORD || '';

async function main() {
  const conn = await mysql.createConnection({ host, port, user, password });
  const [rows] = await conn.query(
    "SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema NOT IN ('mysql','information_schema','performance_schema','sys') ORDER BY table_schema, table_name"
  );
  console.log(rows);
  await conn.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

