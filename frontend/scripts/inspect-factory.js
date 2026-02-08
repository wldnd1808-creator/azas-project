const fs = require('fs');
const path = require('path');

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  });
}

const mysql = require('mysql2/promise');

(async () => {
  const dbName = process.env.DB_NAME || 'factory';
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: dbName,
    connectTimeout: 10000,
  });

  const [tableRows] = await conn.query('SHOW TABLES');
  const key = tableRows.length ? Object.keys(tableRows[0])[0] : null;
  const tables = key ? tableRows.map((r) => r[key]).filter(Boolean) : [];

  console.log('Database:', dbName);
  console.log('Tables:', tables.length, tables);

  for (const table of tables) {
    const [cols] = await conn.query(
      `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY 
       FROM information_schema.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? 
       ORDER BY ORDINAL_POSITION`,
      [dbName, table]
    );
    console.log('\n---', table, '---');
    cols.forEach((c) => console.log('  ', c.COLUMN_NAME, c.COLUMN_TYPE, c.COLUMN_KEY || ''));
  }

  await conn.end();
})().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
