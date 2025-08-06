import winston from 'winston';

// Create winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.colorize(),
    winston.format.simple()
  ),
  defaultMeta: { service: 'ai-interview-backend' },
  transports: [
    // Write all logs with importance level of 'error' or less to 'error.log'
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    // Write all logs with importance level of 'info' or less to 'combined.log'
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// If we're not in production, also log to the console
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

export { logger };
