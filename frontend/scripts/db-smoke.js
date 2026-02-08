const mysql = require('mysql2/promise');

(async () => {
  try {
    const host = process.env.DB_HOST || '192.168.0.53';
    const port = Number(process.env.DB_PORT || 3306);
    const user = process.env.DB_USER || 'root';
    const password = process.env.DB_PASSWORD || '1234';
    const requestedDb = process.env.DB_NAME || 'manufacturing_db';

    const conn = await mysql.createConnection({
      host,
      port,
      user,
      password,
      connectTimeout: 5000,
    });

    const [dbRows] = await conn.query('SHOW DATABASES');
    const databases = (dbRows || [])
      .map((r) => r.Database)
      .filter(Boolean)
      .filter((d) => !['information_schema', 'mysql', 'performance_schema', 'sys'].includes(String(d)));

    console.log('DB HOST OK:', { host, port, user });
    console.log('Databases:', databases);
    console.log('Requested DB_NAME:', requestedDb, 'exists:', databases.includes(requestedDb));

    // If the requested DB exists, do a quick query
    if (databases.includes(requestedDb)) {
      const dbConn = await mysql.createConnection({
        host,
        port,
        user,
        password,
        database: requestedDb,
        connectTimeout: 5000,
      });
      const [rows] = await dbConn.query('SELECT 1 as ok');
      console.log('SELECT 1 OK:', rows);
      await dbConn.end();
    }

    await conn.end();
  } catch (e) {
    console.error('DB FAIL:', e && e.message ? e.message : e);
    process.exit(1);
  }
})();
