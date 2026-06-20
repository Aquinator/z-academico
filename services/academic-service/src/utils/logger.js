const { createLogger, format, transports } = require('winston');

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.sssZ' }),
    format.errors({ stack: true }),
    format.json()
  ),
  defaultMeta: { service: 'academic-service' },
  transports: [
    new transports.Console({
      format:
        process.env.NODE_ENV === 'development'
          ? format.combine(format.colorize(), format.simple())
          : format.json(),
    }),
  ],
});

module.exports = logger;