import fs from 'node:fs';
import path from 'node:path';
import winston from 'winston';
import env from '../config/env.js';

const logDir = path.resolve(process.cwd(), 'logs');
if (!env.isTest && !fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, stack }) =>
    stack ? `${timestamp} ${level}: ${message}\n${stack}` : `${timestamp} ${level}: ${message}`,
  ),
);

const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

const transports = [new winston.transports.Console({ format: consoleFormat })];

if (!env.isTest) {
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      format: fileFormat,
      maxsize: 20 * 1024 * 1024,
      maxFiles: 5,
    }),
  );
}

const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  silent: env.isTest,
  transports,
  exitOnError: false,
});

// Stream used by morgan for HTTP access logs
logger.stream = {
  write: (message) => logger.http(message.trim()),
};

export default logger;
