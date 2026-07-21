import * as SQLite from 'expo-sqlite';

export async function initDatabase() {
  const db = await SQLite.openDatabaseAsync('mpesa.db');

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sms_id TEXT UNIQUE,
      original_body TEXT,
      parsed_name TEXT,
      parsed_number TEXT,
      transaction_type TEXT,
      amount REAL,
      date INTEGER,
      source TEXT
    );
  `);
  
  return db;
}
