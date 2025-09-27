import { createLogger, format, transports } from 'winston';
import 'winston-daily-rotate-file'; // Required for the daily rotate transport

// --- File Transport Configuration ---
const fileRotateTransport = new transports.DailyRotateFile({
  filename: 'logs/%DATE%.log', // File name format: logs/YYYY-MM-DD.log
  datePattern: 'YYYY-MM-DD',
  maxFiles: '2d', // Keep logs for a maximum of 1 day (your requirement)
  maxSize: '20m', // Maximum size of each log file (e.g., 20 megabytes)
  level: 'info', // Minimum level to log to the file (info, warn, error)
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }), // Include full stack trace for errors
    format.json() // Use JSON format for easy parsing and analysis
  ),
});

// --- Logger Instance Creation ---
const logger = createLogger({
  // Default level for all transports unless overridden
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',

  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), 
    format.errors({ stack: true }), // Apply globally for all transports
    format.splat(), // Required for string interpolation with %s, %d, etc.
  ),

  transports: [
    // 1. Console Transport (for real-time viewing)
    new transports.Console({
      format: format.combine(
        format.colorize(), // Add colors for better visibility in the console
        format.printf(info => `${info.timestamp} [${info.level}]: ${info.message}`)
      ),
    }),
    
    // 2. Daily Rotating File Transport (for persistent history)
    fileRotateTransport,
  ],
});

export default logger;