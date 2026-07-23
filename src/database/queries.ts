import * as SQLite from 'expo-sqlite';

export type MpesaDbMessage = {
  id: number;
  sms_id: string;
  original_body: string;
  parsed_name: string;
  parsed_number: string;
  transaction_type: 'Sent' | 'Received' | 'Other';
  amount: number;
  date: number;
  source: string;
};

export async function insertMessages(db: SQLite.SQLiteDatabase, messages: Omit<MpesaDbMessage, 'id'>[]) {
  // Use a transaction for bulk insert
  await db.withTransactionAsync(async () => {
    const statement = await db.prepareAsync(
      `INSERT OR IGNORE INTO messages (sms_id, original_body, parsed_name, parsed_number, transaction_type, amount, date, source) 
       VALUES ($sms_id, $original_body, $parsed_name, $parsed_number, $transaction_type, $amount, $date, $source)`
    );
    try {
      for (const msg of messages) {
        await statement.executeAsync({
          $sms_id: msg.sms_id,
          $original_body: msg.original_body,
          $parsed_name: msg.parsed_name,
          $parsed_number: msg.parsed_number,
          $transaction_type: msg.transaction_type,
          $amount: msg.amount,
          $date: msg.date,
          $source: msg.source,
        });
      }
    } finally {
      await statement.finalizeAsync();
    }
  });
}

export async function getStats(db: SQLite.SQLiteDatabase) {
  const total = await db.getFirstAsync<{count: number}>('SELECT COUNT(*) as count FROM messages');
  const sent = await db.getFirstAsync<{count: number}>('SELECT COUNT(*) as count FROM messages WHERE transaction_type = "Sent"');
  const received = await db.getFirstAsync<{count: number}>('SELECT COUNT(*) as count FROM messages WHERE transaction_type = "Received"');
  
  return {
    total: total?.count || 0,
    sent: sent?.count || 0,
    received: received?.count || 0,
  };
}

export async function getAdvancedStats(db: SQLite.SQLiteDatabase, fromDate?: number, toDate?: number) {
  let whereClause = '';
  let params: Record<string, any> = {};
  if (fromDate && toDate) {
    whereClause = 'WHERE date >= $fromDate AND date <= $toDate';
    params = { $fromDate: fromDate, $toDate: toDate };
  } else if (fromDate) {
    whereClause = 'WHERE date >= $fromDate';
    params = { $fromDate: fromDate };
  } else if (toDate) {
    whereClause = 'WHERE date <= $toDate';
    params = { $toDate: toDate };
  }

  const queryBase = `FROM messages ${whereClause}`;

  const totalCount = await db.getFirstAsync<{count: number}>(`SELECT COUNT(*) as count ${queryBase}`, params);
  const totalAmount = await db.getFirstAsync<{total: number}>(`SELECT SUM(amount) as total ${queryBase}`, params);

  const sentCount = await db.getFirstAsync<{count: number}>(`SELECT COUNT(*) as count ${queryBase} ${whereClause ? 'AND' : 'WHERE'} transaction_type = "Sent"`, params);
  const sentAmount = await db.getFirstAsync<{total: number}>(`SELECT SUM(amount) as total ${queryBase} ${whereClause ? 'AND' : 'WHERE'} transaction_type = "Sent"`, params);

  const receivedCount = await db.getFirstAsync<{count: number}>(`SELECT COUNT(*) as count ${queryBase} ${whereClause ? 'AND' : 'WHERE'} transaction_type = "Received"`, params);
  const receivedAmount = await db.getFirstAsync<{total: number}>(`SELECT SUM(amount) as total ${queryBase} ${whereClause ? 'AND' : 'WHERE'} transaction_type = "Received"`, params);

  return {
    total: totalCount?.count || 0,
    totalAmount: totalAmount?.total || 0,
    sent: sentCount?.count || 0,
    sentAmount: sentAmount?.total || 0,
    received: receivedCount?.count || 0,
    receivedAmount: receivedAmount?.total || 0,
  };
}

export async function getMessages(db: SQLite.SQLiteDatabase, limit: number, offset: number) {
  const messages = await db.getAllAsync<MpesaDbMessage>(
    'SELECT * FROM messages ORDER BY date DESC LIMIT $limit OFFSET $offset',
    { $limit: limit, $offset: offset }
  );
  return messages;
}

export async function getAllMessages(db: SQLite.SQLiteDatabase) {
  return await db.getAllAsync<MpesaDbMessage>('SELECT * FROM messages ORDER BY date DESC');
}
