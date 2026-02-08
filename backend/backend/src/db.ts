import mysql from 'mysql2/promise';
import { config } from './config.js';

let authPool: mysql.Pool | null = null;
let processConn: mysql.Connection | null = null;

export function getAuthPool(): mysql.Pool {
  if (!authPool) {
    authPool = mysql.createPool({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }
  return authPool;
}

export async function authQuery<T = unknown>(
  sql: string,
  params?: any[]
): Promise<T> {
  const pool = getAuthPool();
  const [results] = await pool.execute(sql, params);
  return results as T;
}

export async function getProcessConnection(): Promise<mysql.Connection> {
  if (!processConn) {
    processConn = await mysql.createConnection({
      host: config.processDb.host,
      port: config.processDb.port,
      user: config.processDb.user,
      password: config.processDb.password,
      database: config.processDb.database,
      connectTimeout: 10000,
    });
  }
  return processConn;
}

