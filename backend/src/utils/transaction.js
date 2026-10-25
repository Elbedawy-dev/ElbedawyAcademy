import mongoose from 'mongoose';
import logger from './logger.js';

let transactionsSupported = null;

function isTransactionUnsupported(err) {
  const msg = String(err?.message || '');
  return (
    err?.code === 20 ||
    err?.codeName === 'IllegalOperation' ||
    msg.includes('Transaction numbers are only allowed') ||
    msg.includes('replica set')
  );
}

/**
 * Runs `fn(session)` inside a MongoDB transaction. On standalone servers (no replica set)
 * it logs a warning once and runs `fn(null)` without a transaction so local development still works.
 */
export async function runInTransaction(fn) {
  if (transactionsSupported === false) return fn(null);

  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    transactionsSupported = true;
    return result;
  } catch (err) {
    if (transactionsSupported !== true && isTransactionUnsupported(err)) {
      transactionsSupported = false;
      logger.warn('MongoDB transactions are not supported (standalone server). Running without.');
      return fn(null);
    }
    throw err;
  } finally {
    await session.endSession();
  }
}

export default runInTransaction;
